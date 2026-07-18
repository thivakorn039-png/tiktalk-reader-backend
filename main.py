import asyncio
import json
import os
import sys
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import urllib.request
import urllib.parse
from tiktok_client import start_tiktok_client

app = FastAPI(title="TikTalk AI Reader Backend")

# Handle PyInstaller path
if getattr(sys, 'frozen', False):
    base_dir = sys._MEIPASS
else:
    base_dir = os.path.dirname(os.path.abspath(__file__))

static_dir = os.path.join(base_dir, "static")

# Ensure static directory exists
os.makedirs(static_dir, exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
def read_root():
    return FileResponse(os.path.join(static_dir, "index.html"))

@app.get("/manifest.json")
def read_manifest():
    return FileResponse(os.path.join(static_dir, "manifest.json"))

@app.get("/sw.js")
def read_sw():
    return FileResponse(os.path.join(static_dir, "sw.js"))

@app.get("/api/avatar/{username}")
def get_avatar(username: str):
    try:
        url = f"https://www.tikwm.com/api/user/info?unique_id={urllib.parse.quote(username)}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            if data.get("code") == 0 and "data" in data and "user" in data["data"]:
                avatar = data["data"]["user"].get("avatarMedium") or data["data"]["user"].get("avatarLarger")
                if avatar:
                    return {"avatarUrl": avatar}
    except Exception as e:
        print(f"Avatar fetch error: {e}")
    return {"avatarUrl": None}

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

if __name__ == '__main__':
    import uvicorn
    import multiprocessing
    multiprocessing.freeze_support()
    uvicorn.run(app, host='127.0.0.1', port=10000)

# Trigger GitHub Action build
