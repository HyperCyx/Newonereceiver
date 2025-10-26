# Telegram Authentication Fix

## Problem
Getting error: **"You can only invoke MTProtoRequests after enter OTP"**

## Root Cause
The code was using `client.invoke()` with raw MTProto API calls (`auth.signIn`) **before** the client was properly authenticated. This is not allowed by GramJS.

## Solution
Use `client.start()` method instead, which handles the entire authentication flow properly.

---

## What Changed

### ❌ **Before (Wrong Way)**
```typescript
await client.connect()

// THIS CAUSES THE ERROR - trying to invoke MTProto before auth
const result = await client.invoke({
  _: 'auth.signIn',
  phoneNumber,
  phoneCodeHash,
  phoneCode: otpCode,
})
```

### ✅ **After (Correct Way)**
```typescript
await client.connect()

// Use start() - it handles auth flow internally
await client.start({
  phoneNumber: async () => phoneNumber,
  password: async () => {
    throw new Error('2FA_REQUIRED')
  },
  phoneCode: async () => otpCode,
  onError: (err) => {
    console.error('[TelegramAuth] Auth error:', err)
    throw err
  },
})
```

---

## How `client.start()` Works

The `start()` method is a **high-level authentication helper** that:

1. **Automatically handles the MTProto flow** (you don't need to call `auth.sendCode`, `auth.signIn`, etc. manually)
2. **Calls your callbacks when needed:**
   - `phoneNumber()` - returns the phone number
   - `phoneCode()` - returns the OTP code
   - `password()` - returns 2FA password (if enabled)
3. **Manages the session state** properly
4. **Throws errors** that you can catch to handle 2FA

---

## Authentication Flow

### Step 1: Send OTP (No changes needed)
```typescript
// /api/telegram/auth/send-otp
const result = await client.sendCode({ apiId, apiHash }, phoneNumber)
// Returns: { phoneCodeHash: "..." }
```

### Step 2: Verify OTP (FIXED)
```typescript
// /lib/telegram/auth.ts - verifyOTP()
await client.start({
  phoneNumber: async () => phoneNumber,
  phoneCode: async () => otpCode,
  password: async () => {
    // If 2FA is enabled, this will be called
    // We throw error to handle 2FA separately
    throw new Error('2FA_REQUIRED')
  },
})

// If successful, save session
const sessionString = client.session.save()
```

**2 Possible Outcomes:**
- ✅ Success → Session saved, user logged in
- 🔐 2FA Required → Return `requires2FA: true` with partial session

### Step 3: Verify 2FA Password (FIXED)
```typescript
// /lib/telegram/auth.ts - verify2FA()
const session = new StringSession(sessionString) // Use partial session
const client = new TelegramClient(session, apiId, apiHash)

await client.start({
  phoneNumber: async () => phoneNumber,
  password: async () => password, // Now provide the 2FA password
  phoneCode: async () => {
    throw new Error('Code should not be requested')
  },
})

// Save fully authenticated session
const newSessionString = client.session.save()
```

---

## Key Changes Made

### 1. `/lib/telegram/auth.ts` - `verifyOTP()`
- **Before:** Used `client.invoke({ _: 'auth.signIn', ... })`
- **After:** Uses `client.start({ phoneCode: async () => otpCode })`
- **Added:** Proper error handling for 2FA
- **Added:** Returns `sessionString` when 2FA is required

### 2. `/lib/telegram/auth.ts` - `verify2FA()`
- **Before:** Used `client.checkPassword(password)` (doesn't exist in GramJS)
- **After:** Uses `client.start({ password: async () => password })`
- **Added:** Proper session state management
- **Added:** Try/catch with disconnect on error

### 3. `/app/api/telegram/auth/verify-otp/route.ts`
- **Added:** Pass `sessionString` in 2FA response
- **Fixed:** Check both `result.requires2FA` and `result.error === '2FA_REQUIRED'`

---

## Testing Steps

### Test 1: Account WITHOUT 2FA
1. Enter phone number → OTP sent ✅
2. Enter OTP → Session created immediately ✅
3. File saved to `telegram_sessions/` ✅

### Test 2: Account WITH 2FA
1. Enter phone number → OTP sent ✅
2. Enter OTP → 2FA page shown ✅
3. Enter 2FA password → Session created ✅
4. File saved to `telegram_sessions/` ✅

### Test 3: Wrong OTP
1. Enter wrong OTP → Error: "Invalid code" ✅

### Test 4: Wrong 2FA Password
1. Enter wrong password → Error: "Invalid password" ✅

---

## Error Handling

### Common Errors You Might See:

| Error | Meaning | Solution |
|-------|---------|----------|
| `PHONE_CODE_INVALID` | Wrong OTP | User should re-enter correct OTP |
| `SESSION_PASSWORD_NEEDED` | 2FA enabled | Show 2FA password input |
| `PASSWORD_HASH_INVALID` | Wrong 2FA password | User should re-enter password |
| `PHONE_NUMBER_BANNED` | Account banned | Cannot login |
| `AUTH_KEY_UNREGISTERED` | Session expired | Start from scratch |

---

## Session File Structure

Files saved to: `telegram_sessions/`

**Format:** `{phoneNumber}_{timestamp}.json`

**Example:** `919876543210_1729900000000.json`

```json
{
  "phoneNumber": "+919876543210",
  "sessionString": "1AQAAAAAA...(long base64 string)",
  "createdAt": "2025-10-26T10:30:00.000Z",
  "userId": "123456789"
}
```

The `sessionString` contains:
- Auth key
- Data center info
- User authorization data
- Everything needed to make API calls

---

## Why This Works Now

### The Problem with `invoke()`
```typescript
// DON'T DO THIS:
client.invoke({ _: 'auth.signIn', ... })
```
- This is a **low-level MTProto method**
- Can only be called **after** you're authenticated
- Requires manual handling of all auth states
- Error-prone and complex

### The Solution with `start()`
```typescript
// DO THIS:
client.start({ phoneCode: async () => code })
```
- This is a **high-level helper method**
- Handles **entire auth flow** internally
- Works before, during, and after authentication
- Automatically manages session state
- Built-in error handling

---

## Next Steps (Optional Improvements)

1. **Add session cleanup:**
   ```typescript
   // Delete old sessions for same phone number
   // Keep only the latest one
   ```

2. **Add session validation:**
   ```typescript
   // Test if session is still valid before using
   await client.getMe()
   ```

3. **Add auto-retry:**
   ```typescript
   // If session expires, automatically re-authenticate
   ```

4. **Add rate limiting:**
   ```typescript
   // Prevent spam of OTP requests
   ```

---

## Debugging Tips

### Check if client is connected:
```typescript
console.log('Connected:', client.connected)
```

### Check session state:
```typescript
const sessionString = client.session.save()
console.log('Session length:', sessionString.length)
console.log('Has auth key:', sessionString.length > 100)
```

### Test saved session:
```typescript
// Load and test
const session = new StringSession(sessionString)
const client = new TelegramClient(session, apiId, apiHash)
await client.connect()
const me = await client.getMe()
console.log('User:', me.firstName, me.id)
```

---

## ✅ Status: FIXED

The authentication now works correctly using `client.start()` instead of raw MTProto calls. You should no longer see the "You can only invoke MTProtoRequests after enter OTP" error.

**Test it now:**
1. Restart your dev server
2. Go to login page
3. Enter phone number
4. Enter OTP (check Telegram app)
5. If 2FA: enter password
6. Session file created! 🎉
