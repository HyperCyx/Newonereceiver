#!/usr/bin/env python3
import subprocess
import time
import json
import requests
import os
import signal

def kill_processes():
    """Kill existing next and ngrok processes"""
    try:
        subprocess.run(["pkill", "-9", "-f", "next"], stderr=subprocess.DEVNULL)
        subprocess.run(["pkill", "-9", "-f", "ngrok"], stderr=subprocess.DEVNULL)
        time.sleep(2)
    except Exception as e:
        print(f"Error killing processes: {e}")

def start_nextjs():
    """Start Next.js development server"""
    print("Starting Next.js development server...")
    with open("/tmp/nextjs.log", "w") as log:
        process = subprocess.Popen(
            ["pnpm", "dev"],
            cwd="/workspace",
            stdout=log,
            stderr=subprocess.STDOUT,
            preexec_fn=os.setsid
        )
    print(f"Next.js PID: {process.pid}")
    time.sleep(10)
    return process

def start_ngrok():
    """Start ngrok tunnel"""
    print("\nStarting ngrok tunnel on port 3000...")
    with open("/tmp/ngrok.log", "w") as log:
        process = subprocess.Popen(
            ["ngrok", "http", "3000", "--log=stdout"],
            stdout=log,
            stderr=subprocess.STDOUT,
            preexec_fn=os.setsid
        )
    print(f"Ngrok PID: {process.pid}")
    time.sleep(5)
    return process

def get_ngrok_url():
    """Get public URL from ngrok API"""
    print("\nFetching public URL...")
    for i in range(1, 11):
        try:
            response = requests.get("http://localhost:4040/api/tunnels", timeout=2)
            data = response.json()
            if data.get("tunnels"):
                public_url = data["tunnels"][0]["public_url"]
                if public_url.startswith("https://"):
                    return public_url
        except Exception as e:
            print(f"Waiting for ngrok... ({i}/10)")
            time.sleep(2)
    return None

def save_url(public_url, next_pid, ngrok_pid):
    """Save URL to file"""
    content = f"""========================================
🌐 YOUR NGROK PUBLIC URL
========================================

{public_url}

========================================

🖥️  Local URL: http://localhost:3000
🌍 Public URL: {public_url}

========================================

📱 HOW TO USE:

1. Copy the public URL above
2. Access it from anywhere in the world
3. Share it for testing/demo

========================================

⚙️  NGROK DASHBOARD:
   http://localhost:4040

📝 LOGS:
   Next.js: tail -f /tmp/nextjs.log
   Ngrok: tail -f /tmp/ngrok.log

🛑 TO STOP:
   pkill -9 -f "next"
   pkill -9 -f "ngrok"

========================================

Process IDs:
- Next.js: {next_pid}
- Ngrok: {ngrok_pid}

Admin Telegram ID: 1211362365

========================================
"""
    with open("/workspace/PUBLIC_URL.txt", "w") as f:
        f.write(content)

def main():
    print("================================")
    print("🚀 Starting Development Server with Ngrok")
    print("================================\n")
    
    # Kill old processes
    kill_processes()
    
    # Start Next.js
    next_process = start_nextjs()
    
    # Check if Next.js started
    if next_process.poll() is not None:
        print("❌ Failed to start Next.js server")
        print("Check logs: /tmp/nextjs.log")
        return 1
    print("✅ Next.js server started successfully")
    
    # Start ngrok
    ngrok_process = start_ngrok()
    
    # Get public URL
    public_url = get_ngrok_url()
    
    if not public_url:
        print("❌ Failed to get ngrok URL")
        print("Check logs: /tmp/ngrok.log")
        return 1
    
    # Save URL
    save_url(public_url, next_process.pid, ngrok_process.pid)
    
    print("\n================================")
    print("✅ DEVELOPMENT SERVER STARTED!")
    print("================================\n")
    print(f"🖥️  Local URL:  http://localhost:3000")
    print(f"🌍 Public URL: {public_url}\n")
    print("================================\n")
    print("📝 URL saved to PUBLIC_URL.txt\n")
    print("📊 View ngrok dashboard: http://localhost:4040")
    print("📋 View logs: tail -f /tmp/nextjs.log\n")
    print("💡 Servers running in background")
    print("   To stop: pkill -9 -f 'next' && pkill -9 -f 'ngrok'\n")
    
    return 0

if __name__ == "__main__":
    exit(main())
