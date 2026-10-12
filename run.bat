@echo off
echo Starting YouTube Summarizer AI (FastAPI + React)...
start "YouTube Summarizer API" cmd /k ".\venv\Scripts\python.exe server.py"
start "YouTube Summarizer Client" cmd /k "cd client && npm run dev"
echo Backend running on http://localhost:8001
echo Frontend running on http://localhost:3001
pause
