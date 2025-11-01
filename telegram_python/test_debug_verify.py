"""
Debug verify_otp to see exactly what's happening
"""
import sys
import asyncio
from pyrogram import Client
from pyrogram.errors import PhoneCodeExpired, PhoneCodeInvalid
import os

API_ID = 23404078
API_HASH = "6f05053d7edb7a3aa89049bd934922d1"
SESSIONS_DIR = "/workspace/telegram_python/telegram_sessions"

async def debug_verify(phone_number, code, phone_code_hash):
    clean_phone = phone_number.replace('+', '').replace(' ', '').replace('-', '')
    
    print(f"\n{'='*60}")
    print("DEBUG: Verify OTP Flow")
    print(f"{'='*60}")
    print(f"Phone: {phone_number}")
    print(f"Clean: {clean_phone}")
    print(f"Code: {code}")
    print(f"Hash: {phone_code_hash}")
    print(f"Session dir: {SESSIONS_DIR}")
    
    # Check session file exists
    session_file = f"{SESSIONS_DIR}/{clean_phone}.session"
    print(f"\n1. Checking session file: {session_file}")
    if os.path.exists(session_file):
        stat = os.stat(session_file)
        print(f"   ✅ Exists: {stat.st_size} bytes, modified {stat.st_mtime}")
    else:
        print(f"   ❌ NOT FOUND!")
        return
    
    # Create client
    print(f"\n2. Creating Client...")
    print(f"   name: {clean_phone}")
    print(f"   workdir: {SESSIONS_DIR}")
    
    client = Client(
        name=clean_phone,
        api_id=API_ID,
        api_hash=API_HASH,
        workdir=SESSIONS_DIR,
        no_updates=True
    )
    
    print(f"\n3. Connecting...")
    await client.connect()
    print(f"   ✅ Connected")
    
    # Check if we can load storage
    print(f"\n4. Checking storage state...")
    try:
        dc_id = await client.storage.dc_id()
        print(f"   DC ID: {dc_id}")
        auth_key = await client.storage.auth_key()
        print(f"   Auth key exists: {auth_key is not None}")
    except Exception as e:
        print(f"   ⚠️ Storage check failed: {e}")
    
    print(f"\n5. Attempting sign_in...")
    print(f"   Phone: {phone_number}")
    print(f"   Hash: {phone_code_hash}")
    print(f"   Code: {code}")
    
    try:
        result = await client.sign_in(phone_number, phone_code_hash, code)
        print(f"   ✅ SUCCESS! Signed in")
        me = await client.get_me()
        print(f"   User ID: {me.id}")
        await client.disconnect()
        return True
    except PhoneCodeExpired as e:
        print(f"   ❌ PHONE_CODE_EXPIRED")
        print(f"   This means:")
        print(f"   - The code was already used")
        print(f"   - OR the hash is not valid for this session")
        print(f"   - OR Telegram rejected it for timing/state reasons")
        await client.disconnect()
        return False
    except PhoneCodeInvalid as e:
        print(f"   ❌ PHONE_CODE_INVALID")
        print(f"   The code is wrong")
        await client.disconnect()
        return False
    except Exception as e:
        print(f"   ❌ ERROR: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        await client.disconnect()
        return False

if len(sys.argv) < 4:
    print("Usage: python test_debug_verify.py <phone> <code> <hash>")
    sys.exit(1)

phone = sys.argv[1]
code = sys.argv[2]
phone_hash = sys.argv[3]

result = asyncio.run(debug_verify(phone, code, phone_hash))
print(f"\n{'='*60}")
if result:
    print("✅ VERIFICATION SUCCESSFUL")
else:
    print("❌ VERIFICATION FAILED")
print(f"{'='*60}\n")
