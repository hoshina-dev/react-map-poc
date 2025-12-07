from pydantic import BaseModel


class MetaResponse(BaseModel):
    path: str
    size: int
    featureCount: int | None = None
    bbox: list[float] | None = None


class AdminListResponse(BaseModel):
    countries: list[str]