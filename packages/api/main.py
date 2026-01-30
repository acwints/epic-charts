import os
import json
import base64
import secrets
import logging
from datetime import datetime
from typing import Optional, List

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, Request, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func

from models.database import init_db, get_db, User, Chart, SavedChart, Like
from dependencies import (
    get_current_user,
    get_optional_user,
    create_access_token,
    IS_PRODUCTION,
)
from schemas import (
    UserResponse,
    ChartCreate,
    ChartUpdate,
    ChartResponse,
    ChartListResponse,
    SavedChartResponse,
    LikeResponse,
    TokenResponse,
)

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Environment configuration
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
ALLOWED_FRONTEND_DOMAINS = os.environ.get("ALLOWED_FRONTEND_DOMAINS", "").split(",")
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:8080/auth/callback")

# Initialize FastAPI app
app = FastAPI(
    title="Charts Agent API",
    description="Backend API for Charts Agent - AI-powered chart visualization",
    version="1.0.0",
)

# CORS configuration
allowed_origins = [FRONTEND_URL]
if ALLOWED_FRONTEND_DOMAINS:
    allowed_origins.extend([d.strip() for d in ALLOWED_FRONTEND_DOMAINS if d.strip()])

# Add common development origins
if not IS_PRODUCTION:
    allowed_origins.extend([
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)


# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    logger.info("Initializing database...")
    init_db()
    logger.info("Database initialized")


# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


# ============================================================================
# Authentication Endpoints
# ============================================================================

def _safe_frontend_target(target: Optional[str]) -> str:
    """Validate and return a safe frontend redirect URL"""
    if not target:
        return FRONTEND_URL

    # Check against allowed domains
    allowed = [FRONTEND_URL] + [d.strip() for d in ALLOWED_FRONTEND_DOMAINS if d.strip()]

    # Allow localhost in development
    if not IS_PRODUCTION:
        if target.startswith("http://localhost:") or target.startswith("http://127.0.0.1:"):
            return target

    for domain in allowed:
        if target.startswith(domain):
            return target

    logger.warning(f"Blocked redirect to untrusted domain: {target}")
    return FRONTEND_URL


@app.get("/auth/google")
async def google_auth(target: Optional[str] = None):
    """Initiate Google OAuth flow"""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")

    # Generate state with nonce and optional frontend target
    nonce = secrets.token_urlsafe(32)
    state_data = {"nonce": nonce}
    if target:
        state_data["frontend"] = target

    state = base64.urlsafe_b64encode(json.dumps(state_data).encode()).decode()

    # Build authorization URL
    auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={GOOGLE_CLIENT_ID}&"
        f"redirect_uri={GOOGLE_REDIRECT_URI}&"
        "scope=openid%20email%20profile&"
        "response_type=code&"
        "access_type=offline&"
        f"state={state}"
    )

    return {"auth_url": auth_url}


@app.get("/auth/callback")
async def google_callback(
    code: str,
    state: str,
    db: Session = Depends(get_db),
):
    """Handle Google OAuth callback"""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")

    # Decode state
    try:
        state_data = json.loads(base64.urlsafe_b64decode(state).decode())
        frontend_target = _safe_frontend_target(state_data.get("frontend"))
    except Exception:
        frontend_target = FRONTEND_URL

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": GOOGLE_REDIRECT_URI,
            },
        )

        if token_response.status_code != 200:
            logger.error(f"Token exchange failed: {token_response.text}")
            raise HTTPException(status_code=400, detail="Failed to exchange code for token")

        tokens = token_response.json()
        access_token = tokens.get("access_token")

        # Get user info
        user_response = await client.get(
            f"https://www.googleapis.com/oauth2/v2/userinfo?access_token={access_token}"
        )

        if user_response.status_code != 200:
            logger.error(f"Failed to get user info: {user_response.text}")
            raise HTTPException(status_code=400, detail="Failed to get user info")

        user_info = user_response.json()

    # Find or create user
    google_id = user_info.get("id")
    email = user_info.get("email")
    name = user_info.get("name")
    picture = user_info.get("picture")

    user = db.query(User).filter(User.google_id == google_id).first()

    if user:
        # Update existing user
        user.email = email
        user.name = name
        user.picture = picture
        user.last_login = datetime.utcnow()
    else:
        # Create new user
        user = User(
            google_id=google_id,
            email=email,
            name=name,
            picture=picture,
        )
        db.add(user)

    db.commit()
    db.refresh(user)

    # Generate JWT token
    jwt_token = create_access_token(user.id)

    # Redirect to frontend with token
    redirect_url = f"{frontend_target}?auth_token={jwt_token}"

    return Response(
        status_code=302,
        headers={"Location": redirect_url},
    )


