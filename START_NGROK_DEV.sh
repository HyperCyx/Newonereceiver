#!/bin/bash

echo "================================"
echo "🚀 Starting Development Server with Ngrok"
echo "================================"
echo ""

# Kill old processes
pkill -9 -f "next" 2>/dev/null
pkill -9 -f "ngrok" 2>/dev/null
sleep 2

# Start Next.js
cd /workspace
echo "Starting Next.js development server..."
PORT=3000 pnpm dev > /tmp/nextjs.log 2>&1 &
NEXT_PID=$!
echo "Next.js PID: $NEXT_PID"
sleep 10

# Check if Next.js started
if ps -p $NEXT_PID > /dev/null 2>&1; then
    echo "✅ Next.js server started successfully"
else
    echo "❌ Failed to start Next.js server"
    echo "Check logs: /tmp/nextjs.log"
    exit 1
fi

# Start ngrok
echo ""
echo "Starting ngrok tunnel on port 3000..."
ngrok http 3000 --log=stdout > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!
echo "Ngrok PID: $NGROK_PID"
sleep 5

# Get public URL from ngrok API
echo ""
echo "Fetching public URL..."
for i in {1..10}; do
    PUBLIC_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*' | grep -o 'https://[^"]*' | head -1)
    if [ ! -z "$PUBLIC_URL" ]; then
        break
    fi
    echo "Waiting for ngrok... ($i/10)"
    sleep 2
done

if [ -z "$PUBLIC_URL" ]; then
    echo "❌ Failed to get ngrok URL"
    echo "Ngrok log:"
    cat /tmp/ngrok.log
    exit 1
fi

# Save to file
cat > PUBLIC_URL.txt << EOF
========================================
🌐 YOUR NGROK PUBLIC URL
========================================

$PUBLIC_URL

========================================

🖥️  Local URL: http://localhost:3000
🌍 Public URL: $PUBLIC_URL

========================================

📱 HOW TO USE:

1. Copy the public URL above
2. Access it from anywhere in the world
3. Share it for testing/demo

========================================

⚙️  NGROK DASHBOARD:
   http://localhost:4040

📝 LOGS:
   Next.js: tail -f /tmp/nextjs.log
   Ngrok: tail -f /tmp/ngrok.log

🛑 TO STOP:
   pkill -9 -f "next"
   pkill -9 -f "ngrok"

========================================

Process IDs:
- Next.js: $NEXT_PID
- Ngrok: $NGROK_PID

Admin Telegram ID: 1211362365

========================================
EOF

echo ""
echo "================================"
echo "✅ DEVELOPMENT SERVER STARTED!"
echo "================================"
echo ""
echo "🖥️  Local URL:  http://localhost:3000"
echo "🌍 Public URL: $PUBLIC_URL"
echo ""
echo "================================"
echo ""
echo "📝 URL saved to PUBLIC_URL.txt"
echo ""
echo "📊 View ngrok dashboard: http://localhost:4040"
echo "📋 View logs: tail -f /tmp/nextjs.log"
echo ""
echo "💡 Servers running in background"
echo "   To stop: pkill -9 -f 'next' && pkill -9 -f 'ngrok'"
echo ""
