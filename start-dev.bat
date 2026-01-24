@echo off
REM TreeChat Development Startup Script for Windows

echo 🌳 TreeChat - Starting development environment...
echo.

REM Check if virtual environment exists
if exist "server\venv\Scripts\activate.bat" (
    echo 🐍 Activating virtual environment...
    call server\venv\Scripts\activate.bat
)

REM Check if requirements are installed
python -c "import fastapi" 2>nul
if errorlevel 1 (
    echo 📦 Installing dependencies...
    pip install -r server\requirements.txt
)

echo.
echo 🚀 Starting FastAPI server...
echo 🎯 API: http://localhost:8000
echo 📚 Docs: http://localhost:8000/docs
echo.

REM Start the server
uvicorn server.main:app --reload --host 0.0.0.0 --port 8000
