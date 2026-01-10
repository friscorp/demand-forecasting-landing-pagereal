\`\`\``md

# Demand Navigator - Development Setup

Complete guide for setting up and running the Demand Navigator development environment.

## Table of Contents

- [Prerequisites](#prerequisites)
- [First Time Setup](#first-time-setup)
- [Running the Application](#running-the-application)
- [Available Scripts](#available-scripts)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)
- [Project Structure](#project-structure)
- [Useful Commands](#useful-commands)
- [Getting Help](#getting-help)
- [Next Steps](#next-steps)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Docker Desktop** - For running PostgreSQL database  
  - Download: <https://www.docker.com/products/docker-desktop>  
  - Verify: `docker --version`

- **Node.js 18+** - For frontend development  
  - Download: <https://nodejs.org/>  
  - Verify: `node --version`

- **Python 3.10+** - For backend API  
  - Download: <https://www.python.org/downloads/>  
  - Verify: `python3 --version`

- **Git** - For version control  
  - Verify: `git --version`

## First Time Setup

### 1. Clone the Repository

\`\`\`bash
git clone <repository-url>
cd demand-navigator
\`\`\``

### 2. Install All Dependencies

\`\`\`bash
# Install Node.js dependencies and set up Python virtual environment
npm run setup

# Copy environment configuration files
npm run setup:env
\`\`\`

This will:

* Install all Node.js packages
* Create Python virtual environment in `api/.venv`
* Install all Python dependencies
* Copy `.env.example` to `.env` for both root and API

### 3. Start the Database

\`\`\`bash
npm run db:start
\`\`\`

Wait for the database to be healthy (about 5 seconds).

### 4. Verify Setup

\`\`\`bash
# Check database is running
docker compose ps

# Should show:
# NAME                  STATUS
# demand_navigator_db   Up (healthy)
\`\`\`

## Running the Application

You have three options for running the development environment:

### Option 1: Using npm Scripts (Recommended)

Start everything with one command:

\`\`\`bash
# Start database first
npm run db:start

# Start both frontend and API concurrently
npm run dev:full
\`\`\`

This will:

* Start the frontend on [http://localhost:8080](http://localhost:8080)
* Start the API on [http://localhost:8000](http://localhost:8000)
* Show color-coded logs for both servers
* Stop both servers when you press Ctrl+C

### Option 2: Using Shell Script

\`\`\`bash
./start-dev.sh
\`\`\`

This script:

* Checks all prerequisites
* Starts the database
* Starts the API server
* Starts the frontend server
* Provides a clean shutdown on Ctrl+C

### Option 3: Manual (Separate Terminals)

**Terminal 1 - Database:**

\`\`\`bash
docker compose up -d db
\`\`\`

**Terminal 2 - API Server:**

\`\`\`bash
cd api
./start.sh
\`\`\`

**Terminal 3 - Frontend:**

\`\`\`bash
npm run dev
\`\`\`

## Available Scripts

### Root Package Scripts

#### Development

* **`npm run dev`** - Start frontend only (Vite dev server)
* **`npm run dev:api`** - Start API only (FastAPI with auto-reload)
* **`npm run dev:full`** - Start both frontend and API concurrently

#### Database Management

* **`npm run db:start`** - Start PostgreSQL database
* **`npm run db:stop`** - Stop all Docker containers
* **`npm run db:logs`** - View database logs (follow mode)
* **`npm run db:reset`** - ⚠️ Reset database (deletes all data)

#### Setup & Configuration

* **`npm run setup`** - Install all dependencies (Node + Python)
* **`npm run setup:env`** - Copy environment file templates

#### Build & Deploy

* **`npm run build`** - Build frontend for production
* **`npm run build:dev`** - Build frontend in development mode
* **`npm run lint`** - Run ESLint on frontend code
* **`npm run preview`** - Preview production build

### Shell Scripts

* **`./start-dev.sh`** - Start full development environment with checks
* **`./api/start.sh`** - Start API server with automatic setup

## Development Workflow

### Daily Development Routine

1. **Start the database** (if not already running)

   \`\`\`bash
   npm run db:start
   \`\`\`

2. **Start the development servers**

   \`\`\`bash
   npm run dev:full
   \`\`\`

3. **Access the applications**

   * Frontend: [http://localhost:8080](http://localhost:8080)
   * API: [http://localhost:8000](http://localhost:8000)
   * API Docs: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)
   * Database: `localhost:5432`

4. **Make your changes**

   * Frontend changes auto-reload in the browser
   * API changes auto-reload the server

5. **Stop the servers**

   * Press `Ctrl+C` in the terminal running `dev:full`

6. **Optionally stop the database**

   \`\`\`bash
   npm run db:stop
   \`\`\`

### Working on Frontend Only

\`\`\`bash
npm run dev
\`\`\`

The frontend will run on [http://localhost:8080](http://localhost:8080) but won't have API connectivity.

### Working on Backend Only

\`\`\`bash
npm run db:start
npm run dev:api
\`\`\`

The API will run on [http://localhost:8000](http://localhost:8000) with interactive docs at `/api/docs`.

### Resetting the Database

If you need to start fresh with a clean database:

\`\`\`bash
npm run db:reset
\`\`\`

⚠️ **Warning:** This deletes all data in the database!

### Viewing Logs

**Database logs:**

\`\`\`bash
npm run db:logs
\`\`\`

**API logs:**
Visible in the terminal where you started the API server.

**Frontend logs:**
Visible in the terminal where you started the frontend server.

## Troubleshooting

### Port Already in Use

#### Port 8000 (API)

\`\`\`bash
# Find and kill process on port 8000
lsof -ti:8000 | xargs kill -9
\`\`\`

#### Port 8080 or 5173 (Frontend)

\`\`\`bash
# Find and kill process on port 8080
lsof -ti:8080 | xargs kill -9

# Find and kill process on port 5173
lsof -ti:5173 | xargs kill -9
\`\`\`

#### Port 5432 (Database)

If you have a local PostgreSQL instance running:

\`\`\`bash
# Check what's using port 5432
lsof -nP -iTCP:5432 -sTCP:LISTEN

# If you see a local postgres process, stop it
brew services list | grep postgres
brew services stop postgresql@14  # or your version
\`\`\`

### Database Connection Fails

**Check if database is running:**

\`\`\`bash
docker compose ps
\`\`\`

**Restart the database:**

\`\`\`bash
npm run db:stop
npm run db:start
\`\`\`

**View database logs:**

\`\`\`bash
npm run db:logs
\`\`\`

**Test database connection:**

\`\`\`bash
psql "postgresql://postgres:postgres@127.0.0.1:5432/demand_navigator" -c "SELECT version();"
\`\`\`

### Python Dependencies Out of Sync

\`\`\`bash
cd api
source .venv/bin/activate
pip install -e .
\`\`\`

### Node Dependencies Out of Sync

\`\`\`bash
npm install
\`\`\`

### Virtual Environment Issues

**Recreate virtual environment:**

\`\`\`bash
cd api
rm -rf .venv
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
\`\`\`

### Environment Variables Missing

\`\`\`bash
# Copy environment templates
npm run setup:env

# Or manually:
cp .env.example .env
cp api/.env.example api/.env
\`\`\`

### Docker Issues

**Docker not running:**

* Start Docker Desktop application
* Wait for Docker to fully start

**Docker containers won't start:**

\`\`\`bash
# Remove all containers and volumes
docker compose down -v

# Start fresh
docker compose up -d db
\`\`\`

**Docker out of disk space:**

\`\`\`bash
# Clean up Docker system
docker system prune -a --volumes
\`\`\`

### Fresh Install

If everything is broken, start from scratch:

\`\`\`bash
# Remove all dependencies
rm -rf node_modules api/.venv

# Remove Docker containers and volumes
docker compose down -v

# Reinstall everything
npm run setup
npm run setup:env

# Start fresh
npm run db:start
npm run dev:full
\`\`\`

## Project Structure

\`\`\`text
demand-navigator/
├── api/                      # Backend API (FastAPI)
│   ├── app/                  # Application code
│   │   ├── main.py           # API entrypoint
│   │   ├── config.py         # Configuration
│   │   └── db.py             # Database connection
│   ├── scripts/              # Utility scripts
│   │   ├── init-db.sql       # Database initialization
│   │   └── wait-for-db.sh    # Database readiness check
│   ├── .venv/                # Python virtual environment
│   ├── .env                  # API environment variables
│   ├── start.sh              # API startup script
│   └── pyproject.toml        # Python dependencies
├── src/                      # Frontend (React + Vite)
├── docs/                     # Documentation
│   └── DEVELOPMENT.md        # This file
├── docker-compose.yml        # Docker services
├── start-dev.sh              # Full stack startup script
├── package.json              # Node.js dependencies & scripts
└── .env                      # Frontend environment variables
\`\`\`

## Useful Commands

### Database

\`\`\`bash
# Connect to database with psql
psql "postgresql://postgres:postgres@127.0.0.1:5432/demand_navigator"

# Connect from inside Docker container
docker exec -it demand_navigator_db psql -U postgres -d demand_navigator

# List all tables
docker exec -it demand_navigator_db psql -U postgres -d demand_navigator -c "\dt"

# Backup database
docker exec demand_navigator_db pg_dump -U postgres demand_navigator > backup.sql

# Restore database
cat backup.sql | docker exec -i demand_navigator_db psql -U postgres -d demand_navigator
\`\`\`

### API

\`\`\`bash
# Run API tests (when implemented)
cd api
source .venv/bin/activate
pytest

# Check API health
curl http://localhost:8000/health

# Check database connection
curl http://localhost:8000/health/db
\`\`\`

### Frontend

\`\`\`bash
# Run frontend tests (when implemented)
npm test

# Build for production
npm run build

# Preview production build
npm run preview
\`\`\`

## Getting Help

* **API Documentation:** [http://localhost:8000/api/docs](http://localhost:8000/api/docs) (when API is running)
* **FastAPI Docs:** [https://fastapi.tiangolo.com/](https://fastapi.tiangolo.com/)
* **React Docs:** [https://react.dev/](https://react.dev/)
* **Vite Docs:** [https://vitejs.dev/](https://vitejs.dev/)

## Next Steps

After getting the development environment running:

1. Read the API documentation at `api/README.md`
2. Explore the API endpoints at [http://localhost:8000/api/docs](http://localhost:8000/api/docs)
3. Check out the frontend code in `src/`
4. Review the project architecture documentation (when available)
