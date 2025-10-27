#!/usr/bin/env python3
import subprocess
import time
import json
import sys
import os

print("=" * 60)
print("🚀 STARTING DEVELOPMENT SERVER WITH NGROK")
print("=" * 60)
print()

# Clean up
print("1️⃣ Cleaning up old processes...")
subprocess.run("killall -9 node 2>/dev/null || true", shell=True)
subprocess.run("killall -9 ngrok 2>/dev/null || true", shell=True)
time.sleep(3)
print("✅ Cleanup complete\n")

# Start Next.js
print("2️⃣ Starting Next.js development server...")
with open("/tmp/nextjs.log", "w") as log:
    subprocess.Popen(
        ["pnpm", "dev"],
        cwd="/workspace",
        stdout=log,
        stderr=log,
        start_new_session=True
    )
print("⏳ Waiting for Next.js to start (15 seconds)...")
time.sleep(15)
print("✅ Next.js should be running\n")

# Start ngrok
print("3️⃣ Starting ngrok tunnel...")
with open("/tmp/ngrok.log", "w") as log:
    subprocess.Popen(
        ["ngrok", "http", "3000"],
        stdout=log,
        stderr=log,
        start_new_session=True
    )
print("⏳ Waiting for ngrok to start (8 seconds)...")
time.sleep(8)
print("✅ Ngrok should be running\n")

# Get URL
print("4️⃣ Getting your public URL...")
url = None
for attempt in range(1, 16):
    try:
        result = subprocess.run(
            ["curl", "-s", "http://localhost:4040/api/tunnels"],
            capture_output=True,
            text=True,
            timeout=3
        )
        if result.returncode == 0 and result.stdout:
            data = json.loads(result.stdout)
            if data.get("tunnels") and len(data["tunnels"]) > 0:
                url = data["tunnels"][0]["public_url"]
                break
    except:
        pass
    print(f"⏳ Waiting for URL... attempt {attempt}/15")
    time.sleep(2)

print()
if url:
    print("=" * 60)
    print("✅ SUCCESS! YOUR DEVELOPMENT SERVER IS RUNNING!")
    print("=" * 60)
    print()
    print(f"🌍 PUBLIC URL:  {url}")
    print(f"🖥️  LOCAL URL:   http://localhost:3000")
    print(f"📊 DASHBOARD:   http://localhost:4040")
    print()
    print("=" * 60)
    print()
    
    # Save to file
    with open("/workspace/PUBLIC_URL.txt", "w") as f:
        f.write(f"{url}\n")
    print(f"📝 URL saved to: /workspace/PUBLIC_URL.txt")
    print()
    print("🌐 You can now access your app from ANYWHERE!")
    print(f"   Just open: {url}")
    print()
    print("=" * 60)
else:
    print("❌ Failed to get ngrok URL")
    print("\nCheck logs:")
    print("  Next.js: tail -f /tmp/nextjs.log")
    print("  Ngrok: tail -f /tmp/ngrok.log")
    sys.exit(1)
