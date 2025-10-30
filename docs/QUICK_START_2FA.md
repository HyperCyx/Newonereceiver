# Quick Start: Telegram 2FA Automation

This guide will help you get started with the automated Telegram 2FA system.

## What This Feature Does

After a user logs into your system with their Telegram account:
1. 🔐 **Automatically sets** a secure 2FA password on their Telegram account
2. ✅ **Validates** the password was set correctly
3. 🎯 **Accepts or Rejects** the account based on validation results
4. 📊 **Displays status** in a beautiful UI

## For Developers

### Quick Integration

The automation is **already integrated** into the login flow. No additional code needed!

When a user logs in via `/api/telegram/auth/verify-2fa`, the system:
- Automatically calls `/api/accounts/auto-setup-2fa`
- Sets and validates 2FA
- Returns acceptance status

### Display Account Status

Use the `AccountStatusDetails` component to show account status:

```tsx
import { AccountStatusDetails } from '@/components/account-status-details'

<AccountStatusDetails 
  phoneNumber="+1234567890"
  telegramId={123456789}
  countryFlag="🇺🇸"
/>
```

Or link to the status page:
```
/account-status?phone=+1234567890&telegramId=123456789
```

### Run Validation Script

Validate all pending accounts:

```bash
npm run validate-accounts
```

## For Admins

### Check Account Status

1. **Via API:**
```bash
curl -X POST http://localhost:3000/api/accounts/details \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "telegramId": 123456789
  }'
```

2. **Via UI:**
Visit: `http://localhost:3000/account-status?phone=+1234567890&telegramId=123456789`

### Understanding Status Fields

#### Acceptance Status
- ✅ **Accepted**: Account validated and approved
- ❌ **Rejected**: Account failed validation (frozen)
- ⏳ **Pending**: Awaiting validation

#### Limit Status
- ✅ **Free**: Account has temporary limits (normal)
- ❌ **Frozen**: Account is frozen (failed validation)
- ✅ **Unlimited**: No limits

#### Validation Status
- ✅ **Validated**: 2FA password verified successfully
- ❌ **Failed**: 2FA password cannot be verified
- ⏳ **Pending**: Validation not yet performed

### Common Rejection Reasons

1. **"The account's 2FA password has been changed and cannot be verified"**
   - The user changed the 2FA password after we set it
   - Security measure to prevent account tampering

2. **"No 2FA password set"**
   - System couldn't set 2FA on the account
   - Telegram account may have restrictions

3. **"Failed to set 2FA password"**
   - Technical error during 2FA setup
   - Session may be invalid

## For End Users

### What Happens When I Login?

1. You enter your phone number
2. You receive and enter an OTP code
3. If your account has 2FA, you enter your password
4. **System automatically secures your account:**
   - Sets a new 2FA password
   - Validates it works
5. You see your account status:
   - ✅ Accepted: Your account is ready!
   - ❌ Rejected: There was an issue (contact support)

### Why Was My Account Rejected?

Your account is rejected and marked "frozen" if:
- The system couldn't set up 2FA security
- The 2FA password was changed after submission
- There was a security validation failure

**This is a security measure** to ensure all accounts are properly secured.

### How to View My Account Status?

Click on your phone number in the account list, or visit the account status page.

## API Reference

### POST /api/accounts/auto-setup-2fa
Automatically set up and validate 2FA (called automatically after login)

**Request:**
```json
{
  "phoneNumber": "+1234567890",
  "telegramId": 123456789,
  "currentPassword": "existing-password-if-any"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Account validated and accepted successfully",
  "validation_status": "validated",
  "acceptance_status": "accepted",
  "has_2fa": true
}
```

**Failure Response:**
```json
{
  "success": false,
  "error": "2FA_VALIDATION_FAILED",
  "message": "Account rejected - 2FA password cannot be verified",
  "validation_status": "failed",
  "acceptance_status": "rejected"
}
```

### POST /api/accounts/details
Get account status details

**Request:**
```json
{
  "phoneNumber": "+1234567890",
  "telegramId": 123456789
}
```

**Response:**
```json
{
  "success": true,
  "account": {
    "phone_number": "+1234567890",
    "balance": 10.50,
    "acceptance_status": "accepted",
    "acceptance_message": "Account has been accepted and verified",
    "limit_status": "free",
    "limit_message": "The account is temporary limited...",
    "validation_status": "validated",
    "validation_message": "Account 2FA has been verified successfully",
    "created_at": "2025-10-30T12:00:00Z",
    "validated_at": "2025-10-30T12:00:30Z"
  }
}
```

### POST /api/telegram/auth/set-2fa
Manually set 2FA password (optional - auto-setup is recommended)

**Request:**
```json
{
  "phoneNumber": "+1234567890",
  "newPassword": "new-secure-password",
  "currentPassword": "existing-password",
  "telegramId": 123456789
}
```

### POST /api/accounts/validate
Manually validate 2FA password (optional - auto-setup includes validation)

**Request:**
```json
{
  "phoneNumber": "+1234567890",
  "password": "2fa-password",
  "telegramId": 123456789
}
```

## Troubleshooting

### Account Always Gets Rejected

**Check:**
1. Is the Telegram session valid?
   - Look in `telegram_sessions/` folder
   - Session file should exist for the phone number

2. Are there any error logs?
   - Check console logs for `[AutoSetup2FA]` entries
   - Look for specific error messages

3. Is Telegram API responding?
   - Rate limiting may cause issues
   - Add delays between operations

### Validation Script Not Working

**Solutions:**
1. Ensure session files exist in `telegram_sessions/`
2. Check database connection
3. Verify accounts have `twofa_password` field set
4. Check for Telegram API rate limiting

### UI Not Showing Correct Status

**Solutions:**
1. Refresh the page
2. Check API is returning data: `curl -X POST http://localhost:3000/api/accounts/details ...`
3. Verify `telegramId` matches user's actual Telegram ID
4. Check browser console for errors

## Environment Variables

Ensure these are set:

```bash
# Telegram API (required for 2FA operations)
API_ID=your_api_id
API_HASH=your_api_hash

# MongoDB (required for status storage)
MONGODB_URI=your_mongodb_connection_string

# Web App URL (required for internal API calls)
NEXT_PUBLIC_WEB_APP_URL=http://localhost:3000
```

## Testing Checklist

- [ ] User can login with phone number + OTP
- [ ] If account has 2FA, user can enter password
- [ ] After login, auto-setup runs (check logs)
- [ ] Account status is updated in database
- [ ] Status page displays correct information
- [ ] Rejected accounts show "frozen" status
- [ ] Accepted accounts show "validated" status
- [ ] Icons display correctly (✓ green, ✗ red)

## Security Notes

🔒 **Password Storage**: 2FA passwords are stored in the database for validation purposes. Ensure your MongoDB connection is secure.

🔒 **Session Files**: Telegram session files contain sensitive authentication data. Protect the `telegram_sessions/` directory.

🔒 **Auto-Rejection**: Accounts that fail validation are automatically rejected to prevent security issues.

## Support

For issues or questions:
1. Check logs for `[AutoSetup2FA]`, `[ValidateAccount]`, or `[Set2FA]` entries
2. Review full documentation in `/docs/2FA_AUTOMATION.md`
3. Run validation script with verbose logging
4. Contact development team with error logs

---

**Ready to use!** The 2FA automation is active and will process all new logins automatically. 🚀
