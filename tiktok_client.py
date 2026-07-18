import asyncio
from TikTokLive import TikTokLiveClient
from TikTokLive.events import ConnectEvent, DisconnectEvent, CommentEvent, GiftEvent, FollowEvent
from fastapi import WebSocket
from models import CommentEvent as ModelComment, GiftEvent as ModelGift, FollowEvent as ModelFollow
import traceback

async def start_tiktok_client(username: str, websocket: WebSocket):
    while True:
        try:
            client = TikTokLiveClient(unique_id=username)
            
            @client.on(ConnectEvent)
            async def on_connect(event: ConnectEvent):
                try:
                    await websocket.send_json({"type": "status", "status": "connected"})
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
                    model = ModelComment(user=event.user.nickname, message=event.comment)
                    await websocket.send_json(model.model_dump())
                except:
                    pass
                
            @client.on(GiftEvent)
            async def on_gift(event: GiftEvent):
                try:
                    model = ModelGift(user=event.user.nickname, gift=event.gift.info.name, count=event.gift.count)
                    await websocket.send_json(model.model_dump())
                except:
                    pass
                
            @client.on(FollowEvent)
            async def on_follow(event: FollowEvent):
                try:
                    model = ModelFollow(user=event.user.nickname)
                    await websocket.send_json(model.model_dump())
                except:
                    pass

            await client.start()
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"Error connecting to TikTok: {e}")
            traceback.print_exc()
            err_name = type(e).__name__
            try:
                await websocket.send_json({"type": "status", "status": "error", "message": f"{err_name}: {str(e)}"})
            except:
                break
            
            # Break loop on fatal errors to prevent rate limits
            if err_name in ["FailedFetchRoomInfoError", "SignatureRateLimitError"]:
                break
                
            await asyncio.sleep(5) # Reconnect delay
