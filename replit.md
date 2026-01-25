## Recent Changes

### January 25, 2026
- **Frontend Core Implementation**:
  - Implemented `AppLayout` with navigation.
  - Built `HomePage` featuring a recursive tree-based chat interface.
  - Created `TasksPage` to display and manage tasks with urgency-based styling.
  - Setup `react-router-dom` for application routing.
  - Configured Vite with a proxy to the FastAPI backend.
- **Backend Enhancements**:
  - Integrated OpenAI LLM for natural language response generation in `server/llm.py`.
  - Updated `chat` endpoint to leverage LLM for responses with a rule-based fallback.
  - Configured server to run on port 5000 with permissive CORS for Replit.
- **Project Configuration**:
  - Updated `.replit` and deployment settings for the VM environment.
  - Resolved import issues and path aliases in the frontend.


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