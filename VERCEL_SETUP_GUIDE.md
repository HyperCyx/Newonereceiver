# 🚀 Vercel CLI Setup Guide

This project now uses Vercel CLI to generate public URLs instead of ngrok.

## ✨ Benefits of Vercel CLI

- ✅ **Better performance** - Edge network deployment
- ✅ **No time limits** - Unlike ngrok free tier
- ✅ **Custom domains** - Use your own domain
- ✅ **Environment variables** - Easy configuration
- ✅ **Automatic HTTPS** - Secure by default
- ✅ **Git integration** - Deploy from branches

## 📋 Prerequisites

1. A Vercel account (free at https://vercel.com)
2. MongoDB connection string (for database)
3. Telegram bot token (if using Telegram features)

## 🛠️ Quick Setup

### 1. Install Dependencies

```bash
pnpm install
```

This will install the Vercel CLI along with other dependencies.

### 2. Login to Vercel

```bash
pnpm vercel login
```

Or if installed globally:

```bash
vercel login
```

Follow the prompts to authenticate via email or GitHub.

### 3. Set Environment Variables

Before deploying, make sure you have a `.env` file with:

```env
MONGODB_URI=your_mongodb_connection_string
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=your_bot_username
```

Vercel will prompt you to add these during first deployment.

### 4. Deploy and Get Public URL

```bash
./GET_PUBLIC_URL.sh
```

This script will:
- Check if you're logged in to Vercel
- Deploy your app to Vercel
- Extract and display the public URL
- Save the URL to `PUBLIC_URL.txt`
- Test if the deployment is live

## 🔄 Manual Deployment

### Preview Deployment (Development)

```bash
vercel
```

This creates a preview URL for testing.

### Production Deployment

```bash
vercel --prod
```

This deploys to your production URL.

## 📱 Using with Telegram

1. Run `./GET_PUBLIC_URL.sh` to deploy and get your URL
2. Copy the URL from the output or `PUBLIC_URL.txt`
3. Open Telegram and send the URL to any chat
4. Click the URL in Telegram
5. Your app will open as a Telegram Mini App!

## 🔧 Advanced Usage

### Set Environment Variables

```bash
vercel env add VARIABLE_NAME
```

### View Deployments

```bash
vercel ls
```

### View Logs

```bash
vercel logs [deployment-url]
```

### Link to Existing Project

```bash
vercel link
```

### Remove a Deployment

```bash
vercel rm [deployment-url]
```

## 🐛 Troubleshooting

### Not Logged In

If you get an authentication error:

```bash
vercel logout
vercel login
```

### Environment Variables Missing

Add them during deployment or via:

```bash
vercel env add MONGODB_URI
vercel env add TELEGRAM_BOT_TOKEN
```

### Deployment Failed

Check the error output and ensure:
- All dependencies are installed
- Build command works locally: `pnpm build`
- Environment variables are set

### Old ngrok URL

The script now uses Vercel instead of ngrok. If you see references to ngrok, they're outdated.

## 🎯 Next Steps

1. ✅ Run `./GET_PUBLIC_URL.sh` to deploy
2. ✅ Copy your Vercel URL
3. ✅ Test in Telegram
4. ✅ Update webhook URLs if needed
5. ✅ Deploy to production when ready: `vercel --prod`

## 📚 Resources

- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)

---

**Note:** Your deployments are persistent and don't expire like ngrok tunnels. The URL remains active as long as the deployment exists.
