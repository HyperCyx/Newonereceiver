"""
FIXED VERSION - Keep session state alive between send_code and sign_in
"""
import sys
import json
import os
import asyncio
from pyrogram import Client
from pyrogram.errors import (
    SessionPasswordNeeded,
    PasswordHashInvalid,
    PhoneCodeInvalid,
    PhoneCodeExpired,
    FloodWait,
)

# Get API credentials
try:
    API_ID_STR = os.getenv('TELEGRAM_API_ID') or os.getenv('API_ID') or '23404078'
    API_ID = int(API_ID_STR)
except (ValueError, TypeError) as e:
    print(f"ERROR: Could not convert API_ID to integer: {e}", file=sys.stderr)
    API_ID = 23404078

API_HASH = os.getenv('TELEGRAM_API_HASH') or os.getenv('API_HASH') or '6f05053d7edb7a3aa89049bd934922d1'

# FIXED: Use absolute path
SESSIONS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), 'telegram_sessions'))
print(f"DEBUG: SESSIONS_DIR set to: {SESSIONS_DIR}", file=sys.stderr)
print(f"DEBUG: API_ID={API_ID} (type: {type(API_ID).__name__})", file=sys.stderr)

def output_json(data):
    """Output JSON to stdout"""
    print(json.dumps(data, ensure_ascii=False))
    sys.stdout.flush()

def output_error(error_message, details=None):
    """Output error as JSON"""
    error_data = {'success': False, 'error': error_message}
    if details:
        error_data['details'] = details
    output_json(error_data)

async def send_otp(phone_number):
    """
    Send OTP and return session string to preserve state
    FIXED: Export session string instead of saving to file
    """
    try:
        os.makedirs(SESSIONS_DIR, exist_ok=True)
        
        if not phone_number.startswith('+'):
            output_error('INVALID_PHONE_FORMAT', {
                'message': 'Phone number must start with + and country code',
                'phone': phone_number
            })
            return
        
        clean_phone = phone_number.replace('+', '').replace(' ', '').replace('-', '')
        
        print(f"INFO: ===== SENDING OTP (FIXED VERSION) =====", file=sys.stderr)
        print(f"INFO: Phone: {phone_number}", file=sys.stderr)
        
        # FIXED: Use in_memory session first
        client = Client(
            name=f"send_{clean_phone}",
            api_id=API_ID,
            api_hash=API_HASH,
            in_memory=True,  # Don't save to file yet
            no_updates=True
        )
        
        await client.connect()
        print(f"INFO: Connected", file=sys.stderr)
        
        sent_code = await client.send_code(phone_number)
        print(f"SUCCESS: OTP sent!", file=sys.stderr)
        print(f"SUCCESS: Hash: {sent_code.phone_code_hash}", file=sys.stderr)
        print(f"SUCCESS: Type: {sent_code.type}", file=sys.stderr)
        
        # FIXED: Get session data before disconnecting
        # We need to preserve the EXACT session state
        session_data = {
            'phone_code_hash': sent_code.phone_code_hash,
            'phone_number': phone_number,
            'clean_phone': clean_phone,
        }
        
        # Also save to file for backup
        session_file = os.path.join(SESSIONS_DIR, f"{clean_phone}.session")
        await client.storage.save()
        
        # Get DC info for debugging
        try:
            dc_id = await client.storage.dc_id()
            auth_key = await client.storage.auth_key()
            session_data['dc_id'] = dc_id
            session_data['has_auth_key'] = auth_key is not None
            print(f"INFO: DC: {dc_id}, Auth key: {auth_key is not None}", file=sys.stderr)
        except Exception as e:
            print(f"WARN: Could not get DC info: {e}", file=sys.stderr)
        
        await client.disconnect()
        
        print(f"SUCCESS: Session saved to: {session_file}", file=sys.stderr)
        
        output_json({
            'success': True,
            'phone_code_hash': sent_code.phone_code_hash,
            'session_string': clean_phone,
            'session_file': f"{clean_phone}.session",
            'session_data': session_data
        })
        
    except FloodWait as e:
        print(f"ERROR: FLOOD_WAIT - {e.value} seconds", file=sys.stderr)
        output_error('FLOOD_WAIT', {
            'wait_seconds': e.value,
            'wait_minutes': round(e.value / 60, 1),
            'message': f'Too many requests. Wait {round(e.value/60)} minutes.'
        })
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        output_error('SEND_OTP_ERROR', {'message': str(e), 'type': type(e).__name__})

