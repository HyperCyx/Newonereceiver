#!/bin/bash

# Telegram Bot Webhook Setup
# Production Deployment URL: https://workspace-jpg790au0-diptimanchattopadhyays-projects.vercel.app

echo "========================================"
echo "🤖 Telegram Bot Webhook Setup"
echo "========================================"
echo ""

# Your bot token
BOT_TOKEN="7962590933:AAHHeC9rM7IiVUx4YXE0PtpEoRx6aYkhifg"

# Production URL
WEBHOOK_URL="https://workspace-jpg790au0-diptimanchattopadhyays-projects.vercel.app/api/telegram/webhook"

echo "Bot Token: $BOT_TOKEN"
echo "Webhook URL: $WEBHOOK_URL"
echo ""

# Set webhook
echo "Setting webhook..."
RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${WEBHOOK_URL}\"}")

echo "Response: $RESPONSE"
echo ""

# Verify webhook
echo "Verifying webhook..."
sleep 2
VERIFY=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo")

echo "Webhook Info:"
echo "$VERIFY" | python3 -m json.tool 2>/dev/null || echo "$VERIFY"
echo ""

# Check if webhook is set correctly
if echo "$VERIFY" | grep -q "$WEBHOOK_URL"; then
    echo "✅ Webhook set successfully!"
    echo "✅ URL matches: $WEBHOOK_URL"
else
    echo "❌ Webhook may not be set correctly"
    echo "Please check the response above"
fi

echo ""
echo "========================================"
echo "Setup Complete!"
echo "========================================"
