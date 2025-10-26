#!/bin/bash

echo "========================================"
echo "🌐 NGROK PUBLIC URL"
echo "========================================"
echo ""

# Check if ngrok is running
if ! pgrep -f "ngrok http" > /dev/null; then
    echo "⚠️  Ngrok not running. Starting..."
    pkill -9 ngrok 2>/dev/null
    sleep 1
    ngrok http 3000 > /tmp/ngrok.log 2>&1 &
    sleep 5
    echo "✅ Ngrok started!"
    echo ""
fi

# Get the public URL
URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['tunnels'][0]['public_url'])" 2>/dev/null)

if [ -z "$URL" ]; then
    echo "❌ Could not get URL. Checking status..."
    echo ""
    echo "Ngrok processes:"
    ps aux | grep ngrok | grep -v grep
    echo ""
    echo "Try opening: http://localhost:4040"
    echo ""
else
    echo "✅ Your Public URL:"
    echo ""
    echo "   $URL"
    echo ""
    echo "📋 Copy this URL and use it in Telegram!"
    echo ""
    echo "🧪 Testing URL..."
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL" 2>/dev/null)
    if [ "$STATUS" = "200" ] || [ "$STATUS" = "308" ]; then
        echo "✅ URL is working! (HTTP $STATUS)"
    else
        echo "⚠️  URL status: HTTP $STATUS"
    fi
    echo ""
fi

echo "========================================"
echo ""
echo "📊 Services:"
echo "  Next.js: $(ps aux | grep 'pnpm dev' | grep -v grep | wc -l) running"
echo "  Ngrok: $(ps aux | grep 'ngrok http' | grep -v grep | wc -l) running"
echo ""
echo "🌐 Ngrok Dashboard: http://localhost:4040"
echo ""
