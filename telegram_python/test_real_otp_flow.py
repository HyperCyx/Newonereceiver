"""
Test with REAL OTP to see if the flow actually works
"""
import asyncio
from pyrogram import Client
from pyrogram.errors import PhoneCodeExpired, PhoneCodeInvalid
import sys

API_ID = 23404078
API_HASH = "6f05053d7edb7a3aa89049bd934922d1"
SESSIONS_DIR = "./telegram_sessions"

async def full_test(phone):
    clean_phone = phone.replace('+', '').replace(' ', '').replace('-', '')
    
    print("="*60)
    print("FULL OTP FLOW TEST")
    print("="*60)
    
    # Step 1: Send OTP
    print("\n📱 Step 1: Sending OTP...")
    client1 = Client(
        name=clean_phone,
        api_id=API_ID,
        api_hash=API_HASH,
        workdir=SESSIONS_DIR,
        no_updates=True
    )
    
    await client1.connect()
    sent_code = await client1.send_code(phone)
    phone_code_hash = sent_code.phone_code_hash
    
    print(f"✅ OTP sent successfully!")
    print(f"   Hash: {phone_code_hash}")
    print(f"   Type: {sent_code.type}")
    
    # CRITICAL: Save session state
    await client1.storage.save()
    await client1.disconnect()
    
    print(f"\n✅ Session saved and disconnected")
    print(f"   Session file: {SESSIONS_DIR}/{clean_phone}.session")
    
    # Step 2: Wait for user to enter OTP
    print(f"\n📲 Step 2: Check your Telegram app for the OTP code")
    print(f"   Enter the code here (or press Enter to skip): ", end='')
    code = input().strip()
    
    if not code:
        print("   Skipped - no code entered")
        return
    
    # Step 3: Verify OTP
    print(f"\n✅ Step 3: Verifying OTP code: {code}")
    
    client2 = Client(
        name=clean_phone,  # SAME NAME!
        api_id=API_ID,
        api_hash=API_HASH,
        workdir=SESSIONS_DIR,
        no_updates=True
    )
    
    await client2.connect()
    print(f"✅ Reconnected with saved session")
    
    try:
        print(f"🔐 Calling sign_in()...")
        signed_in = await client2.sign_in(phone, phone_code_hash, code)
        
        print(f"\n🎉 SUCCESS! OTP verified!")
        me = await client2.get_me()
        print(f"   User ID: {me.id}")
        print(f"   Phone: {me.phone_number}")
        
        await client2.disconnect()
        
        print(f"\n✅ THE FIX WORKS!")
        return True
        
    except PhoneCodeExpired as e:
        print(f"\n❌ PHONE_CODE_EXPIRED")
        print(f"   This means the approach is BROKEN")
        print(f"   We need a different solution!")
        await client2.disconnect()
        return False
        
    except PhoneCodeInvalid as e:
        print(f"\n❌ PHONE_CODE_INVALID")  
        print(f"   The code you entered is wrong")
        print(f"   Try again with the correct code")
        await client2.disconnect()
        return False
        
    except Exception as e:
        print(f"\n❌ ERROR: {type(e).__name__}: {e}")
        await client2.disconnect()
        return False

if len(sys.argv) < 2:
    print("Usage: python3 test_real_otp_flow.py <phone_number>")
    print("Example: python3 test_real_otp_flow.py +998909999999")
    sys.exit(1)

phone = sys.argv[1]
result = asyncio.run(full_test(phone))

if result:
    print("\n" + "="*60)
    print("✅ CONCLUSION: The fix IS working!")
    print("   The OTP expiry issue might be:")
    print("   - Testing with same code multiple times")
    print("   - Rate limiting")
    print("   - Wrong code entered")
    print("="*60)
else:
    print("\n" + "="*60)
    print("❌ CONCLUSION: Still broken, need different approach")
    print("="*60)
