from pydantic import BaseModel
from typing import Any, Optional

class SaveRunRequest(BaseModel):
    business_name: Optional[str] = None
    mapping_json: dict
    forecast_json: dict
    insights_json: Optional[dict] = None

class RunResponse(BaseModel):
    id: int
    business_name: Optional[str] = None
    mapping_json: dict
    forecast_json: dict
    insights_json: Optional[dict] = None
    created_at: str
