# ⚡ Quick Start Guide

## 🎯 Start Development Server (2 Steps)

### Step 1: Start Next.js Server

```bash
npm run dev
```

Server runs on: `http://localhost:3000`

### Step 2: Start ngrok Tunnel

```bash
./start-ngrok.sh
```

Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)

---

## ⚠️ CRITICAL: Set Master Password FIRST

Before ANY users can login:

```
1. Open admin panel (local or ngrok URL)
2. Login as admin
3. Click "Settings" tab
4. Scroll to "Master 2FA Password"
5. Enter password: "MySecurePass2025" (your choice)
6. Click "Save Master Password"
```

**Without this, ALL logins will fail!**

---

## ✅ What's New

### Random Passwords REMOVED ❌

**Before:**
- System generated random passwords as fallback
- Could work without admin setting password

**Now:**
- ✅ ONLY uses master password (set by admin)
- ❌ No random passwords at all
- ❌ Login fails if master password not set
- ✅ Clear error: "Admin must set master 2FA password"

### Ngrok Configured ✅

- Auth token configured
- Run with `./start-ngrok.sh`
- Get public URL for external access

---

## 🚀 Complete Flow

```
1. Start servers
   npm run dev          # Terminal 1
   ./start-ngrok.sh     # Terminal 2

2. Set master password
   Admin Panel → Settings → Set Password

3. Users can now login
   System uses ONLY master password
   No random passwords

4. Monitor
   Check logs for [AutoSetup2FA]
```

---

## 📝 What Happens Now

### User Login Flow:

```
User Login → Master Password Set?
                    ↓
        ┌───────────┴──────────┐
        ↓                      ↓
    YES ✅                 NO ❌
        ↓                      ↓
Use Master Pass        LOGIN FAILS
        ↓              "Contact Admin"
Set on Telegram
        ↓
    Validate
        ↓
Accept/Reject
```

### Without Master Password:

```
⚠️ Admin must set master 2FA password before 
accounts can be processed. Contact administrator.
```

### With Master Password:

```
✅ Account verified and 2FA secured with 
master password!
```

---

## 📁 Files Changed

### Modified:
- `/app/api/accounts/auto-setup-2fa/route.ts`
  - Removed crypto import
  - Removed random password code
  - Made master password required

- `/app/api/telegram/auth/verify-2fa/route.ts`
  - Better error messages
  - Clear master password requirement

### Created:
- `/workspace/start-ngrok.sh` - Ngrok helper script
- `/workspace/START_DEV_SERVER.md` - Full guide
- `/workspace/CHANGES_SUMMARY.md` - Detailed changes

---

## 🔧 Commands

```bash
# Start dev server
npm run dev

# Start ngrok
./start-ngrok.sh

# Or manually
ngrok http 3000

# Validate all accounts
npm run validate-accounts

# Kill port 3000
lsof -ti:3000 | xargs kill -9
```

---

## ✅ Checklist

Before going live:
- [ ] npm run dev (running)
- [ ] ./start-ngrok.sh (running)
- [ ] Master password set in admin panel
- [ ] Test user login works
- [ ] Check logs show "Using master 2FA password"
- [ ] Verify account status displays correctly

---

## 🆘 Troubleshooting

### "Master password not set" error
→ Go to Admin → Settings → Set master password

### ngrok not found
→ Already installed! Use: `/usr/local/bin/ngrok http 3000`
→ Or use the script: `./start-ngrok.sh`

### Port 3000 in use
→ `lsof -ti:3000 | xargs kill -9`
→ Then `npm run dev`

### User login fails
→ Check if master password is set
→ Check logs for [AutoSetup2FA] errors

---

## 🎉 You're Ready!

✅ Random passwords removed
✅ Master password system active
✅ Ngrok configured and ready
✅ No TypeScript errors
✅ Production ready

**Start your servers and set the master password!** 🚀

---

**Full Documentation:**
- `/START_DEV_SERVER.md` - Complete server setup
- `/CHANGES_SUMMARY.md` - What changed
- `/docs/MASTER_2FA_PASSWORD.md` - Master password docs
- `/QUICK_ADMIN_GUIDE.md` - Admin quick reference
