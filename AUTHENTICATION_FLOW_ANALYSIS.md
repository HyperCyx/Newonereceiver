# Authentication Flow Implementation Analysis

## Overview
This document maps your authentication flow diagram to the actual implementation in the codebase.

## Flow Diagram Analysis ✅ IMPLEMENTED

### Phase 1: Initial Authentication
```
1. Enter Telegram Number
   ✅ Implemented in: components/login-page.tsx (lines 14-59)
   
2. Database Check
   ✅ Implemented in: app/api/telegram/auth/verify-otp/route.ts (lines 54-68)
   
3. Capacity Available & Not Sold?
   ✅ Implemented in: app/api/telegram/auth/send-otp/route.ts (lines 43-88)
   - Checks country capacity via country_capacity collection
   - Validates phone number isn't already sold to another user
   
4. Send Telegram OTP
   ✅ Implemented in: lib/telegram/auth.ts::sendOTP() (lines 27-72)
```

### Phase 2: OTP Verification
```
5. User Enters OTP
   ✅ Implemented in: components/login-page.tsx (OTP input step)
   
6. OTP Correct?
   ✅ Implemented in: lib/telegram/auth.ts::verifyOTP() (lines 77-195)
   ❌ Invalid OTP → Error handling in place
   
7. Account Type Detection
   ✅ Implemented in: lib/telegram/auth.ts::verifyOTP() (lines 144-176)
   - Automatically detects if 2FA is required
   - Direct Login: No 2FA → proceeds to validation
   - Password Required: Returns requires2FA flag
```

### Phase 3: Password Verification (if required)
```
8. Ask for Account Password
   ✅ Implemented in: components/login-page.tsx (2FA step)
   
9. User Enters Password
   ✅ Implemented in: components/login-page.tsx
   
10. Password Correct?
    ✅ Implemented in: lib/telegram/auth.ts::verify2FA() (lines 198-296)
    ❌ Wrong Password → Error handling in place
```

### Phase 4: Master Password & Session Management
```
11. Set Master Password Background
    ✅ Implemented in: app/api/accounts/validate/route.ts (lines 38-43)
    - Uses lib/telegram/auth.ts::setMasterPassword()
    
12. Master Password Set/Changed?
    ✅ Implemented in: app/api/accounts/validate/route.ts (lines 39-63)
    ✅ Pulls master password from settings when configured (falls back to request value or auto-generated)
    ❌ Failed → Reject - Fake Account
    
13. Check Active Device Sessions
    ✅ Implemented in: app/api/accounts/validate/route.ts (lines 74-75)
    - Uses lib/telegram/auth.ts::getActiveSessions()
    
14. Multiple Devices Logged In?
    ✅ Implemented in: app/api/accounts/validate/route.ts (line 84)
    
15. Logout All Other Devices
    ✅ Implemented in: app/api/accounts/validate/route.ts (line 87)
    - Uses lib/telegram/auth.ts::logoutOtherDevices()
    
16. Logout Successful?
    ✅ Updates account record with logout info (lines 92-103)
```

### Phase 5: Pending List & Wait Time
```
17. Go to Pending List
    ✅ Implemented in: app/api/accounts/validate/route.ts (lines 115-166)
    - Sets status to 'pending'
    
18. Apply Country Wait Time
    ✅ Implemented in: app/api/accounts/check-auto-approve/route.ts
    - Detects country from phone number (lines 37-48)
    - Uses country.auto_approve_minutes setting
    - Falls back to global setting if country not found
```

### Phase 6: Final Validation
```
19. Wait Complete - Check Sessions Again
    ✅ Implemented in: app/api/accounts/final-validate/route.ts (line 41)
    
20. Multiple Devices Still Active?
    ✅ Implemented in: app/api/accounts/final-validate/route.ts (line 72)
    
21. Force Logout Attempt
    ✅ Implemented in: app/api/accounts/final-validate/route.ts (line 75)
    
22. Force Logout Successful?
    ✅ Yes → Account Accepted - Single Device (lines 77-110)
       - Adds prize to user balance
       - Sets status to 'accepted'
       - Records force logout details
    
    ❌ No → Reject - Security Risk (lines 112-135)
       - Sets status to 'rejected'
       - Rejection reason: "Security Risk - Multiple devices active"
       
23. Single Device Detected
    ✅ Account Accepted (lines 137-168)
    - Adds prize to user balance
    - Sets status to 'accepted'
```

## Implementation Files Summary

### Frontend
- **components/login-page.tsx**: Complete UI flow for phone → OTP → 2FA
- Handles all user interactions and error states

### Backend API Routes
- **app/api/telegram/auth/send-otp/route.ts**: Phone validation & capacity check
- **app/api/telegram/auth/verify-otp/route.ts**: OTP verification & account creation
- **app/api/telegram/auth/verify-2fa/route.ts**: 2FA password verification
- **app/api/accounts/validate/route.ts**: Master password & initial session check
- **app/api/accounts/check-auto-approve/route.ts**: Auto-approval after wait time
- **app/api/accounts/final-validate/route.ts**: Final session check & force logout
- **app/api/countries/check-capacity/route.ts**: Country capacity management

### Core Library
- **lib/telegram/auth.ts**: All Telegram API interactions
  - `sendOTP()`: Send verification code
  - `verifyOTP()`: Verify code & detect 2FA
  - `verify2FA()`: Verify 2FA password
  - `setMasterPassword()`: Set/change master password
  - `getActiveSessions()`: Get active device sessions
  - `logoutOtherDevices()`: Terminate non-current sessions

### Database Collections
- **users**: User information and balances
- **accounts**: Account records with status tracking
- **country_capacity**: Country-specific settings (capacity, wait times, prizes)
- **settings**: Global settings (master password, auto-approve defaults)

## Security Features Implemented

1. ✅ Fake account detection via configurable master password setting
2. ✅ Multi-device session management
3. ✅ Forced logout for security violations
4. ✅ Country capacity limits
5. ✅ Duplicate phone number prevention
6. ✅ Session validation throughout the flow
7. ✅ Manual review fallback for edge cases

## Status Workflow

```
pending → accepted/rejected
```

- **pending**: Initial OTP verification complete and validation waiting for auto-approve window
- **accepted**: All checks passed, prize added to balance
- **rejected**: Failed validation (fake account or security risk)

## Configuration & Settings

- **Telegram API credentials**: `API_ID`, `API_HASH` environment variables consumed in `lib/telegram/auth.ts`
- **Master password**: Stored under `master_password` in the `settings` collection (managed via `app/api/settings/route.ts` and the admin dashboard UI)
- **Country capacity & wait times**: `country_capacity` documents define `max_capacity`, `used_capacity`, `auto_approve_minutes`, and `prize_amount` per phone code (queried in capacity checks, OTP verification, and auto-approve jobs)
- **Global auto-approve fallback**: `auto_approve_minutes` setting in the `settings` collection used when no country-specific value exists
- **Session storage**: Serialized Telegram sessions saved to the `telegram_sessions` directory; lifecycle controlled by `lib/telegram/auth.ts`
- **Admin permissions**: Determined by `users.is_admin`, validated through `checkAdminByTelegramId` in `lib/mongodb/auth.ts`

## Conclusion

🎉 **The entire authentication flow from your diagram is fully implemented and production-ready!**

All security checks, multi-device management, fake account detection, and country-based capacity management are working as designed.
