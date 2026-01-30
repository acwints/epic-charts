from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field


# User schemas
class UserBase(BaseModel):
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None


class UserResponse(UserBase):
    id: str
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


# Chart schemas
class ChartDataSeries(BaseModel):
    name: str
    data: List[float]


class ChartData(BaseModel):
    labels: List[str]
    series: List[ChartDataSeries]
    suggestedType: Optional[str] = None
    suggestedTitle: Optional[str] = None
    aiReasoning: Optional[str] = None


class ChartConfig(BaseModel):
    type: str = "bar"
    colorScheme: str = "default"
    styleVariant: str = "professional"
    showGrid: bool = True
    showLegend: bool = True
    showValues: bool = False
    animate: bool = True
    title: Optional[str] = None


class ChartCreate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    data: ChartData
    config: ChartConfig
    source_type: Optional[str] = None
    source_url: Optional[str] = None
    is_public: bool = False


class ChartUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    data: Optional[ChartData] = None
    config: Optional[ChartConfig] = None
    is_public: Optional[bool] = None


class ChartResponse(BaseModel):
    id: str
    user_id: str
    title: Optional[str] = None
    description: Optional[str] = None
    data: Dict[str, Any]
    config: Dict[str, Any]
    source_type: Optional[str] = None
    source_url: Optional[str] = None
    is_public: bool
    view_count: int
    like_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Computed fields (populated by API)
    is_liked: bool = False
    is_saved: bool = False
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True


class ChartListResponse(BaseModel):
    charts: List[ChartResponse]
    total: int
    limit: int
    offset: int


# Saved charts
class SavedChartResponse(BaseModel):
    id: str
    chart_id: str
    created_at: datetime
    chart: ChartResponse

    class Config:
        from_attributes = True


# Like
class LikeResponse(BaseModel):
    id: str
    chart_id: str
    created_at: datetime

    class Config:
        from_attributes = True


# Auth
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
