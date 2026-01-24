#!/bin/bash

# TreeChat Development Startup Script

echo "🌳 TreeChat - Starting development environment..."
echo ""

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running!"
    echo "Start it with: docker run -d -p 27017:27017 --name treechat-mongo mongo:latest"
    echo "Or use docker-compose: docker-compose up -d mongodb"
    echo ""
else
    echo "✅ MongoDB is running"
fi

# Activate virtual environment if it exists
if [ -d "server/venv" ]; then
    echo "🐍 Activating virtual environment..."
    source server/venv/bin/activate
fi

# Check if requirements are installed
if ! python -c "import fastapi" &> /dev/null; then
    echo "📦 Installing dependencies..."
    pip install -r server/requirements.txt
fi

echo ""
echo "🚀 Starting FastAPI server..."
echo "🎯 API: http://localhost:8000"
echo "📚 Docs: http://localhost:8000/docs"
echo ""

# Start the server
cd "$(dirname "$0")"
uvicorn server.main:app --reload --host 0.0.0.0 --port 8000
