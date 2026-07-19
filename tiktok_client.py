import asyncio
import traceback
import TikTokLive.proto.custom_proto as custom_proto
from fastapi import WebSocket
from TikTokLive import TikTokLiveClient
from TikTokLive.events import (
    CommentEvent,
    ConnectEvent,
    DisconnectEvent,
    FollowEvent,
    GiftEvent,
    ShareEvent,
)
from models import CommentEvent as ModelComment
from models import FollowEvent as ModelFollow
from models import GiftEvent as ModelGift
from models import ShareEvent as ModelShare
# Monkey-patch User.__init__ to ignore unknown kwargs (fixes nickName parsing error in TikTokLive v6.6.5)
original_user_init = custom_proto.User.__init__
def patched_user_init(self, **kwargs):
    valid_keys = self.__dataclass_fields__.keys()
    filtered = {k: v for k, v in kwargs.items() if k in valid_keys}
    original_user_init(self, **filtered)
custom_proto.User.__init__ = patched_user_init

async def start_tiktok_client(username: str, websocket: WebSocket):
    try:
        # ทำความสะอาดชื่อช่อง ตัดช่องว่าง และตัด @ ออกถ้ามีคนเผลอใส่มา
        clean_username = username.strip().lstrip("@")
        client = TikTokLiveClient(unique_id=clean_username)

        @client.on(ConnectEvent)
        async def on_connect(event: ConnectEvent):
            try:
                avatar_url = None
                try:
                    if hasattr(client, "room_info") and client.room_info:
                        owner = client.room_info.get("owner", {})
                        url_list = (
                            owner.get("avatar_thumb", {}).get("url_list", [])
                        )
                        if url_list:
                            avatar_url = url_list[0]
                except Exception:
                    pass
                await websocket.send_json(
                    {
                        "type": "status",
                        "status": "connected",
                        "avatarUrl": avatar_url,
                    }
                )
            except Exception:
                pass

        @client.on(DisconnectEvent)
        async def on_disconnect(event: DisconnectEvent):
            try:
                await websocket.send_json(
                    {"type": "status", "status": "disconnected"}
                )
            except Exception:
                pass

        @client.on(CommentEvent)
        async def on_comment(event: CommentEvent):
            try:
                msg = getattr(event, "comment", getattr(event, "text", ""))
                user_obj = getattr(
                    event, "user", getattr(event, "user_info", None)
                )
                nickname = getattr(
                    user_obj,
                    "nick_name",
                    getattr(user_obj, "nickname", "Unknown"),
                )
                if nickname == "Unknown":
                    nickname = getattr(user_obj, "unique_id", "Unknown")

                model = ModelComment(user=nickname, message=msg)
                await websocket.send_json(model.model_dump())
            except Exception as e:
                import traceback

                await websocket.send_json(
                    {
                        "type": "status",
                        "status": "error",
                        "message": f"Comment parsing error: {str(e)}",
                    }
                )

        @client.on(GiftEvent)
        async def on_gift(event: GiftEvent):
            try:
                user_obj = getattr(
                    event, "user", getattr(event, "user_info", None)
                )
                nickname = getattr(
                    user_obj,
                    "nick_name",
                    getattr(user_obj, "nickname", "Unknown"),
                )
                if nickname == "Unknown":
                    nickname = getattr(user_obj, "unique_id", "Unknown")

                gift_name = getattr(event.gift, "name", "Gift")
                gift_count = getattr(
                    event.gift, "count", getattr(event.gift, "repeat_count", 1)
                )

                model = ModelGift(
                    user=nickname, gift=gift_name, count=gift_count
                )
                await websocket.send_json(model.model_dump())
            except Exception as e:
                await websocket.send_json(
                    {
                        "type": "status",
                        "status": "error",
                        "message": f"Gift parsing error: {str(e)}",
                    }
                )

        @client.on(FollowEvent)
        async def on_follow(event: FollowEvent):
            try:
                user_obj = getattr(
                    event, "user", getattr(event, "user_info", None)
                )
                nickname = getattr(
                    user_obj,
                    "nick_name",
                    getattr(user_obj, "nickname", "Unknown"),
                )
                if nickname == "Unknown":
                    nickname = getattr(user_obj, "unique_id", "Unknown")

                model = ModelFollow(user=nickname)
                await websocket.send_json(model.model_dump())
            except Exception:
                pass

        @client.on(ShareEvent)
        async def on_share(event: ShareEvent):
            try:
                user_obj = getattr(
                    event, "user", getattr(event, "user_info", None)
                )
                nickname = getattr(
                    user_obj,
                    "nick_name",
                    getattr(user_obj, "nickname", "Unknown"),
                )
                if nickname == "Unknown":
                    nickname = getattr(user_obj, "unique_id", "Unknown")

                # ตรวจสอบว่าเป็นการรีโพสต์ (Repost) หรือไม่
                is_repost = (
                    getattr(event, "is_repost", False)
                    or getattr(event, "action", "") == "repost"
                )

                # ส่งข้อมูลแบบกำหนดเองเพื่อรองรับทั้ง share และ repost
                await websocket.send_json(
                    {
                        "type": "repost" if is_repost else "share",
                        "user": nickname,
                        "is_repost": is_repost,
                    }
                )
            except Exception:
                pass

        await client.start()
    except asyncio.CancelledError:
        pass
    except Exception as e:
        print(f"Error connecting to TikTok: {e}")
        traceback.print_exc()
        err_name = type(e).__name__
        try:
            await websocket.send_json(
                {
                    "type": "status",
                    "status": "error",
                    "message": f"{err_name}: {str(e)}",
                }
            )
        except Exception:
            pass