@app.post("/api/auth/set-cookie")
async def set_auth_cookie(
    response: Response,
    token: str = Query(..., description="JWT token to set as cookie"),
    db: Session = Depends(get_db),
):
    """Exchange a URL token for an httpOnly cookie"""
    from dependencies import decode_token

    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Verify user exists
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Set httpOnly cookie
    response.set_cookie(
        key="auth_token",
        value=token,
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="lax" if not IS_PRODUCTION else "none",
        max_age=7 * 24 * 60 * 60,  # 7 days
        path="/",
    )

    return {"status": "ok"}


@app.post("/api/auth/logout")
async def logout(response: Response):
    """Clear the authentication cookie"""
    response.delete_cookie(
        key="auth_token",
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="lax" if not IS_PRODUCTION else "none",
        path="/",
    )
    return {"status": "ok"}


# ============================================================================
# User Endpoints
# ============================================================================

@app.get("/api/user/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    """Get current authenticated user info"""
    return current_user


# ============================================================================
# Chart Endpoints
# ============================================================================

def _chart_to_response(
    chart: Chart,
    current_user: Optional[User] = None,
    db: Optional[Session] = None,
) -> ChartResponse:
    """Convert a Chart model to a ChartResponse with computed fields"""
    is_liked = False
    is_saved = False

    if current_user and db:
        is_liked = db.query(Like).filter(
            Like.user_id == current_user.id,
            Like.chart_id == chart.id,
        ).first() is not None

        is_saved = db.query(SavedChart).filter(
            SavedChart.user_id == current_user.id,
            SavedChart.chart_id == chart.id,
        ).first() is not None

    return ChartResponse(
        id=chart.id,
        user_id=chart.user_id,
        title=chart.title,
        description=chart.description,
        data=chart.data,
        config=chart.config,
        source_type=chart.source_type,
        source_url=chart.source_url,
        is_public=bool(chart.is_public),
        view_count=chart.view_count,
        like_count=chart.like_count,
        created_at=chart.created_at,
        updated_at=chart.updated_at,
        is_liked=is_liked,
        is_saved=is_saved,
        user=UserResponse.model_validate(chart.user) if chart.user else None,
    )


@app.post("/api/charts", response_model=ChartResponse)
async def create_chart(
    chart_data: ChartCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new chart"""
    chart = Chart(
        user_id=current_user.id,
        title=chart_data.title,
        description=chart_data.description,
        data=chart_data.data.model_dump(),
        config=chart_data.config.model_dump(),
        source_type=chart_data.source_type,
        source_url=chart_data.source_url,
        is_public=1 if chart_data.is_public else 0,
    )

    db.add(chart)
    db.commit()
    db.refresh(chart)

    return _chart_to_response(chart, current_user, db)


@app.get("/api/charts", response_model=ChartListResponse)
async def list_my_charts(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List current user's charts"""
    query = db.query(Chart).filter(Chart.user_id == current_user.id)
    total = query.count()

    charts = query.order_by(Chart.created_at.desc()).offset(offset).limit(limit).all()

    return ChartListResponse(
        charts=[_chart_to_response(c, current_user, db) for c in charts],
        total=total,
        limit=limit,
        offset=offset,
    )


@app.get("/api/charts/public", response_model=ChartListResponse)
async def list_public_charts(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """List public charts (discover page)"""
    query = db.query(Chart).filter(Chart.is_public == 1)
    total = query.count()

    charts = query.order_by(Chart.created_at.desc()).offset(offset).limit(limit).all()

    return ChartListResponse(
        charts=[_chart_to_response(c, current_user, db) for c in charts],
        total=total,
        limit=limit,
        offset=offset,
    )


@app.get("/api/charts/{chart_id}", response_model=ChartResponse)
async def get_chart(
    chart_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Get a single chart by ID"""
    chart = db.query(Chart).filter(Chart.id == chart_id).first()

    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    # Check access
    if not chart.is_public:
        if not current_user or chart.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    # Increment view count
    chart.view_count += 1
    db.commit()

    return _chart_to_response(chart, current_user, db)


@app.put("/api/charts/{chart_id}", response_model=ChartResponse)
async def update_chart(
    chart_id: str,
    chart_data: ChartUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a chart"""
    chart = db.query(Chart).filter(Chart.id == chart_id).first()

    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    if chart.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Update fields
    if chart_data.title is not None:
        chart.title = chart_data.title
    if chart_data.description is not None:
        chart.description = chart_data.description
    if chart_data.data is not None:
        chart.data = chart_data.data.model_dump()
    if chart_data.config is not None:
        chart.config = chart_data.config.model_dump()
    if chart_data.is_public is not None:
        chart.is_public = 1 if chart_data.is_public else 0

    db.commit()
    db.refresh(chart)

    return _chart_to_response(chart, current_user, db)


@app.delete("/api/charts/{chart_id}")
async def delete_chart(
    chart_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a chart"""
    chart = db.query(Chart).filter(Chart.id == chart_id).first()

    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    if chart.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    db.delete(chart)
    db.commit()

    return {"status": "ok"}


# ============================================================================
# Save/Bookmark Endpoints
# ============================================================================

@app.post("/api/charts/{chart_id}/save", response_model=SavedChartResponse)
async def save_chart(
    chart_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save/bookmark a chart"""
    chart = db.query(Chart).filter(Chart.id == chart_id).first()

    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    # Check if already saved
    existing = db.query(SavedChart).filter(
        SavedChart.user_id == current_user.id,
        SavedChart.chart_id == chart_id,
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Chart already saved")

    saved = SavedChart(user_id=current_user.id, chart_id=chart_id)
    db.add(saved)
    db.commit()
    db.refresh(saved)

    return SavedChartResponse(
        id=saved.id,
        chart_id=saved.chart_id,
        created_at=saved.created_at,
        chart=_chart_to_response(chart, current_user, db),
    )


@app.delete("/api/charts/{chart_id}/save")
async def unsave_chart(
    chart_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a saved chart"""
    saved = db.query(SavedChart).filter(
        SavedChart.user_id == current_user.id,
        SavedChart.chart_id == chart_id,
    ).first()

    if not saved:
        raise HTTPException(status_code=404, detail="Saved chart not found")

    db.delete(saved)
    db.commit()

    return {"status": "ok"}


@app.get("/api/saved", response_model=List[SavedChartResponse])
async def list_saved_charts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List user's saved charts"""
    saved_charts = (
        db.query(SavedChart)
        .filter(SavedChart.user_id == current_user.id)
        .order_by(SavedChart.created_at.desc())
        .all()
    )

    return [
        SavedChartResponse(
            id=s.id,
            chart_id=s.chart_id,
            created_at=s.created_at,
            chart=_chart_to_response(s.chart, current_user, db),
        )
        for s in saved_charts
    ]


# ============================================================================
# Like Endpoints
# ============================================================================

@app.post("/api/charts/{chart_id}/like", response_model=LikeResponse)
async def like_chart(
    chart_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Like a chart"""
    chart = db.query(Chart).filter(Chart.id == chart_id).first()

    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    # Check if already liked
    existing = db.query(Like).filter(
        Like.user_id == current_user.id,
        Like.chart_id == chart_id,
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Chart already liked")

    like = Like(user_id=current_user.id, chart_id=chart_id)
    db.add(like)

    # Update like count
    chart.like_count += 1

    db.commit()
    db.refresh(like)

    return LikeResponse(
        id=like.id,
        chart_id=like.chart_id,
        created_at=like.created_at,
    )


@app.delete("/api/charts/{chart_id}/like")
async def unlike_chart(
    chart_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Unlike a chart"""
    like = db.query(Like).filter(
        Like.user_id == current_user.id,
        Like.chart_id == chart_id,
    ).first()

    if not like:
        raise HTTPException(status_code=404, detail="Like not found")

    # Update like count
    chart = db.query(Chart).filter(Chart.id == chart_id).first()
    if chart and chart.like_count > 0:
        chart.like_count -= 1

    db.delete(like)
    db.commit()

    return {"status": "ok"}


@app.get("/api/liked", response_model=List[ChartResponse])
async def list_liked_charts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List user's liked charts"""
    likes = (
        db.query(Like)
        .filter(Like.user_id == current_user.id)
        .order_by(Like.created_at.desc())
        .all()
    )

    return [
        _chart_to_response(like.chart, current_user, db)
        for like in likes
        if like.chart
    ]


# ============================================================================
# Run server
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
