#!/bin/bash
# start-dev.sh
# Start both frontend and backend servers

set -e

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Starting Demand Navigator Development Environment${NC}"
echo ""

# Check prerequisites
if ! command -v docker &> /dev/null; then
    echo -e "${RED}⚠️  Docker not found. Please install Docker Desktop.${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}⚠️  Node.js not found. Please install Node.js 18+.${NC}"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}⚠️  Python not found. Please install Python 3.10+.${NC}"
    exit 1
fi

# Start database
echo -e "${CYAN}📊 Starting database...${NC}"
docker compose up -d db
sleep 2

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down servers...${NC}"
    kill $(jobs -p) 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start API server
echo -e "${YELLOW}🐍 Starting API server...${NC}"
cd api && ./start.sh &
API_PID=$!
cd ..

# Wait a moment for API to start
sleep 3

# Start frontend server
echo -e "${CYAN}⚛️  Starting frontend server...${NC}"
npm run dev &
WEB_PID=$!

# Print status
echo ""
echo -e "${GREEN}✅ Development environment started!${NC}"
echo -e "${CYAN}Frontend: http://localhost:8080${NC}"
echo -e "${YELLOW}API: http://localhost:8000${NC}"
echo -e "${GREEN}API Docs: http://localhost:8000/api/docs${NC}"
echo ""
echo -e "Press Ctrl+C to stop all servers"
echo ""

# Wait for background processes
wait
