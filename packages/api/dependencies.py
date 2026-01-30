import os
import logging
from datetime import datetime, timedelta
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from models.database import get_db, User

logger = logging.getLogger(__name__)

# JWT Configuration
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 7

IS_PRODUCTION = os.environ.get("ENVIRONMENT", "development") == "production"

# Validate JWT secret in production
if IS_PRODUCTION and len(JWT_SECRET_KEY) < 32:
    raise ValueError("JWT_SECRET_KEY must be at least 32 characters in production")

# Generate a development secret if not provided
if not JWT_SECRET_KEY:
    import secrets
    JWT_SECRET_KEY = secrets.token_urlsafe(32)
    logger.warning("Using auto-generated JWT secret. Set JWT_SECRET_KEY in production.")

security = HTTPBearer(auto_error=False)


def create_access_token(user_id: str) -> str:
    """Create a JWT access token for a user"""
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(days=JWT_EXPIRATION_DAYS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {e}")
        return None


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    auth_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
) -> User:
    """
    Get the current authenticated user.

    Checks for authentication in this order:
    1. httpOnly cookie (most secure, preferred)
    2. Authorization header (for API clients)
    """
    token = None

    # Priority 1: httpOnly cookie
    if auth_token:
        token = auth_token
    # Priority 2: Authorization header
    elif credentials:
        token = credentials.credentials

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


async def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    auth_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Get the current user if authenticated, otherwise return None.
    Useful for endpoints that work for both authenticated and anonymous users.
    """
    try:
        return await get_current_user(request, credentials, auth_token, db)
    except HTTPException:
        return None
