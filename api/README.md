# Demand Navigator API

FastAPI backend service for the Demand Navigator application.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Running the Server](#running-the-server)
- [API Documentation](#api-documentation)
- [File Structure](#file-structure)
- [Configuration](#configuration)
- [Testing Endpoints](#testing-endpoints)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- **Python 3.10+** (check with `python3 --version`)
- **Node.js 18+** (for frontend development)
- **pip** (Python package manager)

## Initial Setup

### 1. Create Virtual Environment

From the `api/` directory:

```bash
cd api
python3 -m venv .venv
```

### 2. Activate Virtual Environment

**macOS/Linux:**
```bash
source .venv/bin/activate
```

**Windows:**
```bash
.venv\Scripts\activate
```

You should see `(.venv)` in your terminal prompt when activated.

### 3. Install Dependencies

```bash
pip install -e .
```

This installs all required packages including:
- FastAPI (web framework)
- Uvicorn (ASGI server)
- Pydantic (data validation)
- Pydantic Settings (configuration management)
- Python-dotenv (environment variables)

### 4. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` if needed to customize settings like port, CORS origins, etc.

## Running the Server

### From Repository Root

```bash
api/.venv/bin/uvicorn api.app.main:app --reload --port 8000 --host 0.0.0.0
```

### From api/ Directory

```bash
cd api
.venv/bin/uvicorn api.app.main:app --reload --port 8000 --host 0.0.0.0
```

### Expected Output

```
INFO:     Will watch for changes in these directories: ['/path/to/demand-navigator']
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [xxxxx] using WatchFiles
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
🚀 Starting Demand Navigator API v0.1.0
INFO:     Application startup complete.
```

The server will be accessible at:
- **Local:** http://localhost:8000
- **Network:** http://0.0.0.0:8000

## API Documentation

When running with `DEBUG=true` in `.env`:

- **Swagger UI:** http://localhost:8000/api/docs
- **ReDoc:** http://localhost:8000/api/redoc

These provide interactive API documentation and testing interfaces.

## File Structure

```
api/
├── app/
│   ├── __init__.py          # Package initializer (empty)
│   ├── main.py              # FastAPI application entrypoint
│   ├── config.py            # Configuration and environment settings
│   └── db.py                # Database connection stub (EPIC 2)
├── .env                     # Environment variables (gitignored)
├── .env.example             # Environment template
├── pyproject.toml           # Python project metadata and dependencies
└── README.md                # This file
```

### File Descriptions

#### `app/main.py`
The FastAPI application entrypoint. Contains:
- **Application lifecycle management** (`lifespan` context manager)
- **CORS middleware** configuration for cross-origin requests
- **Route definitions** (`/health`, `/` root endpoint)
- **Global exception handler** for error management

Key features:
- Automatic startup/shutdown hooks
- CORS enabled for frontend origins (localhost:8080, localhost:5173)
- Interactive API docs (when DEBUG=true)

#### `app/config.py`
Configuration management using Pydantic Settings. Handles:
- **Environment variable loading** from `.env` file
- **Type validation** for all configuration values
- **Default values** for all settings
- **Cached settings instance** via `@lru_cache` decorator

Settings include:
- Application metadata (name, version, debug mode)
- Server configuration (host, port)
- CORS origins
- Database URL (for future use)

#### `app/db.py`
Database connection stub. Currently contains placeholder functions:
- `init_db()` - Will initialize database connections in EPIC 2
- `close_db()` - Will close database connections in EPIC 2

This file is prepared for future database integration but doesn't perform any operations yet.

#### `pyproject.toml`
Python project configuration using modern `pyproject.toml` format:
- Project metadata (name, version, description)
- Python version requirement (>=3.10)
- Dependencies list
- Build system configuration
- Pytest configuration

#### `.env` / `.env.example`
Environment configuration files:
- `.env.example` - Template with all available settings
- `.env` - Active configuration (gitignored, created from example)

## Configuration

### Environment Variables

Edit `.env` to customize:

```bash
# Application
DEBUG=true                    # Enable debug mode and API docs

# Server
API_HOST=0.0.0.0             # Server host (0.0.0.0 = all interfaces)
API_PORT=8000                # Server port

# CORS (comma-separated list)
CORS_ORIGINS=http://localhost:8080,http://localhost:5173

# Database (will be used in EPIC 2)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/demand_navigator
```

### CORS Configuration

The API is configured to accept requests from:
- `http://localhost:8080` - Vite dev server (default)
- `http://localhost:5173` - Alternative Vite port

Add additional origins to `CORS_ORIGINS` in `.env` if needed.

## Testing Endpoints

### Health Check

```bash
curl http://localhost:8000/health
```

**Expected Response:**
```json
{
  "ok": true,
  "service": "Demand Navigator API",
  "version": "0.1.0"
}
```

### Root Endpoint

```bash
curl http://localhost:8000/
```

**Expected Response:**
```json
{
  "message": "Welcome to Demand Navigator API",
  "docs": "/api/docs",
  "health": "/health"
}
```

### Test CORS Headers

```bash
curl -v -H "Origin: http://localhost:8080" http://localhost:8000/health
```

Look for these headers in the response:
```
access-control-allow-credentials: true
access-control-allow-origin: http://localhost:8080
```

## Troubleshooting

### Issue: `ModuleNotFoundError: No module named 'fastapi'`

**Solution:** Ensure virtual environment is activated and dependencies are installed:
```bash
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -e .
```

### Issue: `Port 8000 already in use`

**Solution:** Either:
1. Stop the existing process using port 8000
2. Use a different port:
   ```bash
   uvicorn api.app.main:app --reload --port 8001
   ```

### Issue: `Import errors with api.app.config`

**Solution:** Ensure you're running from the correct directory. The command should be run from the repository root, not from inside the `api/` directory:
```bash
# From repo root:
api/.venv/bin/uvicorn api.app.main:app --reload --port 8000
```

### Issue: `python3: command not found`

**Solution:** Install Python 3.10+ or use `python` instead of `python3` if that's how it's installed on your system.

### Issue: Virtual environment not activating

**Solution:** 
- On Windows, you may need to enable script execution:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```
- Ensure you created the venv in the correct directory (`api/`)

## Development Workflow

1. **Activate virtual environment** (always do this first)
   ```bash
   source api/.venv/bin/activate
   ```

2. **Start the server** with auto-reload
   ```bash
   api/.venv/bin/uvicorn api.app.main:app --reload --port 8000
   ```

3. **Make code changes** - Server will automatically reload

4. **Test endpoints** using curl, browser, or API docs at http://localhost:8000/api/docs

5. **Deactivate virtual environment** when done
   ```bash
   deactivate
   ```

## Next Steps (EPIC 2)

The following features will be implemented in future tickets:
- Database connection and ORM setup (SQLAlchemy)
- Database migrations (Alembic)
- Authentication and authorization
- Additional API endpoints for demand navigation features

---

**Questions?** Refer to the FastAPI documentation: https://fastapi.tiangolo.com/
