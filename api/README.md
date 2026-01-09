# Demand Navigator API

FastAPI backend service for the Demand Navigator application.

## What is this folder?

The `api/` directory contains the Python backend API built with FastAPI. It provides:

- RESTful API endpoints for the frontend
- Database connection management (PostgreSQL)
- Business logic and data processing
- Authentication and authorization (future)

## File Structure

```
api/
├── app/
│   ├── __init__.py          # Package initializer
│   ├── main.py              # FastAPI application entrypoint
│   ├── config.py            # Configuration management
│   └── db.py                # Database connection (SQLAlchemy async)
├── scripts/
│   ├── init-db.sql          # Database initialization script
│   └── wait-for-db.sh       # Database readiness helper
├── .venv/                   # Python virtual environment (gitignored)
├── .env                     # Environment variables (gitignored)
├── .env.example             # Environment template
├── pyproject.toml           # Python dependencies
├── start.sh                 # API startup script
└── README.md                # This file
```

### Key Files

**`app/main.py`**
- FastAPI application setup
- API routes and endpoints
- CORS middleware configuration
- Lifecycle management (startup/shutdown)

**`app/config.py`**
- Environment variable management
- Application settings
- Database connection strings

**`app/db.py`**
- Async database connection pool
- SQLAlchemy engine setup
- Database session management

**`pyproject.toml`**
- Python dependencies:
  - FastAPI - Web framework
  - Uvicorn - ASGI server
  - SQLAlchemy - ORM
  - asyncpg - PostgreSQL driver
  - Pydantic - Data validation

## How to Run

### Using npm scripts (from repo root)

```bash
# Start database first
npm run db:start

# Start API only
npm run dev:api

# Start both frontend and API
npm run dev:full
```

### Using the startup script

```bash
cd api
./start.sh
```

This script automatically:
- Creates virtual environment if missing
- Installs dependencies if needed
- Copies .env if missing
- Starts database if not running
- Starts the API server

### Manual setup

```bash
cd api

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -e .

# Copy environment file
cp .env.example .env

# Start the server (from repo root)
cd ..
api/.venv/bin/uvicorn api.app.main:app --reload --port 8000
```

## Accessing the API

Once running, the API is available at:

- **API Base:** http://localhost:8000
- **Health Check:** http://localhost:8000/health
- **Database Health:** http://localhost:8000/health/db
- **API Docs (Swagger):** http://localhost:8000/api/docs
- **API Docs (ReDoc):** http://localhost:8000/api/redoc

## Environment Variables

The `.env` file contains:

```bash
# Application
DEBUG=true                    # Enable debug mode and API docs

# Server
API_HOST=0.0.0.0
API_PORT=8000

# CORS
CORS_ORIGINS=http://localhost:8080,http://localhost:5173

# Database
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/demand_navigator?gssencmode=disable
```

**Important:** The database URL uses `127.0.0.1` instead of `localhost` to avoid GSSAPI authentication issues on macOS.

## Common Issues & Troubleshooting

### Database Connection Failed

**Error:** `⚠️ Database connection failed: role "postgres" does not exist`

**Cause:** Local PostgreSQL instance is running on port 5432, intercepting connections.

**Fix:**
```bash
# Check what's using port 5432
lsof -nP -iTCP:5432 -sTCP:LISTEN

# Stop local PostgreSQL
brew services list | grep postgres
brew services stop postgresql@14  # or your version

# Verify only Docker is listening
lsof -nP -iTCP:5432 -sTCP:LISTEN
# Should only show: com.docke
```

### Port 8000 Already in Use

```bash
# Find and kill process
lsof -ti:8000 | xargs kill -9
```

### Database Not Running

```bash
# Start database
npm run db:start

# Or from repo root
docker compose up -d db

# Check status
docker compose ps
```

### Dependencies Out of Sync

```bash
cd api
source .venv/bin/activate
pip install -e .
```

### Virtual Environment Issues

```bash
# Recreate virtual environment
cd api
rm -rf .venv
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
```

### Import Errors

Make sure you're running uvicorn from the **repository root**, not from inside the `api/` directory:

```bash
# ✅ Correct (from repo root)
api/.venv/bin/uvicorn api.app.main:app --reload --port 8000

# ❌ Wrong (from api/ directory)
.venv/bin/uvicorn api.app.main:app --reload --port 8000
```

## Docker & Database Issues

### Database Won't Start

```bash
# Check Docker is running
docker ps

# View database logs
docker compose logs db

# Restart database
docker compose down
docker compose up -d db
```

### Reset Database

⚠️ **Warning:** This deletes all data!

```bash
npm run db:reset
# Or
docker compose down -v && docker compose up -d db
```

### Connect to Database

```bash
# From your Mac
psql "postgresql://postgres:postgres@127.0.0.1:5432/demand_navigator"

# From inside Docker container
docker exec -it demand_navigator_db psql -U postgres -d demand_navigator
```

## Development Workflow

1. **Start database** (if not running)
   ```bash
   npm run db:start
   ```

2. **Start API server**
   ```bash
   npm run dev:api
   # Or
   cd api && ./start.sh
   ```

3. **Make changes** - Server auto-reloads on file changes

4. **Test endpoints**
   - Use http://localhost:8000/api/docs for interactive testing
   - Or use curl/Postman

5. **View logs** - Check terminal where API is running

## Testing

```bash
cd api
source .venv/bin/activate

# Run tests (when implemented)
pytest

# Check API health
curl http://localhost:8000/health
curl http://localhost:8000/health/db
```

## Additional Resources

- **Main Development Guide:** `../docs/DEVELOPMENT.md`
- **FastAPI Documentation:** https://fastapi.tiangolo.com/
- **SQLAlchemy Documentation:** https://docs.sqlalchemy.org/
- **Pydantic Documentation:** https://docs.pydantic.dev/

---

For complete setup instructions and troubleshooting, see the main [Development Guide](../docs/DEVELOPMENT.md).
