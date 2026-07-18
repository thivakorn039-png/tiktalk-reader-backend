from pydantic import BaseModel
from typing import Optional

class CommentEvent(BaseModel):
    type: str = "comment"
    user: str
    message: str

class GiftEvent(BaseModel):
    type: str = "gift"
    user: str
    gift: str
    count: int

class FollowEvent(BaseModel):
    type: str = "follow"
    user: str

class ShareEvent(BaseModel):
    type: str = "share"
    user: str