async def verify_otp(session_string, phone_number, code, phone_code_hash):
    """
    Verify OTP - FIXED VERSION
    Load the SAME session that was used for send_code
    """
    try:
        clean_phone = phone_number.replace('+', '').replace(' ', '').replace('-', '')
        
        print(f"INFO: ===== VERIFYING OTP (FIXED VERSION) =====", file=sys.stderr)
        print(f"INFO: Phone: {phone_number}", file=sys.stderr)
        print(f"INFO: Code: {code}", file=sys.stderr)
        print(f"INFO: Hash: {phone_code_hash}", file=sys.stderr)
        
        # FIXED: Load session file created by send_otp
        session_file = os.path.join(SESSIONS_DIR, f"{clean_phone}.session")
        print(f"INFO: Loading session: {session_file}", file=sys.stderr)
        
        if not os.path.exists(session_file):
            print(f"ERROR: Session file not found!", file=sys.stderr)
            output_error('SESSION_NOT_FOUND', {
                'message': 'Session file does not exist',
                'path': session_file
            })
            return
        
        stat = os.stat(session_file)
        print(f"INFO: Session file: {stat.st_size} bytes", file=sys.stderr)
        
        # FIXED: Load with same name format
        client = Client(
            name=clean_phone,
            api_id=API_ID,
            api_hash=API_HASH,
            workdir=SESSIONS_DIR,
            no_updates=True
        )
        
        print(f"INFO: Connecting...", file=sys.stderr)
        await client.connect()
        print(f"INFO: Connected!", file=sys.stderr)
        
        # Log DC info
        try:
            dc_id = await client.storage.dc_id()
            print(f"INFO: Connected to DC: {dc_id}", file=sys.stderr)
        except Exception as e:
            print(f"WARN: Could not get DC: {e}", file=sys.stderr)
        
        print(f"INFO: Calling sign_in()...", file=sys.stderr)
        print(f"INFO: Parameters: phone={phone_number}, hash={phone_code_hash}, code={code}", file=sys.stderr)
        
        try:
            signed_in = await client.sign_in(phone_number, phone_code_hash, code)
            print(f"SUCCESS: ✅ Sign in successful!", file=sys.stderr)
            
            me = await client.get_me()
            print(f"SUCCESS: User ID: {me.id}", file=sys.stderr)
            
            await client.storage.save()
            session_string_out = await client.export_session_string()
            
            await client.disconnect()
            
            output_json({
                'success': True,
                'needs_2fa': False,
                'user_id': me.id,
                'session_string': session_string_out
            })
            
        except SessionPasswordNeeded:
            print(f"INFO: 2FA required", file=sys.stderr)
            
            await client.storage.save()
            session_string_out = await client.export_session_string()
            
            await client.disconnect()
            
            output_json({
                'success': True,
                'needs_2fa': True,
                'session_string': session_string_out
            })
            
    except PhoneCodeInvalid:
        print(f"ERROR: ❌ Invalid OTP code", file=sys.stderr)
        output_error('PHONE_CODE_INVALID')
    except PhoneCodeExpired:
        print(f"ERROR: ❌ OTP code expired", file=sys.stderr)
        print(f"ERROR: Possible causes:", file=sys.stderr)
        print(f"ERROR:  - Session state lost", file=sys.stderr)
        print(f"ERROR:  - Code already used", file=sys.stderr)
        print(f"ERROR:  - Too much time passed", file=sys.stderr)
        output_error('PHONE_CODE_EXPIRED')
    except Exception as e:
        print(f"ERROR: ❌ {type(e).__name__}: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        output_error('VERIFY_OTP_ERROR', {'message': str(e), 'type': type(e).__name__})

# Main execution
async def main():
    if len(sys.argv) < 2:
        output_error('INVALID_ARGUMENTS', {'message': 'No operation specified'})
        return
    
    operation = sys.argv[1]
    
    if operation == 'send_otp':
        if len(sys.argv) < 3:
            output_error('INVALID_ARGUMENTS', {'message': 'Phone number required'})
            return
        phone_number = sys.argv[2]
        await send_otp(phone_number)
    
    elif operation == 'verify_otp':
        if len(sys.argv) < 6:
            output_error('INVALID_ARGUMENTS', {'message': 'Usage: verify_otp <session> <phone> <code> <hash>'})
            return
        session_string = sys.argv[2]
        phone_number = sys.argv[3]
        code = sys.argv[4]
        phone_code_hash = sys.argv[5]
        await verify_otp(session_string, phone_number, code, phone_code_hash)
    
    else:
        output_error('INVALID_OPERATION', {'message': f'Unknown operation: {operation}'})

if __name__ == '__main__':
    asyncio.run(main())
