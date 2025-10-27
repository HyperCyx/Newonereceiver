#!/bin/bash

# Telegram Bot Setup Script
# This script sets up the Telegram bot webhook

echo "🤖 Telegram Bot Setup"
echo "===================="
echo ""

# Check for bot token
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "❌ Error: TELEGRAM_BOT_TOKEN environment variable is not set!"
    echo ""
    echo "Please add your bot token to .env.local:"
    echo "TELEGRAM_BOT_TOKEN=your_bot_token_here"
    echo ""
    echo "You can get a bot token from @BotFather on Telegram:"
    echo "1. Open Telegram and search for @BotFather"
    echo "2. Send /newbot to create a new bot (or /mybots to use existing)"
    echo "3. Follow the instructions to get your bot token"
    echo ""
    exit 1
fi

# Get the webhook URL (ngrok URL)
if [ -f "PUBLIC_URL.txt" ]; then
    WEBHOOK_URL=$(cat PUBLIC_URL.txt)
    WEBHOOK_URL="${WEBHOOK_URL}/api/telegram/webhook"
else
    echo "❌ Error: PUBLIC_URL.txt not found!"
    echo "Please make sure ngrok is running and PUBLIC_URL.txt exists"
    exit 1
fi

echo "📡 Webhook URL: $WEBHOOK_URL"
echo ""

# Set the webhook
echo "🔧 Setting up webhook..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/telegram/setup-webhook \
  -H "Content-Type: application/json" \
  -d "{\"webhookUrl\": \"$WEBHOOK_URL\"}")

echo "$RESPONSE" | grep -q '"success":true'
if [ $? -eq 0 ]; then
    echo "✅ Webhook configured successfully!"
    echo ""
    echo "📋 Webhook details:"
    echo "$RESPONSE" | grep -o '"url":"[^"]*"'
    echo ""
    echo "🎉 Your bot is now ready!"
    echo ""
    echo "Test it by sending /start to your bot on Telegram"
else
    echo "❌ Failed to set webhook!"
    echo "Response: $RESPONSE"
    exit 1
fi
