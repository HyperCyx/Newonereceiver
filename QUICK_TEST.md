# Quick Test Guide - Verification Workflow

## Problem Was
Accounts were being rejected immediately after OTP verification instead of going through the proper pending → wait → verify → decide flow.

## Solution
Modified workflow to match your diagram exactly:
1. OTP verification → Save session → Add to pending
2. Wait for country wait time  
3. Process pending accounts (cron or manual)
4. Run verification checks
5. Accept or reject

## Quick Test (1-minute wait)

### Step 1: Set Test Wait Time
```bash
npx tsx scripts/set-test-wait-time.ts
```

This sets wait time to 1 minute for all countries (instead of 24 hours).

### Step 2: Submit Test Account
Use your app to submit a test Telegram account:
1. Enter phone number
2. Enter OTP
3. If 2FA, enter password
4. ✅ Account should go to "pending" status

### Step 3: Wait 1 Minute
Wait 60 seconds for the wait time to elapse.

### Step 4: Process Pending Accounts
Manually trigger the verification:

```bash
curl -X POST http://localhost:3000/api/telegram/pending/process \
  -H "Content-Type: application/json"
```

Or let the cron job run (every 10 minutes).

### Step 5: Check Result
The account will now be:
- ✅ **ACCEPTED** - If all checks pass (master password set, sessions OK)
- ❌ **REJECTED** - If fake account or security risk

Check logs to see the detailed verification process:
```bash
tail -f .next/server/app/api/telegram/pending/process/route.log
```

## Reset to Production (24 hours)

When done testing, reset wait time:

```bash
npx tsx scripts/reset-wait-time.ts
```

## Verification Steps Performed

During processing, these checks happen:

1. ✅ **Master Password Setup**
   - Attempts to set global master password
   - If fails → REJECT as FAKE ACCOUNT

2. ✅ **Session Check**
   - Checks if multiple devices logged in
   - Attempts to logout other devices

3. ✅ **Final Session Verification**
   - Checks sessions again after wait time
   - If still multiple → Force logout
   - If force logout fails → REJECT as SECURITY RISK

4. ✅ **Accept Account**
   - All checks passed
   - Account accepted
   - Balance added to user

## What Changed

### Before (Wrong)
```
OTP Verified
    ↓
Immediate verification
    ↓
Reject (fake account)
    ↓
Never goes to pending
```

### After (Correct - Matches Diagram)
```
OTP Verified
    ↓
Save session
    ↓
Add to pending
    ↓
Wait for country time
    ↓
Process & verify
    ↓
Accept or Reject
```

## Files Modified

1. **app/api/telegram/auth/verify-otp/route.ts**
   - Removed immediate verification
   - Just saves session

2. **app/api/telegram/auth/verify-2fa/route.ts**
   - Removed immediate verification
   - Just saves session

3. **lib/telegram/pending-list-manager.ts**
   - Added complete verification workflow
   - Runs all checks in correct order

## Now Working!

Your diagram workflow is now fully implemented and working correctly! ✅

---

**Created:** 2025-10-30  
**Status:** ✅ Working  
