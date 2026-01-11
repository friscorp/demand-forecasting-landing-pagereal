from pydantic import BaseModel

class ColumnMapping(BaseModel):
    date: str
    item: str
    quantity: str

class IngestResponse(BaseModel):
    ok: bool
    business_id: int
    upload_id: int | None
    file_hash: str
    rows_inserted: int
    message: str
