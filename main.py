import asyncio
import json
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from tiktok_client import start_tiktok_client

app = FastAPI(title="TikTalk AI Reader Backend")

# Ensure static directory exists
os.makedirs("static", exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def read_root():
    return FileResponse("static/index.html")

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
