#!/usr/bin/env python3
"""
Simple server runner that handles MongoDB connection issues gracefully
"""

import asyncio
import os
import sys
from uvicorn import Config, Server

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(__file__))


async def run_server():
    try:
        from server.main import app

        # Configure uvicorn
        config = Config(
            app=app, host="0.0.0.0", port=5000, reload=True, log_level="info"
        )

        server = Server(config)
        print("Starting TreeChat server...")
        print("API will be available at: http://localhost:5000")
        print("API docs at: http://localhost:5000/docs")

        await server.serve()

    except ImportError as e:
        print(f"Import error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(run_server())
