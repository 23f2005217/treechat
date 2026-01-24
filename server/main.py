from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from contextlib import asynccontextmanager

from server.config import settings
from server.models import Task, Message, Context, Project
from server.routes import tasks, messages, contexts


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
    
    yield
    
    # Shutdown: Close MongoDB connection
    client.close()
    print("❌ MongoDB connection closed")


app = FastAPI(
    title="TreeChat API",
    description="AI-powered declarative task and context manager",
    version="0.1.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(messages.router, prefix="/api/messages", tags=["messages"])
app.include_router(contexts.router, prefix="/api/contexts", tags=["contexts"])


@app.get("/")
async def root():
    return {
        "message": "TreeChat API",
        "version": "0.1.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
