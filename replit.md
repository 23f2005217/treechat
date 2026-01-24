# TreeChat - replit.md

## Overview

TreeChat is an AI-powered personal task and context manager with a tree-based chat interface. Users can input tasks using natural language (e.g., "mother asked to refill cylinder gas by next 3 days"), and the system automatically extracts structured task data, auto-groups by domain, computes urgency, and organizes everything in a branching conversation tree.

The core value proposition is "declarative input" - users speak naturally instead of manually managing lists, and the system handles categorization, time-awareness, and organization automatically.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend (FastAPI + MongoDB)

**Framework Choice**: FastAPI was chosen for async support, automatic OpenAPI documentation, and Pydantic integration for data validation.

**Database**: MongoDB with Beanie ODM (Object Document Mapper) built on Motor (async MongoDB driver). This choice supports:
- Flexible document schemas for tasks with varying attributes
- Tree-structured message storage for branching conversations
- Easy querying for domain-filtered task lists

**Core Document Models**:
- `Task` - Main task entity with domain auto-grouping, urgency levels, time fields, and relational links
- `Message` - Tree-structured chat messages with parent/children references
- `Context` - Conversation contexts for grouping related message trees
- `Project` - Higher-level project groupings

**API Structure**:
- `/tasks` - CRUD operations, filtering by domain/urgency/completion, upcoming tasks query
- `/messages` - Tree-based message storage and retrieval
- `/contexts` - Conversation context management
- `/chat` - Main AI endpoint for natural language processing

**NLP Pipeline** (`server/utils/nlp.py`):
- Rule-based task extraction with keyword matching for domains
- Time pattern recognition (regex-based) for due dates
- Designed to be enhanced with LLM integration

**Urgency Engine** (`server/utils/urgency.py`):
- Multi-factor urgency scoring: time proximity, effort, ignored penalty, blocking tasks
- Weighted computation outputting LOW/MEDIUM/HIGH/CRITICAL levels

**LLM Integration**:
- OpenAI client wrapper in `server/llm.py` using gpt-4o model
- Alternative NVIDIA Nemotron integration in `server/utils/llm.py`

### Frontend (Planned)

The client directory contains a placeholder README indicating planned React/Next.js implementation with:
- Tree-based chat interface using react-flow or visx
- shadcn/ui + Tailwind CSS for styling
- Zustand or React Query for state management

### Configuration

- Environment-based configuration using Pydantic Settings
- CORS configured permissively for development (`*` origins)
- MongoDB connection URL and OpenAI API key via environment variables

## External Dependencies

### Database
- **MongoDB** - Primary data store (expects MongoDB 6.0+)
- **Motor** - Async MongoDB driver for Python
- **Beanie** - ODM layer providing document models and queries

### AI/LLM Services
- **OpenAI API** - GPT-4o for natural language understanding and response generation
- **NVIDIA NIM API** (alternative) - Nemotron-3-nano model integration

### Python Packages
- FastAPI 0.109.0 - Web framework
- Uvicorn 0.27.0 - ASGI server
- Pydantic 2.5.3 - Data validation
- python-dotenv - Environment variable loading

### Environment Variables Required
- `MONGODB_URL` - MongoDB connection string (defaults to localhost:27017)
- `OPENAI_API_KEY` - OpenAI API key for LLM features