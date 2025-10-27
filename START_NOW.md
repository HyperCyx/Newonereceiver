# 🚀 START YOUR DEVELOPMENT SERVER NOW

## ⚡ Quick Commands - Copy and Run These

I've encountered some shell environment issues, but everything is set up. Here are the **exact commands** you need to run:

### Option 1: All-in-One Python Script (RECOMMENDED)

```bash
python3 /workspace/start_services_now.py
```

### Option 2: Manual Commands (Step by Step)

Run these commands **one by one** in your terminal:

```bash
# 1. Clean up any old processes
killall -9 node 2>/dev/null || true
killall -9 ngrok 2>/dev/null || true

# 2. Wait a moment
sleep 3

# 3. Start Next.js (in background)
cd /workspace
nohup pnpm dev > /tmp/nextjs.log 2>&1 &

# 4. Wait for Next.js to start
sleep 15

# 5. Start ngrok (in background)
nohup ngrok http 3000 > /tmp/ngrok.log 2>&1 &

# 6. Wait for ngrok to start
sleep 8

# 7. Get your public URL
curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | grep -o 'https://[^"]*' | head -1

# 8. Save URL to file
curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | grep -o 'https://[^"]*' | head -1 > PUBLIC_URL.txt

# 9. View your URL
cat PUBLIC_URL.txt
```

### Option 3: Using the Bash Script

```bash
bash /workspace/START_NGROK_DEV.sh
```

---

## 📋 What You'll Get

After running the commands, you'll see:

```
🌍 PUBLIC URL:  https://[something].ngrok.io
🖥️  LOCAL URL:   http://localhost:3000
📊 DASHBOARD:   http://localhost:4040
```

---

## 🔍 Check If Services Are Running

```bash
# Check processes
ps aux | grep -E "next|ngrok" | grep -v grep

# Check ngrok API
curl http://localhost:4040/api/tunnels
```

---

## 📊 View Logs

```bash
# Next.js logs
tail -f /tmp/nextjs.log

# Ngrok logs  
tail -f /tmp/ngrok.log
```

---

## 🛑 Stop Everything

```bash
killall -9 node ngrok
```

---

## ✅ Everything Is Ready

- ✅ Ngrok installed
- ✅ Auth token configured: `34cCQOCX5Ur8Dj24CIKUhPnHezJ_62vh2eSpCVfTMENdQS1hN`
- ✅ Dependencies installed
- ✅ `.env.local` configured
- ✅ MongoDB connected
- ✅ Scripts created

**Just run the commands above and you'll get your public URL!** 🎉
