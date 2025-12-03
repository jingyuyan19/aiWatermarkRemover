from enum import Enum

from pydantic import BaseModel


class Status(str, Enum):
    UPLOADING = "UPLOADING"
    PROCESSING = "PROCESSING"
    FINISHED = "FINISHED"
    ERROR = "ERROR"


class WMRemoveResults(BaseModel):
    percentage: int
    status: Status
    download_url: str | None = None
