#!/bin/bash

# Ngrok setup script for port 3000
# Auth token: 34cCQOCX5Ur8Dj24CIKUhPnHezJ_62vh2eSpCVfTMENdQS1hN

echo "🚀 Setting up ngrok for port 3000..."

# Configure ngrok auth token
ngrok authtoken 34cCQOCX5Ur8Dj24CIKUhPnHezJ_62vh2eSpCVfTMENdQS1hN

echo "✅ Auth token configured"
echo "🌐 Starting ngrok tunnel on port 3000..."
echo ""
echo "📝 Your public URL will appear below:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Start ngrok
ngrok http 3000
