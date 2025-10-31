import asyncio
import sys
from pyrogram import Client
from pyrogram.errors import FloodWait, PhoneNumberInvalid, PhoneNumberBanned

# Test credentials
API_ID = 23404078
API_HASH = "6f05053d7edb7a3aa89049bd934922d1"

async def test_method_1(phone):
    """Method 1: Direct send_code"""
    print("\n" + "="*60)
    print("METHOD 1: Direct send_code with workdir")
    print("="*60)
    
    client = Client(
        f"test1_{phone.replace('+', '')}",
        api_id=API_ID,
        api_hash=API_HASH,
        workdir="./telegram_sessions"
    )
    
    try:
        print(f"📞 Connecting to Telegram...")
        await client.connect()
        print(f"✅ Connected!")
        
        print(f"📨 Sending code to {phone}...")
        result = await client.send_code(phone)
        
        print(f"\n✅ SUCCESS!")
        print(f"   Phone Code Hash: {result.phone_code_hash}")
        print(f"   Type: {result.type}")
        print(f"   Next Type: {getattr(result, 'next_type', 'N/A')}")
        
        await client.disconnect()
        return True
    except PhoneNumberInvalid as e:
        print(f"❌ ERROR: Phone number is invalid or not registered on Telegram")
        return False
    except PhoneNumberBanned as e:
        print(f"❌ ERROR: Phone number is banned on Telegram")
        return False
    except FloodWait as e:
        print(f"❌ ERROR: Rate limited - wait {e.value} seconds ({e.value/60:.1f} minutes)")
        return False
    except Exception as e:
        print(f"❌ ERROR: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_method_2(phone):
    """Method 2: In-memory session"""
    print("\n" + "="*60)
    print("METHOD 2: In-memory session")
    print("="*60)
    
    client = Client(
        f"test2_{phone.replace('+', '')}",
        api_id=API_ID,
        api_hash=API_HASH,
        in_memory=True
    )
    
    try:
        print(f"📞 Connecting...")
        await client.connect()
        print(f"✅ Connected!")
        
        print(f"📨 Sending code...")
        result = await client.send_code(phone)
        
        print(f"\n✅ SUCCESS!")
        print(f"   Hash: {result.phone_code_hash}")
        print(f"   Type: {result.type}")
        
        await client.disconnect()
        return True
    except Exception as e:
        print(f"❌ ERROR: {type(e).__name__}: {e}")
        return False

async def test_method_3(phone):
    """Method 3: With explicit test mode OFF"""
    print("\n" + "="*60)
    print("METHOD 3: Production mode (test_mode=False)")
    print("="*60)
    
    client = Client(
        f"test3_{phone.replace('+', '')}",
        api_id=API_ID,
        api_hash=API_HASH,
        workdir="./telegram_sessions",
        test_mode=False  # Explicitly set to production
    )
    
    try:
        print(f"📞 Connecting to PRODUCTION servers...")
        await client.connect()
        print(f"✅ Connected!")
        print(f"   DC ID: {await client.storage.dc_id()}")
        
        print(f"📨 Sending code to {phone}...")
        result = await client.send_code(phone)
        
        print(f"\n✅ SUCCESS!")
        print(f"   Hash: {result.phone_code_hash}")
        print(f"   Type: {result.type}")
        
        await client.disconnect()
        return True
    except Exception as e:
        print(f"❌ ERROR: {type(e).__name__}: {e}")
        return False

async def main():
    if len(sys.argv) < 2:
        print("Usage: python comprehensive_test.py <phone_number>")
        sys.exit(1)
    
    phone = sys.argv[1]
    
    print("="*60)
    print(f"COMPREHENSIVE OTP TEST")
    print(f"Phone: {phone}")
    print(f"API ID: {API_ID}")
    print(f"API Hash: {API_HASH[:10]}...{API_HASH[-10:]}")
    print("="*60)
    
    # Test all methods
    results = []
    results.append(await test_method_1(phone))
    await asyncio.sleep(2)
    
    results.append(await test_method_2(phone))
    await asyncio.sleep(2)
    
    results.append(await test_method_3(phone))
    
    print("\n" + "="*60)
    print("RESULTS SUMMARY")
    print("="*60)
    print(f"Method 1 (workdir): {'✅ SUCCESS' if results[0] else '❌ FAILED'}")
    print(f"Method 2 (in-memory): {'✅ SUCCESS' if results[1] else '❌ FAILED'}")
    print(f"Method 3 (explicit prod): {'✅ SUCCESS' if results[2] else '❌ FAILED'}")
    print("="*60)
    
    if any(results):
        print("\n🎉 AT LEAST ONE METHOD WORKED!")
        print("📱 CHECK YOUR TELEGRAM APP NOW!")
        print("   Look for 'Telegram' official chat")
        print("   Message: 'Your login code is: XXXXX'")
    else:
        print("\n❌ ALL METHODS FAILED")
        print("   Possible reasons:")
        print("   1. Phone number not registered on Telegram")
        print("   2. Phone number banned")
        print("   3. Invalid API credentials")
        print("   4. Rate limited from too many attempts")

if __name__ == "__main__":
    asyncio.run(main())
