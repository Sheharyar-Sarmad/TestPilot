
# TestPilot AI — Backend

**One file. One fix. Verified.**

TestPilot AI is an AI-powered code debugging and verification backend that uses an agentic workflow to analyze code issues, generate fixes, and verify proposed solutions.

## Core Architecture

- **FastAPI** — Provides asynchronous REST API endpoints for submitting and managing debugging jobs.
- **LangGraph** — Orchestrates the agentic workflow for code analysis, fix generation, and verification.
- **Redis JobStore** — Stores job states, execution progress, and results.
- **Redis EventBus** — Publishes job events for real-time updates.
- **Server-Sent Events (SSE)** — Streams job progress and execution events to connected clients.
- **Uvicorn** — Runs the FastAPI application as an ASGI server.

### Workflow

1. Receive a code debugging request through the API.
2. Create and track a job using Redis.
3. Execute the LangGraph workflow to analyze the issue and propose a fix.
4. Verify the proposed solution through the configured validation process.
5. Stream execution events and return the final job result.

## Project Structure

```text
backend/
├── app/
│   ├── main.py
│   ├── routes/
│   ├── services/
│   └── schemas/
├── agent/
│   ├── graph.py
│   ├── nodes.py
│   └── state.py
├── config/
│   └── settings.py
├── security/
├── requirements.txt
├── Dockerfile
└── README.md
```

## Local Setup

### Prerequisites

- Python 3.11+
- Docker
- pip

### 1. Clone the Repository

```bash
git clone <repository-url>
cd backend
```

### 2. Start Redis

```bash
docker run -d \
  --name testpilot-redis \
  -p 6379:6379 \
  redis:7-alpine
```

### 3. Configure Environment Variables

Create a `.env` file in the backend directory.

```env
REDIS_URL=redis://localhost:6379/0
```

Add any additional environment variables required by your application, including AI provider credentials.

### 4. Install Dependencies

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it.

**Windows PowerShell:**

```powershell
.venv\Scripts\Activate.ps1
```

**Linux/macOS:**

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

### 5. Run the Backend

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://127.0.0.1:8000`.

Interactive API documentation: `http://127.0.0.1:8000/docs`

## Deployment

API Deployment Link: [Insert Link Here]
