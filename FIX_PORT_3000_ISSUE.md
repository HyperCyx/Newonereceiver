# Fixed: Port 3000 Connection Refused Error ✅

## Problem
Error: `dial tcp [::1]:3000: connect: connection refused`

## Root Cause
**Mismatch between ngrok and Next.js ports:**
- Next.js was running on port **5000** (as configured in package.json)
- ngrok was configured for port **3000** (default Next.js port)
- Telegram webhook was trying to access through ngrok → port 3000 → connection refused

## Solution Applied

### 1. Stopped Old ngrok Process
```bash
pkill -9 -f ngrok
```

### 2. Started ngrok on Correct Port (5000)
```bash
nohup ngrok http 5000 --log=stdout > ngrok.log 2>&1 &
```

### 3. Updated PUBLIC_URL.txt
```
https://villiform-parker-perfunctorily.ngrok-free.dev
```

### 4. Updated Telegram Webhook
```bash
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${PUBLIC_URL}/api/telegram/webhook"
```
Response: `{"ok": true, "result": true, "description": "Webhook was set"}`

## Current Configuration

| Service | Port | URL |
|---------|------|-----|
| Next.js Dev | 5000 | http://localhost:5000 |
| Next.js (network) | 5000 | http://0.0.0.0:5000 |
| ngrok Tunnel | 5000 → 4040 | https://villiform-parker-perfunctorily.ngrok-free.dev |
| Telegram Webhook | - | https://villiform-parker-perfunctorily.ngrok-free.dev/api/telegram/webhook |

## Verification Steps

✅ **Next.js Server:**
```bash
curl http://localhost:5000/api/settings
# Response: {"success": true, ...}
```

✅ **ngrok Tunnel:**
```bash
curl http://localhost:4040/api/tunnels | jq '.tunnels[0].public_url'
# Response: "https://villiform-parker-perfunctorily.ngrok-free.dev"
```

✅ **Public Access:**
```bash
curl https://villiform-parker-perfunctorily.ngrok-free.dev/api/settings
# Response: {"success": true, ...}
```

✅ **Telegram Webhook:**
```bash
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
# Response: webhook URL set correctly
```

## Package.json Configuration

```json
{
  "scripts": {
    "dev": "next dev -p 5000 -H 0.0.0.0",
    "start": "next start -p 5000 -H 0.0.0.0"
  }
}
```

**Note:** Both dev and production use port 5000 consistently.

## How to Restart Services

### If ngrok disconnects:
```bash
# Kill existing ngrok
pkill -9 -f ngrok

# Start ngrok on port 5000
nohup ngrok http 5000 --log=stdout > ngrok.log 2>&1 &

# Wait and get new URL
sleep 5
curl http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url'

# Update webhook with new URL
PUBLIC_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')
echo $PUBLIC_URL > PUBLIC_URL.txt
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${PUBLIC_URL}/api/telegram/webhook"
```

### If Next.js crashes:
```bash
# Kill existing process
pkill -9 -f "next dev"

# Start Next.js
cd /workspace
npm run dev
```

## Prevention

To avoid this issue in the future:

1. **Always use port 5000** for this project (already configured)
2. **Check ngrok port** matches Next.js port before starting
3. **Verify PUBLIC_URL.txt** is updated after ngrok restarts
4. **Update Telegram webhook** after any ngrok URL change

## Common ngrok Commands

```bash
# Check ngrok status
curl http://localhost:4040/api/tunnels

# View ngrok logs
tail -f ngrok.log

# Get current public URL
curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url'

# Test connection through ngrok
curl https://villiform-parker-perfunctorily.ngrok-free.dev/api/settings
```

## Status

✅ **FIXED** - All services running on correct ports
- Next.js: Port 5000 ✓
- ngrok: Port 5000 → Public URL ✓
- Telegram: Webhook updated ✓
- Pyrogram: Ready for testing ✓

---

**Fixed Date:** 2025-10-31  
**Issue:** Port mismatch between ngrok (3000) and Next.js (5000)  
**Solution:** Restarted ngrok on port 5000, updated webhook  
**Status:** ✅ RESOLVED
