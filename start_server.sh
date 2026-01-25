#!/bin/bash

# Start the TreeChat server
cd "$(dirname "$0")"

echo "Starting TreeChat server..."
echo "Server will be available at: http://localhost:5000"
echo "API documentation at: http://localhost:5000/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Run the server with uvicorn
uv run uvicorn server.main:app --host 0.0.0.0 --port 5000 --reload