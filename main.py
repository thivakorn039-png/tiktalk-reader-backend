import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from tiktok_client import start_tiktok_client

app = FastAPI(title="TikTalk AI Reader Backend")

@app.get("/")
def read_root():
    return {"message": "TikTalk AI Reader Backend is running. Connect to /ws for WebSocket."}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    tiktok_task = None
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("action") == "connect":
                    username = msg.get("username", "").strip()
                    if username.startswith("@"):
                        username = username[1:]
                    
                    if tiktok_task and not tiktok_task.done():
                        tiktok_task.cancel()
                    
                    tiktok_task = asyncio.create_task(start_tiktok_client(username, websocket))
                elif msg.get("action") == "disconnect":
                    if tiktok_task and not tiktok_task.done():
                        tiktok_task.cancel()
                    await websocket.send_json({"type": "status", "status": "disconnected"})
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        if tiktok_task and not tiktok_task.done():
            tiktok_task.cancel()
