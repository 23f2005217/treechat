# TreeChat

An AI-powered task management assistant with branching conversations.

## Overview

TreeChat is a full-stack application featuring:
- **Branching conversations**: Fork conversations at any point to explore different directions
- **Organized threads**: Keep conversations organized in folders
- **AI-Powered**: Intelligent responses and task extraction

## Architecture

### Frontend (client/)
- React with TypeScript
- Vite build tool
- Tailwind CSS for styling
- Zustand for state management
- React Router for navigation
- Radix UI components

### Backend (server/)
- FastAPI (Python)
- MongoDB with Beanie ODM
- OpenAI integration for AI responses

## Key Components

### Frontend
- `client/src/pages/HomePage.tsx` - Welcome screen with quick actions
- `client/src/pages/ThreadPage.tsx` - Chat thread view with messages
- `client/src/components/Sidebar.tsx` - Thread navigation sidebar
- `client/src/store/useSidebarStore.ts` - Sidebar state management
- `client/src/store/useChatStore.ts` - Chat messages state
- `client/src/hooks/useThreads.ts` - Backend thread API integration
- `client/src/hooks/useChat.ts` - Chat message handling

### Backend
- `server/main.py` - FastAPI app entry point
- `server/routes/contexts.py` - Thread/context CRUD operations
- `server/routes/chat.py` - Chat message processing
- `server/routes/messages.py` - Message CRUD operations
- `server/routes/tasks.py` - Task management
- `server/models/` - Beanie document models

## API Endpoints

- `GET /api/contexts/` - List all threads
- `POST /api/contexts/` - Create new thread
- `GET /api/contexts/{id}` - Get thread details
- `PATCH /api/contexts/{id}` - Update thread
- `DELETE /api/contexts/{id}` - Delete thread
- `GET /api/contexts/{id}/messages` - Get thread messages
- `POST /api/chat/` - Send chat message

## Development

The application runs with:
- Frontend: Vite dev server on port 5000 (webview)
- Backend: Uvicorn on port 8000

The frontend proxies `/api` requests to the backend.

## Recent Changes

- Fixed thread page scrolling: messages area scrolls while input stays fixed at bottom
- Fixed button nesting hydration error in sidebar tree-view actions
- Connected sidebar to backend contexts API for thread management
- Updated HomePage to welcome screen with quick start functionality
- Integrated thread creation, renaming, and deletion with backend
- Fixed navigation to use React Router instead of page reloads
- Added folder icons to sidebar folder items
- Sidebar search filters threads by name in real-time

## Environment Variables

Required:
- `MONGODB_URL` or `DATABASE_URL` - MongoDB connection string
- `OPENAI_API_KEY` - OpenAI API key for AI responses (optional)
