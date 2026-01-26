# TreeChat

**AI-powered declarative task and context manager with tree-based chat UI**

TreeChat is a personal assistant that lets you speak naturally ("mother asked to refill cylinder gas by next 3 days") and automatically creates structured tasks with auto-grouping, time-awareness, and knowledge graph visualization.

## 🎯 Key Features

- **Declarative Input**: Speak naturally, no manual list management
- **Auto-Grouping**: Tasks automatically organized by domain (household, college, personal, etc.)
- **Tree-Based Chat**: Branching conversations without losing context
- **Time-Aware**: Urgency computed from due dates, effort, and patterns
- **No Chat History Browsing**: Query like a database ("what's pending for college?")
- **Knowledge Graph**: Visual connections between tasks, projects, and people
- **Open Loops Tracking**: Captures "I'll do this later" and reminds you

## 🏗️ Architecture

```
treechat/
├── server/           # FastAPI + MongoDB backend
│   ├── main.py       # App entry point
│   ├── models.py     # Beanie document models
│   ├── config.py     # Configuration
│   └── routes/       # API endpoints
│       ├── tasks.py
│       ├── messages.py
│       └── contexts.py
└── client/           # Frontend (TBD)
```

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- MongoDB 6.0+

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/23f2005217/treechat.git
cd treechat
```

2. **Set up backend**

```bash
cd server
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. **Configure environment**

```bash
cp .env.example .env
# Edit .env with your MongoDB URL and other settings
```

4. **Start MongoDB**

```bash
# Using Docker
docker run -d -p 27017:27017 --name treechat-mongo mongo:latest

# Or use your existing MongoDB instance
```

5. **Run the server**

```bash
uvicorn server.main:app --reload --host 0.0.0.0 --port 5000
```

6. **Access the API**

- API: http://localhost:5000
- Interactive docs: http://localhost:5000/docs
- Alternative docs: http://localhost:5000/redoc

## 📚 API Overview

### Tasks

- `POST /api/tasks/` - Create a new task
- `GET /api/tasks/` - List tasks (with filters)
- `GET /api/tasks/today` - Get today's priority tasks
- `GET /api/tasks/upcoming` - Get upcoming tasks (next 7 days)
- `GET /api/tasks/by-domain` - Get tasks grouped by domain
- `PATCH /api/tasks/{id}` - Update a task
- `DELETE /api/tasks/{id}` - Delete a task

### Messages (Tree Chat)

- `POST /api/messages/` - Create a message
- `GET /api/messages/tree/{root_id}` - Get full message tree
- `GET /api/messages/` - List messages

### Contexts

- `POST /api/contexts/` - Create a conversation context
- `GET /api/contexts/` - List contexts
- `GET /api/contexts/{id}/messages` - Get all messages in a context

## 🧪 Example Usage

### Create a task from natural language

```bash
curl -X POST http://localhost:5000/api/tasks/ \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Refill gas cylinder",
    "domain": "household",
    "due_fuzzy": "next 3 days",
    "requested_by": "mother"
  }'
```

### Get today's tasks

```bash
curl http://localhost:5000/api/tasks/today
```

### Create a branching conversation

```bash
# Create root message
curl -X POST http://localhost:5000/api/messages/ \
  -H "Content-Type: application/json" \
  -d '{"content": "I need to organize my week", "role": "user"}'

# Create child branch
curl -X POST http://localhost:5000/api/messages/ \
  -H "Content-Type: application/json" \
  -d '{"content": "Let me start with college tasks", "role": "user", "parent_id": "<root_message_id>"}'
```

## 🔮 Roadmap

- [ ] AI-powered natural language task extraction
- [ ] Urgency computation engine
- [ ] Knowledge graph visualization
- [ ] React/Next.js frontend with tree UI
- [ ] Recurring reminders
- [ ] "Open loops" tracker
- [ ] CLI tool for quick capture
- [ ] Mobile app

## 🛠️ Tech Stack

**Backend:**
- FastAPI - Modern Python web framework
- MongoDB - Document database
- Beanie - Async ODM for MongoDB
- Pydantic - Data validation

**Frontend (Planned):**
- React/Next.js
- shadcn/ui components
- Recharts for visualizations

## 📝 License

MIT License

## 👤 Author

Girish Vishveshvara Bhat ([@23f2005217](https://github.com/23f2005217))

---

**Note**: This is an early-stage project. The AI integration and frontend are planned for future iterations.
