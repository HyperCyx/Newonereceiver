"""
Pyrogram-based Telegram operations - FIXED VERSION
All functions output JSON for Node.js integration
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
    BadRequest,
    RPCError
)

# Get API credentials with proper type conversion
try:
    API_ID_STR = os.getenv('TELEGRAM_API_ID') or os.getenv('API_ID') or '23404078'
    API_ID = int(API_ID_STR)
except (ValueError, TypeError) as e:
    print(f"ERROR: Could not convert API_ID to integer: {e}", file=sys.stderr)
    API_ID = 23404078

API_HASH = os.getenv('TELEGRAM_API_HASH') or os.getenv('API_HASH') or '6f05053d7edb7a3aa89049bd934922d1'
SESSIONS_DIR = os.path.abspath(os.getenv('TELEGRAM_SESSIONS_DIR', './telegram_sessions'))

# Debug output
print(f"DEBUG: API_ID={API_ID} (type: {type(API_ID).__name__})", file=sys.stderr)
print(f"DEBUG: API_HASH length={len(API_HASH)}", file=sys.stderr)
print(f"DEBUG: SESSIONS_DIR={SESSIONS_DIR}", file=sys.stderr)

def output_json(data):
    """Output JSON to stdout"""
    print(json.dumps(data, ensure_ascii=False))
    sys.stdout.flush()

def output_error(error_message, details=None):
    """Output error as JSON"""
    error_data = {
        'success': False,
        'error': error_message
    }
    if details:
        error_data['details'] = details
    output_json(error_data)

async def send_otp(phone_number):
    """
    Send OTP to phone number and save session
    """
    try:
        # Ensure sessions directory exists
        os.makedirs(SESSIONS_DIR, exist_ok=True)
        
        # Create session file path
        clean_phone = phone_number.replace('+', '').replace(' ', '').replace('-', '')
        session_name = os.path.join(SESSIONS_DIR, clean_phone)
        
        print(f"DEBUG: Creating client with API_ID={API_ID} (type={type(API_ID)})", file=sys.stderr)
        print(f"DEBUG: Session name: {session_name}", file=sys.stderr)
        
        # Create Pyrogram client with proper integer API_ID
        # Use file-based session for initial connection
        client = Client(
            name=session_name,
            api_id=API_ID,  # Must be integer
            api_hash=API_HASH,  # Must be string
            workdir=SESSIONS_DIR
        )
        
        print(f"DEBUG: Client created, connecting...", file=sys.stderr)
        await client.connect()
        
        print(f"DEBUG: Sending code to {phone_number}...", file=sys.stderr)
        # Send code
        sent_code = await client.send_code(phone_number)
        
        await client.disconnect()
        
        print(f"DEBUG: Code sent successfully", file=sys.stderr)
        
        # Pyrogram saves session automatically to {session_name}.session
        # Return a placeholder session identifier
        session_identifier = clean_phone
        
        print(f"DEBUG: Session identifier: {session_identifier}", file=sys.stderr)
        
        output_json({
            'success': True,
            'phone_code_hash': sent_code.phone_code_hash,
            'session_string': session_identifier,  # Use phone number as identifier
            'session_file': f"{clean_phone}.session"
        })
        
    except FloodWait as e:
        print(f"ERROR: FloodWait {e.value} seconds", file=sys.stderr)
        output_error('FLOOD_WAIT', {'wait_seconds': e.value})
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        output_error('SEND_OTP_ERROR', {'message': str(e), 'type': type(e).__name__})

async def verify_otp(session_string, phone_number, code, phone_code_hash):
    """
    Verify OTP code
    session_string is actually the phone number identifier from send_otp
    """
    try:
        clean_phone = phone_number.replace('+', '').replace(' ', '').replace('-', '')
        # Use the same session file created in send_otp
        session_name = os.path.join(SESSIONS_DIR, clean_phone)
        
        client = Client(
            name=session_name,
            api_id=API_ID,
            api_hash=API_HASH,
            workdir=SESSIONS_DIR
        )
        
        await client.connect()
        
        try:
            # Try to sign in with code
            signed_in = await client.sign_in(phone_number, phone_code_hash, code)
            
            # Get user info
            me = await client.get_me()
            
            # Export updated session
            new_session_string = await client.export_session_string()
            
            await client.disconnect()
            
            # Save updated session
            session_path = os.path.join(SESSIONS_DIR, f"{clean_phone}.session")
            with open(session_path, 'w') as f:
                f.write(new_session_string)
            
            output_json({
                'success': True,
                'needs_2fa': False,
                'user_id': me.id,
                'session_string': new_session_string
            })
            
        except SessionPasswordNeeded:
            # 2FA is enabled, need password
            new_session_string = await client.export_session_string()
            
            await client.disconnect()
            
            # Save session even though 2FA needed
            session_path = os.path.join(SESSIONS_DIR, f"{clean_phone}.session")
            with open(session_path, 'w') as f:
                f.write(new_session_string)
            
            output_json({
                'success': True,
                'needs_2fa': True,
                'session_string': new_session_string
            })
            
    except PhoneCodeInvalid:
        output_error('PHONE_CODE_INVALID')
    except PhoneCodeExpired:
        output_error('PHONE_CODE_EXPIRED')
    except Exception as e:
        output_error('VERIFY_OTP_ERROR', {'message': str(e), 'type': type(e).__name__})

async def verify_2fa(session_string, phone_number, password):
    """
    Verify 2FA password
    """
    try:
        clean_phone = phone_number.replace('+', '').replace(' ', '').replace('-', '')
        session_name = os.path.join(SESSIONS_DIR, f"2fa_{clean_phone}")
        
        client = Client(
            name=session_name,
            api_id=API_ID,
            api_hash=API_HASH,
            session_string=session_string,
            in_memory=True
        )
        
        await client.connect()
        
        # Check password
        await client.check_password(password)
        
        # Get user info
        me = await client.get_me()
        
        # Export updated session
        new_session_string = await client.export_session_string()
        
        await client.disconnect()
        
        # Save updated session
        session_path = os.path.join(SESSIONS_DIR, f"{clean_phone}.session")
        with open(session_path, 'w') as f:
            f.write(new_session_string)
        
        output_json({
            'success': True,
            'user_id': me.id,
            'session_string': new_session_string
        })
        
    except PasswordHashInvalid:
        output_error('PASSWORD_HASH_INVALID')
    except Exception as e:
        output_error('VERIFY_2FA_ERROR', {'message': str(e), 'type': type(e).__name__})

async def set_password(session_string, phone_number, new_password, current_password=None):
    """
    Set or change cloud password (2FA)
    """
    try:
        clean_phone = phone_number.replace('+', '').replace(' ', '').replace('-', '')
        session_name = os.path.join(SESSIONS_DIR, f"setpass_{clean_phone}")
        
        client = Client(
            name=session_name,
            api_id=API_ID,
            api_hash=API_HASH,
            session_string=session_string,
            in_memory=True
        )
        
        await client.connect()
        
        # Determine if password exists
        has_existing_password = bool(current_password)
        
        if has_existing_password:
            # Change existing password
            await client.change_cloud_password(current_password, new_password)
        else:
            # Enable new password
            await client.enable_cloud_password(new_password, hint="Master Password")
        
        # Export updated session
        new_session_string = await client.export_session_string()
        
        await client.disconnect()
        
        # Save updated session
        session_path = os.path.join(SESSIONS_DIR, f"{clean_phone}.session")
        with open(session_path, 'w') as f:
            f.write(new_session_string)
        
        output_json({
            'success': True,
            'has_password': True,
            'session_string': new_session_string
        })
        
    except PasswordHashInvalid:
        output_error('PASSWORD_HASH_INVALID')
    except Exception as e:
        output_error('SET_PASSWORD_ERROR', {'message': str(e), 'type': type(e).__name__})

async def get_sessions(session_string, phone_number):
    """
    Get active sessions
    """
    try:
        clean_phone = phone_number.replace('+', '').replace(' ', '').replace('-', '')
        session_name = os.path.join(SESSIONS_DIR, f"sessions_{clean_phone}")
        
        client = Client(
            name=session_name,
            api_id=API_ID,
            api_hash=API_HASH,
            session_string=session_string,
            in_memory=True
        )
        
        await client.connect()
        
        # Get active sessions
        authorizations = await client.get_active_sessions()
        
        current_session = None
        other_sessions = []
        
        for auth in authorizations:
            session_info = {
                'hash': str(auth.hash),
                'device': auth.device_model,
                'platform': auth.platform,
                'api_id': auth.api_id,
                'app_name': auth.app_name,
                'app_version': auth.app_version,
                'date_created': str(auth.date_created),
                'date_active': str(auth.date_active),
                'ip': auth.ip,
                'country': auth.country,
                'region': auth.region
            }
            
            if auth.current:
                current_session = session_info
            else:
                other_sessions.append(session_info)
        
        await client.disconnect()
        
        output_json({
            'success': True,
            'current_session': current_session,
            'other_sessions': other_sessions,
            'total_count': len(other_sessions) + (1 if current_session else 0)
        })
        
    except Exception as e:
        output_error('GET_SESSIONS_ERROR', {'message': str(e), 'type': type(e).__name__})

async def logout_devices(session_string, phone_number):
    """
    Logout all other devices
    """
    try:
        clean_phone = phone_number.replace('+', '').replace(' ', '').replace('-', '')
        session_name = os.path.join(SESSIONS_DIR, f"logout_{clean_phone}")
        
        client = Client(
            name=session_name,
            api_id=API_ID,
            api_hash=API_HASH,
            session_string=session_string,
            in_memory=True
        )
        
        await client.connect()
        
        # Get sessions before logout
        authorizations_before = await client.get_active_sessions()
        other_sessions_before = [auth for auth in authorizations_before if not auth.current]
        
        # Terminate all other sessions
        if other_sessions_before:
            await client.terminate_sessions()
        
        # Get sessions after logout to verify
        authorizations_after = await client.get_active_sessions()
        other_sessions_after = [auth for auth in authorizations_after if not auth.current]
        
        terminated_count = len(other_sessions_before) - len(other_sessions_after)
        
        await client.disconnect()
        
        output_json({
            'success': True,
            'terminated_count': terminated_count,
            'sessions_before': len(other_sessions_before),
            'sessions_after': len(other_sessions_after)
        })
        
    except Exception as e:
        output_error('LOGOUT_DEVICES_ERROR', {'message': str(e), 'type': type(e).__name__})

async def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        output_error('INVALID_ARGUMENTS', {'message': 'Usage: python pyrogram_operations.py <operation> [args...]'})
        return
    
    operation = sys.argv[1]
    
    # Validate API credentials
    if not isinstance(API_ID, int) or API_ID == 0:
        output_error('MISSING_API_ID', {
            'message': 'TELEGRAM_API_ID must be a valid integer',
            'api_id': str(API_ID),
            'api_id_type': str(type(API_ID).__name__)
        })
        return
    
    if not API_HASH or len(API_HASH) < 10:
        output_error('MISSING_API_HASH', {
            'message': 'TELEGRAM_API_HASH environment variable not set or invalid',
            'api_hash_length': len(API_HASH) if API_HASH else 0
        })
        return
    
    try:
        if operation == 'send_otp':
            if len(sys.argv) < 3:
                output_error('INVALID_ARGUMENTS', {'message': 'Usage: send_otp <phone_number>'})
                return
            phone_number = sys.argv[2]
            await send_otp(phone_number)
            
        elif operation == 'verify_otp':
            if len(sys.argv) < 6:
                output_error('INVALID_ARGUMENTS', {'message': 'Usage: verify_otp <session_string> <phone_number> <code> <phone_code_hash>'})
                return
            session_string = sys.argv[2]
            phone_number = sys.argv[3]
            code = sys.argv[4]
            phone_code_hash = sys.argv[5]
            await verify_otp(session_string, phone_number, code, phone_code_hash)
            
        elif operation == 'verify_2fa':
            if len(sys.argv) < 5:
                output_error('INVALID_ARGUMENTS', {'message': 'Usage: verify_2fa <session_string> <phone_number> <password>'})
                return
            session_string = sys.argv[2]
            phone_number = sys.argv[3]
            password = sys.argv[4]
            await verify_2fa(session_string, phone_number, password)
            
        elif operation == 'set_password':
            if len(sys.argv) < 5:
                output_error('INVALID_ARGUMENTS', {'message': 'Usage: set_password <session_string> <phone_number> <new_password> [current_password]'})
                return
            session_string = sys.argv[2]
            phone_number = sys.argv[3]
            new_password = sys.argv[4]
            current_password = sys.argv[5] if len(sys.argv) > 5 else None
            await set_password(session_string, phone_number, new_password, current_password)
            
        elif operation == 'get_sessions':
            if len(sys.argv) < 4:
                output_error('INVALID_ARGUMENTS', {'message': 'Usage: get_sessions <session_string> <phone_number>'})
                return
            session_string = sys.argv[2]
            phone_number = sys.argv[3]
            await get_sessions(session_string, phone_number)
            
        elif operation == 'logout_devices':
            if len(sys.argv) < 4:
                output_error('INVALID_ARGUMENTS', {'message': 'Usage: logout_devices <session_string> <phone_number>'})
                return
            session_string = sys.argv[2]
            phone_number = sys.argv[3]
            await logout_devices(session_string, phone_number)
            
        else:
            output_error('UNKNOWN_OPERATION', {'message': f'Unknown operation: {operation}'})
            
    except Exception as e:
        print(f"FATAL ERROR: {type(e).__name__}: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        output_error('OPERATION_ERROR', {'message': str(e), 'operation': operation, 'type': type(e).__name__})

if __name__ == '__main__':
    asyncio.run(main())
