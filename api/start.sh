#!/bin/bash
# api/start.sh
# Startup script for the API server

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Demand Navigator API...${NC}"

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo -e "${YELLOW}⚠️  Virtual environment not found. Creating...${NC}"
    python3 -m venv .venv
fi

# Activate virtual environment
echo -e "${GREEN}📦 Activating virtual environment...${NC}"
source .venv/bin/activate

# Check if dependencies are installed
if ! python -c "import fastapi" 2>/dev/null; then
    echo -e "${YELLOW}📚 Installing dependencies...${NC}"
    pip install -e .
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚙️  .env not found. Copying from .env.example...${NC}"
    cp .env.example .env
fi

# Check if database is running
echo -e "${GREEN}🔍 Checking database connection...${NC}"
if ! nc -z localhost 5432 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Database not running. Starting with Docker Compose...${NC}"
    cd .. && docker compose up -d db && cd api
    echo -e "${GREEN}⏳ Waiting for database to be ready...${NC}"
    sleep 3
fi

# Start the server
echo -e "${GREEN}✨ Starting server on http://localhost:8000${NC}"
echo -e "${GREEN}📖 API docs will be available at http://localhost:8000/api/docs${NC}"
echo ""
uvicorn api.app.main:app --reload --port 8000 --host 0.0.0.0
