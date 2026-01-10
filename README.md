# Demand Navigator

Full-stack web application for demand navigation with a **React (Vite + TypeScript)** frontend and **FastAPI** backend.

## 🚀 Quick Start (New Developer)

### Prerequisites

Install these before starting:

1. **Docker Desktop**: [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
2. **Node.js 18+**: [https://nodejs.org/](https://nodejs.org/)
3. **Python 3.10+**: [https://www.python.org/downloads/](https://www.python.org/downloads/)

Verify installations:

```bash
docker --version
node --version
python3 --version


### Setup (First Time)

```bash
# 1. Clone the repository
git clone <repository-url>
cd demand-navigator

# 2. Install all dependencies (Node + Python)
npm run setup

# 3. Copy environment files
npm run setup:env

# 4. Start the database
npm run db:start

# 5. Start the development servers
npm run dev:full
```

That's it! You should now have:

- **Frontend:** [http://localhost:8080](http://localhost:8080)
- **API:** [http://localhost:8000](http://localhost:8000)
- **API Docs:** [http://localhost:8000/api/docs](http://localhost:8000/api/docs)

## 📁 Project Structure

```bash
demand-navigator/
├── src/                    # Frontend (React + Vite + TypeScript)
├── api/                    # Backend (FastAPI + Python)
│   ├── app/               # API application code
│   ├── scripts/           # Database scripts
│   └── start.sh           # API startup script
├── docs/                   # Documentation
│   └── DEVELOPMENT.md     # Complete development guide
├── docker-compose.yml      # Database services
├── start-dev.sh           # Full stack startup script
└── package.json           # Node.js scripts & dependencies
```

## 🛠️ Development Commands

### Start Everything

```bash
# Option 1: Using npm (recommended)
npm run db:start    # Start database
npm run dev:full    # Start frontend + API

# Option 2: Using shell script
./start-dev.sh
```

### Individual Services

```bash
npm run dev         # Frontend only
npm run dev:api     # API only
npm run db:start    # Database only
```

### Database Management

```bash
npm run db:start    # Start PostgreSQL
npm run db:stop     # Stop all containers
npm run db:logs     # View database logs
npm run db:reset    # Reset database (⚠️ deletes data)
```

## 📚 Documentation

- **[Development Guide](docs/DEVELOPMENT.md)** - Complete setup, troubleshooting, and workflow
- **[API Documentation](api/README.md)** - Backend API details and usage

## 🐛 Common Issues

### Port Already in Use

```bash
# Kill process on port 8000 (API)
lsof -ti:8000 | xargs kill -9

# Kill process on port 8080 (Frontend)
lsof -ti:8080 | xargs kill -9
```

### Database Connection Failed

```bash
# Check if local PostgreSQL is conflicting
lsof -nP -iTCP:5432 -sTCP:LISTEN

# Stop local PostgreSQL if running
brew services stop postgresql@14
```

### Fresh Install

```bash
# Remove everything and start over
rm -rf node_modules api/.venv
docker compose down -v
npm run setup
npm run setup:env
```

## 🎯 What's Implemented

**EPIC 0 - Local Dev + Monorepo Wiring** ✅

- ✅ FastAPI backend with async database support
- ✅ Docker Compose PostgreSQL setup
- ✅ Development scripts for easy startup
- ✅ Health check endpoints
- ✅ Interactive API documentation

## 🤝 Contributing

1. Pull latest changes: `git pull`
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Test locally: `npm run dev:full`
5. Commit and push: `git commit -m "feat: your feature" && git push`

## 📖 Tech Stack

**Frontend:**

- React 18
- TypeScript
- Vite
- TailwindCSS
- shadcn/ui components

**Backend:**

- FastAPI
- Python 3.10+
- SQLAlchemy (async)
- PostgreSQL 16

**DevOps:**

- Docker Compose
- Uvicorn (ASGI server)

## 🆘 Need Help?

- Check the [Development Guide](docs/DEVELOPMENT.md) for detailed troubleshooting
- View API docs at [http://localhost:8000/api/docs](http://localhost:8000/api/docs) when running
- Ask the team in Slack/Discord
