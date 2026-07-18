from pydantic import BaseModel
from typing import Optional

class CommentEvent(BaseModel):
    type: str = "comment"
    user: str
    message: str
    is_follower: bool = False
    is_member: bool = False
    is_moderator: bool = False
    team_level: int = 0
    gifter_rank: int = 0

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
