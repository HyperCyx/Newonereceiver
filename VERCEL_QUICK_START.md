# ⚡ Vercel Quick Start

## 🚀 Three Steps to Deploy

### 1️⃣ Login (First time only)
```bash
vercel login
```

### 2️⃣ Deploy
```bash
./GET_PUBLIC_URL.sh
```

### 3️⃣ Copy URL
The script will display your URL - copy and use it!

---

## 📋 Common Commands

```bash
# Deploy and get URL (easiest)
pnpm get-url

# Deploy to preview
pnpm deploy

# Deploy to production
pnpm deploy:prod

# Check who's logged in
vercel whoami

# View all deployments
vercel ls

# View logs
vercel logs [deployment-url]
```

---

## 🎯 Your First Deployment

```bash
# Step 1: Install
pnpm install

# Step 2: Login
vercel login
# (Follow the email/GitHub login prompt)

# Step 3: Deploy
./GET_PUBLIC_URL.sh
# (Wait ~30 seconds for build + deploy)

# Step 4: Done!
# Copy the URL shown and use it in Telegram
```

---

## 🔑 Environment Variables

First deployment will ask for:

1. **MONGODB_URI**
   ```
   mongodb+srv://user:pass@cluster.mongodb.net/database
   ```

2. **TELEGRAM_BOT_TOKEN**
   ```
   1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ123456789
   ```

3. **NEXT_PUBLIC_TELEGRAM_BOT_USERNAME**
   ```
   your_bot_username
   ```

**Add more variables:**
```bash
vercel env add VARIABLE_NAME
```

---

## ⚡ Why Vercel?

| Feature | Benefit |
|---------|---------|
| ✅ No time limits | Deploy once, works forever |
| ✅ Same URL | URL doesn't change |
| ✅ Fast | Global CDN, edge network |
| ✅ Free | Generous free tier |
| ✅ HTTPS | Automatic SSL |
| ✅ Environment vars | Built-in secret management |

---

## 🐛 Common Issues

### "vercel: command not found"
```bash
pnpm install
```

### "Not logged in"
```bash
vercel login
```

### "Build failed"
Test locally:
```bash
pnpm build
```

### Need to redeploy?
```bash
./GET_PUBLIC_URL.sh
```
That's it!

---

## 📱 For Telegram

After deployment:

1. ✅ Copy the Vercel URL
2. ✅ Send to any Telegram chat
3. ✅ Click the link
4. ✅ App opens as Mini App

Same experience, better infrastructure!

---

## 💡 Pro Tips

### Deploy from any branch
```bash
vercel
```

### Deploy to production
```bash
vercel --prod
```

### Link to existing project
```bash
vercel link
```

### Pull environment vars
```bash
vercel env pull
```

---

## ✅ What You Get

Every deployment includes:

- 🌐 Public HTTPS URL
- 🚀 Automatic builds
- 📊 Deployment logs
- 🔄 Automatic rollbacks
- 📈 Analytics
- 🌍 Global CDN

All free! 🎉

---

## 🎯 TL;DR

```bash
vercel login           # Once
./GET_PUBLIC_URL.sh    # Every deployment
```

**That's it!** ✨

---

**Full Guide:** See `VERCEL_SETUP_GUIDE.md`  
**Migration Info:** See `VERCEL_MIGRATION_COMPLETE.md`
