#!/bin/bash
set -e

echo "🚀 Starting AI Watermark Remover - Local Development Setup"
echo ""

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "📦 Starting Redis and PostgreSQL..."
docker-compose up -d redis postgres

echo "⏳ Waiting for databases to be ready..."
sleep 5

echo ""
echo "✅ Infrastructure is ready!"
echo ""
echo "Next steps:"
echo ""
echo "1. Backend Setup:"
echo "   cd backend"
echo "   pip install -r requirements.txt"
echo "   cp .env.example .env  # Edit with your credentials"
echo "   python init_db.py"
echo "   uvicorn main:app --reload"
echo ""
echo "2. Frontend Setup (in another terminal):"
echo "   cd frontend"
echo "   npm install"
echo "   echo 'NEXT_PUBLIC_API_URL=http://localhost:8000' > .env.local"
echo "   npm run dev"
echo ""
echo "3. Worker Setup (optional, requires GPU):"
echo "   cd worker"
echo "   pip install -r requirements.txt"
echo "   cp .env.example .env  # Edit with your credentials"
echo "   celery -A tasks worker --loglevel=info"
echo ""
echo "🌐 Frontend will be at: http://localhost:3000"
echo "🔧 Backend API will be at: http://localhost:8000"
echo "📚 API docs will be at: http://localhost:8000/docs"
