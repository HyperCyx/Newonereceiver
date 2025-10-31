import asyncio
import os
from pyrogram import Client

API_ID = 23404078
API_HASH = "6f05053d7edb7a3aa89049bd934922d1"

async def test_send_code(phone):
    """Test if OTP actually sends"""
    print(f"\n{'='*50}")
    print(f"Testing OTP send to: {phone}")
    print(f"{'='*50}\n")
    
    client = Client(
        f"test_{phone.replace('+', '')}",
        api_id=API_ID,
        api_hash=API_HASH,
        workdir="./telegram_sessions"
    )
    
    try:
        await client.connect()
        print(f"✅ Connected to Telegram DC: {client.storage.dc_id()}")
        
        result = await client.send_code(phone)
        
        print(f"\n{'='*50}")
        print("RESULT:")
        print(f"{'='*50}")
        print(f"Success: YES")
        print(f"Phone code hash: {result.phone_code_hash}")
        print(f"Type: {result.type}")
        print(f"Next type: {result.next_type if hasattr(result, 'next_type') else 'N/A'}")
        print(f"Timeout: {result.timeout if hasattr(result, 'timeout') else 'N/A'}")
        print(f"\n⚠️  CHECK YOUR TELEGRAM APP NOW!")
        print(f"Look for message from 'Telegram' official account")
        print(f"{'='*50}\n")
        
        await client.disconnect()
        return True
    except Exception as e:
        print(f"\n❌ ERROR: {type(e).__name__}: {e}")
        return False

if __name__ == "__main__":
    import sys
    phone = sys.argv[1] if len(sys.argv) > 1 else "+998909999999"
    asyncio.run(test_send_code(phone))
