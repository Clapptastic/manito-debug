#!/bin/bash

# Manito Production Startup Script
# This script starts the application with proper process monitoring

set -e  # Exit on any error

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🚀 Starting Manito in production mode..."

# Check if required files exist
if [ ! -f "server/app.js" ]; then
    echo "❌ server/app.js not found"
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "❌ .env file not found"
    exit 1
fi

# Source environment variables
source .env

# Create logs directory if it doesn't exist
mkdir -p logs

# Stop any existing processes
echo "🛑 Stopping existing processes..."
pkill -f "node.*server/app.js" || true
pkill -f "node.*process-monitor.js" || true

# Wait a moment for processes to stop
sleep 2

# Start the process monitor
echo "📊 Starting process monitor..."
nohup node scripts/process-monitor.js start > logs/monitor.log 2>&1 &
MONITOR_PID=$!

echo "✅ Process monitor started with PID: $MONITOR_PID"

# Wait a moment for the server to start
sleep 5

# Check if processes are running
if pgrep -f "node.*server/app.js" > /dev/null; then
    echo "✅ Server is running"
    SERVER_PID=$(pgrep -f "node.*server/app.js")
    echo "📝 Server PID: $SERVER_PID"
else
    echo "❌ Server failed to start"
    echo "📋 Check logs for details:"
    echo "   - Server log: server.log"
    echo "   - Monitor log: logs/monitor.log"
    exit 1
fi

# Show status
echo ""
echo "📊 Application Status:"
echo "   Monitor PID: $MONITOR_PID"
echo "   Server PID: $SERVER_PID"
echo ""
echo "📋 Useful commands:"
echo "   Check status: node scripts/process-monitor.js status"
echo "   View logs: node scripts/process-monitor.js logs server"
echo "   Stop all: node scripts/process-monitor.js stop"
echo ""
echo "🌐 Application should be available at: http://localhost:3000"
echo "🔍 Health check: http://localhost:3000/health"

# Optional: Test health endpoint
if command -v curl >/dev/null 2>&1; then
    echo ""
    echo "🏥 Testing health endpoint..."
    if curl -s http://localhost:3000/health >/dev/null 2>&1; then
        echo "✅ Health check passed"
    else
        echo "⚠️  Health check failed - application may still be starting"
    fi
fi