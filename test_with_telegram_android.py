"""
Try with Telegram Android official API credentials
These are known to work for real OTP
"""
import asyncio
from pyrogram import Client

# Official Telegram Android app credentials (public)
# Source: https://github.com/DrKLO/Telegram/blob/master/TMessagesProj/src/main/java/org/telegram/messenger/BuildVars.java
TELEGRAM_ANDROID_API_ID = 6
TELEGRAM_ANDROID_API_HASH = "eb06d4abfb49dc3eeb1aeb98ae0f581e"

async def test_with_android_api(phone):
    print("="*60)
    print("Testing with Telegram Android Official API")
    print("="*60)
    print(f"Phone: {phone}")
    print(f"API ID: {TELEGRAM_ANDROID_API_ID}")
    print(f"API Hash: {TELEGRAM_ANDROID_API_HASH[:10]}...")
    print()
    
    client = Client(
        f"android_test_{phone.replace('+', '')}",
        api_id=TELEGRAM_ANDROID_API_ID,
        api_hash=TELEGRAM_ANDROID_API_HASH,
        workdir="./telegram_sessions",
        app_version="10.14.5",
        device_model="Android",
        system_version="SDK 33"
    )
    
    try:
        print("📞 Connecting...")
        await client.connect()
        print("✅ Connected!")
        
        print(f"📨 Sending code to {phone}...")
        result = await client.send_code(phone)
        
        print(f"\n✅ CODE SENT!")
        print(f"   Hash: {result.phone_code_hash}")
        print(f"   Type: {result.type}")
        print(f"\n📱 CHECK TELEGRAM APP NOW!")
        
        await client.disconnect()
        return True
        
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {e}")
        return False

asyncio.run(test_with_android_api("+998701479814"))
