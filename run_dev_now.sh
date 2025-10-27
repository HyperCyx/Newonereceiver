#!/bin/bash
set -e

echo "Cleaning up old processes..."
killall -9 node 2>/dev/null || true
killall -9 ngrok 2>/dev/null || true
sleep 3

echo "Starting Next.js..."
cd /workspace
nohup pnpm dev &> /tmp/nextjs.log &
sleep 15

echo "Starting ngrok..."
nohup ngrok http 3000 &> /tmp/ngrok.log &
sleep 8

echo "Getting URL..."
for i in {1..15}; do
  URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['tunnels'][0]['public_url'] if d.get('tunnels') else '')" 2>/dev/null || echo "")
  if [ ! -z "$URL" ]; then
    echo ""
    echo "=========================================="
    echo "SUCCESS! Your public URL is:"
    echo "$URL"
    echo "=========================================="
    echo ""
    echo "$URL" > /workspace/PUBLIC_URL.txt
    echo "Local: http://localhost:3000"
    echo "Dashboard: http://localhost:4040"
    echo ""
    exit 0
  fi
  echo "Waiting... attempt $i/15"
  sleep 2
done

echo "Failed to get URL. Check logs:"
echo "tail -f /tmp/ngrok.log"
exit 1
