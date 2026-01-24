from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from contextlib import asynccontextmanager

from server.config import settings
from server.models import Task, Message, Context, Project
from server.routes import tasks, messages, contexts, chat


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize MongoDB connection
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    database = client[settings.DATABASE_NAME]
    
    await init_beanie(
        database=database,
        document_models=[Task, Message, Context, Project]
    )
    
    print(f"✅ Connected to MongoDB: {settings.DATABASE_NAME}")
    print(f"🚀 TreeChat API running at http://{settings.HOST}:{settings.PORT}")
    print(f"📚 API Docs: http://{settings.HOST}:{settings.PORT}/docs")
    
    yield
    
    # Shutdown: Close MongoDB connection
    client.close()
    print("❌ MongoDB connection closed")


app = FastAPI(
    title="TreeChat API",
    description="AI-powered declarative task and context manager with tree-based chat",
    version="0.2.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + ["*"],  # Allow configured origins + wildcard for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(messages.router, prefix="/api/messages", tags=["messages"])
app.include_router(contexts.router, prefix="/api/contexts", tags=["contexts"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])


@app.get("/")
async def root():
    return {
        "message": "TreeChat API - AI-powered task manager",
        "version": "0.2.0",
        "features": [
            "Declarative task input",
            "Auto-grouping by domain",
            "Tree-based chat",
            "Time-aware urgency",
            "Natural language queries"
        ],
        "endpoints": {
            "docs": "/docs",
            "tasks": "/api/tasks",
            "chat": "/api/chat",
            "messages": "/api/messages",
            "contexts": "/api/contexts"
        }
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "treechat-api"}
