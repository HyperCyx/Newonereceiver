"""
Pyrogram-based Telegram operations for account management
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

# API credentials from environment
API_ID = os.getenv('TELEGRAM_API_ID')
API_HASH = os.getenv('TELEGRAM_API_HASH')
SESSIONS_DIR = os.getenv('TELEGRAM_SESSIONS_DIR', './telegram_sessions')

def output_json(data):
    """Output JSON to stdout"""
    print(json.dumps(data, ensure_ascii=False))

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
    Returns: {success, phone_code_hash, session_string}
    """
    try:
        session_name = f"session_{phone_number.replace('+', '')}"
        session_path = os.path.join(SESSIONS_DIR, f"{phone_number.replace('+', '')}.session")
        
        client = Client(
            session_name,
            api_id=API_ID,
            api_hash=API_HASH,
            phone_number=phone_number,
            workdir=SESSIONS_DIR
        )
        
        await client.connect()
        
        # Send code
        sent_code = await client.send_code(phone_number)
        
        # Export session string
        session_string = await client.export_session_string()
        
        await client.disconnect()
        
        # Save session string to file
        os.makedirs(SESSIONS_DIR, exist_ok=True)
        with open(session_path, 'w') as f:
            f.write(session_string)
        
        output_json({
            'success': True,
            'phone_code_hash': sent_code.phone_code_hash,
            'session_string': session_string,
            'session_file': f"{phone_number.replace('+', '')}.session"
        })
        
    except FloodWait as e:
        output_error(f'FLOOD_WAIT', {'wait_seconds': e.value})
    except Exception as e:
        output_error(f'SEND_OTP_ERROR', {'message': str(e)})

async def verify_otp(session_string, phone_number, code, phone_code_hash):
    """
    Verify OTP code
    Returns: {success, needs_2fa, user_id, session_string}
    """
    try:
        session_name = f"temp_verify_{phone_number.replace('+', '')}"
        
        client = Client(
            session_name,
            api_id=API_ID,
            api_hash=API_HASH,
            session_string=session_string,
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
            session_path = os.path.join(SESSIONS_DIR, f"{phone_number.replace('+', '')}.session")
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
            session_path = os.path.join(SESSIONS_DIR, f"{phone_number.replace('+', '')}.session")
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
        output_error('VERIFY_OTP_ERROR', {'message': str(e)})

async def verify_2fa(session_string, phone_number, password):
    """
    Verify 2FA password
    Returns: {success, user_id, session_string}
    """
    try:
        session_name = f"temp_2fa_{phone_number.replace('+', '')}"
        
        client = Client(
            session_name,
            api_id=API_ID,
            api_hash=API_HASH,
            session_string=session_string,
            workdir=SESSIONS_DIR
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
        session_path = os.path.join(SESSIONS_DIR, f"{phone_number.replace('+', '')}.session")
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
        output_error('VERIFY_2FA_ERROR', {'message': str(e)})

async def set_password(session_string, phone_number, new_password, current_password=None):
    """
    Set or change cloud password (2FA)
    Returns: {success, has_password}
    """
    try:
        session_name = f"temp_setpass_{phone_number.replace('+', '')}"
        
        client = Client(
            session_name,
            api_id=API_ID,
            api_hash=API_HASH,
            session_string=session_string,
            workdir=SESSIONS_DIR
        )
        
        await client.connect()
        
        # Try to determine if password exists by attempting to get password state
        has_existing_password = False
        try:
            # If current_password is provided, assume password exists
            if current_password:
                has_existing_password = True
        except Exception as e:
            pass
        
        if has_existing_password and current_password:
            # Change existing password
            await client.change_cloud_password(current_password, new_password)
        elif not has_existing_password:
            # Enable new password
            await client.enable_cloud_password(new_password, hint="Master Password")
        else:
            output_error('CURRENT_PASSWORD_REQUIRED')
            await client.disconnect()
            return
        
        # Export updated session
        new_session_string = await client.export_session_string()
        
        await client.disconnect()
        
        # Save updated session
        session_path = os.path.join(SESSIONS_DIR, f"{phone_number.replace('+', '')}.session")
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
        output_error('SET_PASSWORD_ERROR', {'message': str(e)})

async def get_sessions(session_string, phone_number):
    """
    Get active sessions
    Returns: {success, current_session, other_sessions, total_count}
    """
    try:
        session_name = f"temp_sessions_{phone_number.replace('+', '')}"
        
        client = Client(
            session_name,
            api_id=API_ID,
            api_hash=API_HASH,
            session_string=session_string,
            workdir=SESSIONS_DIR
        )
        
        await client.connect()
        
        # Get active sessions
        authorizations = await client.get_active_sessions()
        
        current_session = None
        other_sessions = []
        
        for auth in authorizations:
            session_info = {
                'hash': auth.hash,
                'device': auth.device_model,
                'platform': auth.platform,
                'api_id': auth.api_id,
                'app_name': auth.app_name,
                'app_version': auth.app_version,
                'date_created': auth.date_created.isoformat() if hasattr(auth.date_created, 'isoformat') else str(auth.date_created),
                'date_active': auth.date_active.isoformat() if hasattr(auth.date_active, 'isoformat') else str(auth.date_active),
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
        output_error('GET_SESSIONS_ERROR', {'message': str(e)})

async def logout_devices(session_string, phone_number):
    """
    Logout all other devices
    Returns: {success, terminated_count}
    """
    try:
        session_name = f"temp_logout_{phone_number.replace('+', '')}"
        
        client = Client(
            session_name,
            api_id=API_ID,
            api_hash=API_HASH,
            session_string=session_string,
            workdir=SESSIONS_DIR
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
        output_error('LOGOUT_DEVICES_ERROR', {'message': str(e)})

async def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        output_error('INVALID_ARGUMENTS', {'message': 'Usage: python pyrogram_operations.py <operation> [args...]'})
        return
    
    operation = sys.argv[1]
    
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
        output_error('OPERATION_ERROR', {'message': str(e), 'operation': operation})

if __name__ == '__main__':
    asyncio.run(main())
