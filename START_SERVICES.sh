#!/bin/bash

echo "================================"
echo "Starting Services..."
echo "================================"
echo ""

# Kill old processes
pkill -9 -f "next|ngrok|pnpm" 2>/dev/null
sleep 2

# Start Next.js
cd /workspace
echo "Starting Next.js..."
PORT=3000 pnpm dev > /tmp/nextjs.log 2>&1 &
sleep 10

# Start ngrok
echo "Starting ngrok..."
ngrok http 3000 --log=stdout > /tmp/ngrok.log 2>&1 &
sleep 5

# Get public URL
echo ""
echo "================================"
echo "✅ SERVICES STARTED!"
echo "================================"
echo ""
echo "To get your PUBLIC URL, run:"
echo "curl -s http://localhost:4040/api/tunnels | grep -o 'https://[^\"]*ngrok-free[^\"]*' | head -1"
echo ""
echo "Or visit: http://localhost:4040"
echo ""
echo "Admin ID: 1211362365"
echo "================================"
