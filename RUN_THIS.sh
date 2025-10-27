#!/bin/bash

# Kill old processes
killall -9 node 2>/dev/null || true
killall -9 ngrok 2>/dev/null || true
sleep 3

# Start Next.js
cd /workspace
nohup pnpm dev > /tmp/nextjs.log 2>&1 &
sleep 15

# Start ngrok
nohup ngrok http 3000 > /tmp/ngrok.log 2>&1 &
sleep 8

# Get and display URL
echo ""
echo "=========================================="
URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | grep -o 'https://[^"]*' | head -1)
if [ ! -z "$URL" ]; then
  echo "✅ SUCCESS! Your public URL is:"
  echo ""
  echo "   $URL"
  echo ""
  echo "$URL" > PUBLIC_URL.txt
  echo "Local:     http://localhost:3000"
  echo "Dashboard: http://localhost:4040"
else
  echo "❌ Could not get URL. Check logs:"
  echo "   tail -f /tmp/ngrok.log"
fi
echo "=========================================="
echo ""
