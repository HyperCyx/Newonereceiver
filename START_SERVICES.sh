#!/bin/bash

echo "================================"
echo "🚀 Starting Development Server"
echo "================================"
echo ""

# Kill old processes
pkill -9 -f "next|pnpm" 2>/dev/null
sleep 2

# Start Next.js
cd /workspace
echo "Starting Next.js development server..."
PORT=3000 pnpm dev > /tmp/nextjs.log 2>&1 &
sleep 10

echo ""
echo "================================"
echo "✅ DEVELOPMENT SERVER STARTED!"
echo "================================"
echo ""
echo "Local URL: http://localhost:3000"
echo ""
echo "To get your PUBLIC URL for deployment:"
echo "  ./GET_PUBLIC_URL.sh"
echo ""
echo "Or run:"
echo "  pnpm get-url"
echo ""
echo "Admin ID: 1211362365"
echo "================================"
echo ""
echo "💡 Development server running in background"
echo "   View logs: tail -f /tmp/nextjs.log"
echo ""
