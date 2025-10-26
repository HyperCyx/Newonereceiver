# 🎉 Telegram Accounts Platform

A Next.js-based Telegram Mini App for managing accounts with country-based capacity control.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Setup Environment Variables
Create a `.env` file with:
```env
MONGODB_URI=your_mongodb_connection_string
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=your_bot_username
```

### 3. Deploy to Get Public URL
```bash
# Login to Vercel (first time only)
vercel login

# Deploy and get public URL
./GET_PUBLIC_URL.sh
```

Or use the shortcut:
```bash
pnpm get-url
```

## 📚 Documentation

- **🎯 [START HERE](./🎉_START_HERE_🎉.md)** - Main guide to get started
- **⚡ [Quick Start](./VERCEL_QUICK_START.md)** - Fast deployment guide
- **📖 [Setup Guide](./VERCEL_SETUP_GUIDE.md)** - Detailed Vercel CLI instructions
- **✅ [Migration Info](./VERCEL_MIGRATION_COMPLETE.md)** - ngrok → Vercel migration details

## 🌟 Features

- ✅ **Telegram-Only Access** - App works exclusively in Telegram
- ✅ **Admin Dashboard** - Full admin control panel
- ✅ **Country Capacity System** - Manage capacity per country
- ✅ **MongoDB Integration** - Reliable data persistence
- ✅ **Vercel Deployment** - Fast, reliable hosting
- ✅ **Auto-Registration** - Users auto-register on first access

## 🛠️ Tech Stack

- **Framework:** Next.js 16.0
- **Database:** MongoDB
- **Deployment:** Vercel
- **UI:** React 19, Tailwind CSS
- **Authentication:** Telegram Mini App

## 📋 Available Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server

# Deployment
pnpm get-url          # Deploy and get public URL
pnpm deploy           # Deploy to preview
pnpm deploy:prod      # Deploy to production

# Database
pnpm db:init          # Initialize MongoDB
pnpm db:seed          # Add sample data
pnpm db:clear         # Clear test data
```

## 🔐 Admin Access

Default admin:
- **Telegram ID:** 1211362365
- **Username:** @policehost

To set a different admin:
```bash
npx tsx scripts/set-admin.ts
```

## 📱 Usage

1. Deploy the app to get a public URL
2. Share the URL with users via Telegram
3. Users click the URL in Telegram
4. App opens as Telegram Mini App
5. Users can purchase accounts (if capacity available)
6. Admin can manage everything via dashboard

## 🌍 Deployment

This project uses **Vercel** for hosting (no more ngrok!):

**Benefits:**
- ✅ Permanent URLs (don't expire)
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Environment variables built-in
- ✅ Unlimited free deployments

**Deploy:**
```bash
./GET_PUBLIC_URL.sh
```

See [VERCEL_QUICK_START.md](./VERCEL_QUICK_START.md) for details.

## 🐛 Troubleshooting

### Not logged in to Vercel
```bash
vercel login
```

### Environment variables missing
```bash
vercel env add MONGODB_URI
vercel env add TELEGRAM_BOT_TOKEN
```

### Build fails
Test locally:
```bash
pnpm build
```

## 📖 More Information

- [Vercel CLI Docs](https://vercel.com/docs/cli)
- [Next.js Docs](https://nextjs.org/docs)
- [Telegram Mini Apps](https://core.telegram.org/bots/webapps)

---

**Status:** ✅ Production Ready  
**Platform:** Telegram Mini App  
**Database:** MongoDB Atlas  
**Hosting:** Vercel Edge Network