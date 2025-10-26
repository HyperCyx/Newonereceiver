#!/bin/bash

echo "========================================"
echo "🌐 VERCEL PUBLIC URL DEPLOYMENT"
echo "========================================"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI not installed. Installing..."
    pnpm add -D vercel
    echo "✅ Vercel CLI installed!"
    echo ""
fi

# Check if user is logged in
echo "🔐 Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    echo ""
    echo "❌ Not logged in to Vercel."
    echo ""
    echo "Please run: vercel login"
    echo ""
    echo "After logging in, run this script again."
    echo ""
    exit 1
fi

VERCEL_USER=$(vercel whoami 2>/dev/null)
echo "✅ Logged in as: $VERCEL_USER"
echo ""

# Deploy to Vercel
echo "🚀 Deploying to Vercel (this may take a minute)..."
echo ""

# Deploy and capture the URL
DEPLOY_OUTPUT=$(vercel --yes 2>&1)
URL=$(echo "$DEPLOY_OUTPUT" | grep -Eo 'https://[a-zA-Z0-9.-]+\.vercel\.app' | head -1)

if [ -z "$URL" ]; then
    echo "❌ Could not get deployment URL."
    echo ""
    echo "Deploy output:"
    echo "$DEPLOY_OUTPUT"
    echo ""
    exit 1
fi

echo "✅ Deployment successful!"
echo ""
echo "========================================"
echo "✨ YOUR PUBLIC URL"
echo "========================================"
echo ""
echo "   $URL"
echo ""
echo "========================================"
echo ""

# Save to file
cat > PUBLIC_URL.txt << EOF
========================================
🌐 YOUR PUBLIC URL
========================================

$URL

========================================

📱 HOW TO USE:

1. Copy the URL above
2. Open Telegram app
3. Send the URL to any chat or bot
4. Click the URL in Telegram
5. App will open in Telegram Mini App!

========================================

👤 ADMIN ACCESS:
   Telegram ID: 1211362365
   Username: @policehost

========================================

✅ This URL works ONLY in Telegram!
   (Browser will show instructions screen)

========================================
EOF

echo "📝 URL saved to PUBLIC_URL.txt"
echo ""
echo "📋 Copy this URL and use it in Telegram!"
echo ""

# Test the URL
echo "🧪 Testing deployment..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL" 2>/dev/null)
if [ "$STATUS" = "200" ] || [ "$STATUS" = "308" ]; then
    echo "✅ Deployment is live! (HTTP $STATUS)"
else
    echo "⚠️  Deployment status: HTTP $STATUS"
fi

echo ""
echo "========================================"
echo ""
echo "💡 TIP: Run 'vercel --prod' to deploy to production"
echo ""
