# 🤖 Telegram Bot Setup Guide

## ❌ Current Issue

Your Telegram bot is **not responding** because:
1. ❌ **Missing Bot Token** - Not configured in `.env.local`
2. ❌ **Webhook Not Set** - Bot doesn't know where to send updates
3. ❌ **Bot not sending Web App button** - Users can't open the Mini App

## ✅ Complete Fix (Step-by-Step)

### Step 1: Get Your Bot Token

1. Open Telegram and search for **@BotFather**
2. Send `/mybots` to see your existing bots
3. Select your bot: **WhatsAppNumberRedBot**
4. Click **"API Token"** to reveal your bot token
5. Copy the token (format: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

**OR** if you need to create a new bot:
1. Send `/newbot` to @BotFather
2. Choose a name: `WhatsApp Number System`
3. Choose a username: `WhatsAppNumberRedBot` (must end with 'bot')
4. Copy the token @BotFather gives you

### Step 2: Configure Web App Settings (IMPORTANT!)

After getting your bot token, you need to enable Web App:

1. In @BotFather chat, send `/mybots`
2. Select your bot
3. Click **"Bot Settings"**
4. Click **"Menu Button"**
5. Click **"Configure menu button"**
6. **Web App URL**: Paste your ngrok URL
   ```
   https://villiform-parker-perfunctorily.ngrok-free.dev
   ```
7. **Button text**: `Open App` or `Launch App`

### Step 3: Add Bot Token to Environment

Open `/workspace/.env.local` and add this line:

```bash
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE
```

**Full .env.local should look like:**
```bash
MONGODB_URI=mongodb+srv://newone:mAnik123456@newone.iaspgks.mongodb.net/?appName=newone
MONGODB_DB_NAME=telegram_accounts
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=WhatsAppNumberRedBot
NEXT_PUBLIC_WEB_APP_URL=https://villiform-parker-perfunctorily.ngrok-free.dev

# Telegram API Configuration (Required for OTP)
API_ID=23404078
API_HASH=6f05053d7edb7a3aa89049bd934922d1

# Admin Configuration
ADMIN_TELEGRAM_ID=1211362365

# Telegram Bot Token (REQUIRED!)
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

### Step 4: Restart Development Server

```bash
# Kill current server
pkill -f "next dev"

# Start fresh
cd /workspace && PORT=3000 npm run dev > /tmp/nextjs-dev.log 2>&1 &
```

### Step 5: Set Up Webhook

Run the setup script:

```bash
cd /workspace
./SETUP_TELEGRAM_BOT.sh
```

**OR manually set webhook:**

```bash
WEBHOOK_URL="https://villiform-parker-perfunctorily.ngrok-free.dev/api/telegram/webhook"

curl -X POST http://localhost:3000/api/telegram/setup-webhook \
  -H "Content-Type: application/json" \
  -d "{\"webhookUrl\": \"$WEBHOOK_URL\"}"
```

### Step 6: Test Your Bot!

1. Open Telegram
2. Search for **@WhatsAppNumberRedBot**
3. Click **Start** or send `/start`
4. Bot should reply with a message and **"🚀 Open App"** button
5. Click the button to launch the Web App

**Test with referral code:**
```
https://t.me/WhatsAppNumberRedBot?start=WELCOME2024
```

## 📋 How It Works Now

### User Flow:

```
User clicks referral link
  ↓
https://t.me/WhatsAppNumberRedBot?start=WELCOME2024
  ↓
Opens Telegram bot
  ↓
User sends /start (automatically sent)
  ↓
Bot receives: /start WELCOME2024
  ↓
Bot sends message with "Open App" button
Button URL: https://your-app.ngrok-free.dev?start=WELCOME2024
  ↓
User clicks "Open App" button
  ↓
Mini App opens with referral code in URL
  ↓
TelegramGuard extracts referral code from:
  - tg.initDataUnsafe.start_param
  - URL query parameter
  ↓
User auto-registered with WELCOME2024
  ↓
Referral relationship created! ✅
```

### Bot Commands:

The bot now supports:
- `/start` - Opens the Web App
- `/start REFERRAL_CODE` - Opens app with referral code
- `/help` - Shows help message

## 🔧 Technical Details

### Files Modified:

1. **`/workspace/lib/telegram/bot.ts`**
   - Now sends Web App button instead of just text
   - Passes referral code in Web App URL
   - Proper error handling for missing bot token

2. **`/workspace/app/api/telegram/webhook/route.ts`**
   - Receives updates from Telegram
   - Processes /start commands

3. **`/workspace/app/api/telegram/setup-webhook/route.ts`** (NEW)
   - API endpoint to configure webhook
   - Check webhook status

### Bot Code Logic:

```typescript
// When user sends: /start WELCOME2024

// Bot extracts referral code
const args = text.split(" ")
const referralCode = args[1] // "WELCOME2024"

// Bot sends Web App button
webAppUrl = "https://your-app.ngrok-free.dev?start=WELCOME2024"

// Telegram opens Web App with URL
// Web App extracts referral code and registers user
```

## 🚨 Troubleshooting

### Bot Not Responding?

**Check 1: Is bot token configured?**
```bash
grep TELEGRAM_BOT_TOKEN /workspace/.env.local
```

**Check 2: Is server running?**
```bash
ps aux | grep "next dev"
```

**Check 3: Is webhook set?**
```bash
curl http://localhost:3000/api/telegram/setup-webhook
```

**Check 4: Check bot logs**
```bash
tail -f /tmp/nextjs-dev.log | grep TelegramBot
```

### Webhook Errors?

If webhook fails:
1. Make sure ngrok is running
2. Check PUBLIC_URL.txt exists
3. Verify bot token is correct
4. Try setting webhook again

### Users Not Registering?

1. Check that Web App opens when clicking button
2. Verify referral code appears in Web App URL
3. Check browser console for errors
4. Check server logs for registration errors

## 📊 Verify Everything Works

### Test Checklist:

- [ ] Bot token added to .env.local
- [ ] Server restarted
- [ ] Webhook configured successfully
- [ ] Bot responds to /start
- [ ] Bot shows "Open App" button
- [ ] Web App opens when button clicked
- [ ] Referral code passed to Web App
- [ ] User registered with referral code
- [ ] Referral relationship created in database

### Check Webhook Status:

```bash
curl http://localhost:3000/api/telegram/setup-webhook
```

Should return:
```json
{
  "success": true,
  "info": {
    "url": "https://villiform-parker-perfunctorily.ngrok-free.dev/api/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

### Check Bot Logs:

```bash
# Send /start to your bot, then check logs
tail -f /tmp/nextjs-dev.log | grep -E "TelegramBot|UserRegister"
```

Expected output:
```
[TelegramBot] Received message from: username Text: /start WELCOME2024
[TelegramBot] /start command with referral: WELCOME2024
[TelegramBot] Sending Web App button, URL: https://...?start=WELCOME2024
[TelegramBot] ✅ Web App button sent successfully
```

## 🎉 Success!

Once everything is set up:
1. ✅ Bot responds to /start commands
2. ✅ Bot sends "Open App" button
3. ✅ Users can open Web App
4. ✅ Referral codes work correctly
5. ✅ Users get registered automatically

**Share your bot:**
```
https://t.me/WhatsAppNumberRedBot?start=WELCOME2024
```

---

**Need help?** Check the logs or re-run the setup script.
