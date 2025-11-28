#!/bin/bash

echo "🛑 Stopping all services..."

# Stop docker containers
docker-compose down

echo "✅ All services stopped!"
