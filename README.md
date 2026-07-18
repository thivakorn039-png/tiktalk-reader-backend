# TikTalk AI Reader - Backend

This is the Python FastAPI backend for the TikTalk AI Reader application. It connects to TikTok LIVE streams and forwards events (Comments, Gifts, Follows) via WebSocket to the Android client.

## Tech Stack
- Python 3.12
- FastAPI
- TikTokLive
- WebSockets
- Uvicorn

## Local Development
1. Create a virtual environment: `python -m venv venv`
2. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`
3. Install dependencies: `pip install -r requirements.txt`
4. Run the server: `uvicorn main:app --reload`
5. Connect your WebSocket client to `ws://localhost:8000/ws`

## Deployment to Render.com
1. Push this repository to GitHub.
2. Log in to [Render.com](https://render.com/).
3. Create a **New Web Service**.
4. Connect your GitHub repository.
5. Render will automatically detect the settings from `render.yaml` (if used as Blueprint) or use the following manual settings:
   - **Environment:** Python
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Click **Create Web Service**.

> **Note:** The backend is designed to run completely in RAM and does not require a database. It handles Render's sleep/wake cycles gracefully by allowing the Android app to auto-reconnect.
