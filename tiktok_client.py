import asyncio
from TikTokLive import TikTokLiveClient
from TikTokLive.events import ConnectEvent, DisconnectEvent, CommentEvent, GiftEvent, FollowEvent, ShareEvent
from fastapi import WebSocket
from models import CommentEvent as ModelComment, GiftEvent as ModelGift, FollowEvent as ModelFollow, ShareEvent as ModelShare
import traceback

async def start_tiktok_client(username: str, websocket: WebSocket):
    try:
        client = TikTokLiveClient(unique_id=username)
        
        @client.on(ConnectEvent)
        async def on_connect(event: ConnectEvent):
            try:
                avatar_url = None
                try:
                    if hasattr(client, 'room_info') and client.room_info:
                        owner = client.room_info.get("owner", {})
                        url_list = owner.get("avatar_thumb", {}).get("url_list", [])
                        if url_list:
                            avatar_url = url_list[0]
                except Exception:
                    pass
                await websocket.send_json({"type": "status", "status": "connected", "avatarUrl": avatar_url})
            except:
                pass
            
        @client.on(DisconnectEvent)
        async def on_disconnect(event: DisconnectEvent):
            try:
                await websocket.send_json({"type": "status", "status": "disconnected"})
            except:
                pass
            
        @client.on(CommentEvent)
        async def on_comment(event: CommentEvent):
            try:
                msg = getattr(event, 'comment', getattr(event, 'text', ''))
                nickname = getattr(event.user_info, 'nickname', 'Unknown') if hasattr(event, 'user_info') else 'Unknown'
                model = ModelComment(user=nickname, message=msg)
                await websocket.send_json(model.model_dump())
            except Exception as e:
                import traceback
                await websocket.send_json({"type": "status", "status": "error", "message": f"Comment parsing error: {str(e)}"})
            
        @client.on(GiftEvent)
        async def on_gift(event: GiftEvent):
            try:
                nickname = getattr(event.user_info, 'nickname', 'Unknown') if hasattr(event, 'user_info') else 'Unknown'
                model = ModelGift(user=nickname, gift=event.gift.info.name, count=event.gift.count)
                await websocket.send_json(model.model_dump())
            except Exception as e:
                await websocket.send_json({"type": "status", "status": "error", "message": f"Gift parsing error: {str(e)}"})
            
        @client.on(FollowEvent)
        async def on_follow(event: FollowEvent):
            try:
                nickname = getattr(event.user_info, 'nickname', 'Unknown') if hasattr(event, 'user_info') else 'Unknown'
                model = ModelFollow(user=nickname)
                await websocket.send_json(model.model_dump())
            except Exception as e:
                pass

        @client.on(ShareEvent)
        async def on_share(event: ShareEvent):
            try:
                nickname = getattr(event.user_info, 'nickname', 'Unknown') if hasattr(event, 'user_info') else 'Unknown'
                model = ModelShare(user=nickname)
                await websocket.send_json(model.model_dump())
            except Exception as e:
                pass

        await client.start()
    except asyncio.CancelledError:
        pass
    except Exception as e:
        print(f"Error connecting to TikTok: {e}")
        traceback.print_exc()
        err_name = type(e).__name__
        try:
            await websocket.send_json({"type": "status", "status": "error", "message": f"{err_name}: {str(e)}"})
        except:
            pass
