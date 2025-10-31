"""
Check if API credentials are valid for OTP sending
"""
import asyncio
from pyrogram import Client

# Current credentials
API_ID = 23404078
API_HASH = "6f05053d7edb7a3aa89049bd934922d1"

async def validate_api_credentials():
    print("="*60)
    print("VALIDATING API CREDENTIALS")
    print("="*60)
    print(f"API ID: {API_ID}")
    print(f"API Hash: {API_HASH[:10]}...{API_HASH[-10:]}")
    print()
    
    # Test 1: Can we connect?
    print("Test 1: Connection test...")
    client = Client("validate_test", api_id=API_ID, api_hash=API_HASH, in_memory=True)
    
    try:
        await client.connect()
        print("✅ Connection successful!")
        
        # Get Telegram config
        from pyrogram.raw.functions.help import GetConfig
        config = await client.invoke(GetConfig())
        
        print(f"✅ Connected to Telegram!")
        print(f"   DC: {config.this_dc}")
        print(f"   Test Mode: {config.test_mode}")
        print(f"   Date: {config.date}")
        
        await client.disconnect()
        
        print("\n" + "="*60)
        print("RESULT: API Credentials are VALID!")
        print("="*60)
        
        if config.test_mode:
            print("⚠️  WARNING: Connected to TEST servers")
            print("   Codes won't arrive on real Telegram app!")
            print("   Need to use production API credentials")
        else:
            print("✅ Connected to PRODUCTION servers")
            print("   Codes should arrive in real Telegram app")
        
        return True
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

asyncio.run(validate_api_credentials())
