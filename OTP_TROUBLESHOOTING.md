# Telegram OTP Troubleshooting Guide

## Issue: OTP Not Being Received

### Problem Description
- User is taken to OTP page
- No error is shown
- OTP is not received on Telegram app

---

## Updated Code with Enhanced Logging

I've added detailed logging to help diagnose the issue:

### Changes Made:

1. **Enhanced Logging in `lib/telegram/auth.ts`**
   - Added step-by-step console logs
   - Shows connection status
   - Displays code type (SMS, call, flash call)
   - Shows detailed error messages

2. **Enhanced Logging in `app/api/telegram/auth/send-otp/route.ts`**
   - Logs phone number and country
   - Shows success/failure status
   - Displays code type
   - Returns more detailed response

3. **Better Error Messages**
   - PHONE_NUMBER_INVALID
   - PHONE_NUMBER_BANNED
   - PHONE_NUMBER_FLOOD (rate limit)
   - API_ID_INVALID

---

## How to Test

### Method 1: Via Browser Console

1. Open your app in browser
2. Open Developer Tools (F12)
3. Go to Console tab
4. Try to send OTP
5. Check console for detailed logs

### Method 2: Via Test Script

```bash
# Test with a real phone number
npx tsx scripts/test-telegram-otp.ts +1234567890
```

This will show detailed output of the OTP sending process.

### Method 3: Check Server Logs

```bash
# Watch server logs
tail -f /tmp/dev-server.log | grep -E "SendOTP|TelegramAuth"
```

---

## Common Issues and Solutions

### 1. Invalid Phone Number Format

**Symptom:** Error about invalid phone number

**Solution:** 
- Ensure phone starts with `+`
- Include country code: `+1234567890`
- No spaces or dashes: ❌ `+1 234-567-890` ✅ `+1234567890`

### 2. API Credentials Invalid

**Symptom:** API_ID_INVALID error

**Current credentials in `.env.local`:**
```
API_ID=23404078
API_HASH=6f05053d7edb7a3aa89049bd934922d1
```

**Solution:**
- Verify these credentials are valid
- Get new credentials from https://my.telegram.org
- Update `.env.local` with correct values
- Restart the server

### 3. Rate Limiting (PHONE_NUMBER_FLOOD)

**Symptom:** "Too many attempts" error

**Solution:**
- Wait 24 hours before trying again
- Use a different phone number for testing
- Contact Telegram support if persistent

### 4. Phone Number Banned

**Symptom:** PHONE_NUMBER_BANNED error

**Solution:**
- Phone number is restricted by Telegram
- Try a different phone number
- Contact Telegram support

### 5. Network/Connection Issues

**Symptom:** Timeout or connection errors

**Solution:**
- Check internet connection
- Verify Telegram API is accessible
- Check firewall settings
- Try again in a few minutes

### 6. Code Type Issues

**Note:** Telegram can send codes via:
- **SMS** (sentCodeTypeSms)
- **Phone Call** (sentCodeTypeCall)
- **Flash Call** (sentCodeTypeFlashCall)
- **Telegram App** (sentCodeTypeApp)

Check the logs to see which method Telegram used.

---

## Debugging Steps

### Step 1: Check Logs

Look for these log messages:

```
[TelegramAuth] Starting OTP send process...
[TelegramAuth] API ID: 23404078
[TelegramAuth] Phone number: +1234567890
[TelegramAuth] Connecting to Telegram...
[TelegramAuth] Connected successfully!
[TelegramAuth] Sending verification code...
[TelegramAuth] Code sent successfully!
[TelegramAuth] Code type: sentCodeTypeSms
```

### Step 2: Verify Phone Number

- Must include country code
- Must start with +
- Must be a valid Telegram number

### Step 3: Check API Credentials

Run this to verify:
```bash
grep -E "API_ID|API_HASH" /workspace/.env.local
```

Should show:
```
API_ID=23404078
API_HASH=6f05053d7edb7a3aa89049bd934922d1
```

### Step 4: Test Directly

```bash
# Direct test (replace with your number)
curl -X POST http://localhost:3000/api/telegram/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+1234567890","countryCode":"+1"}'
```

### Step 5: Check Response

Successful response:
```json
{
  "success": true,
  "phoneCodeHash": "abc123...",
  "sessionString": "session_data...",
  "codeType": "sentCodeTypeSms",
  "message": "OTP sent successfully via SMS. Check your Telegram app."
}
```

Error response:
```json
{
  "success": false,
  "error": "Detailed error message here"
}
```

---

## Quick Fix Checklist

- [ ] Phone number has country code (+1234567890)
- [ ] No spaces or special characters in phone number
- [ ] API credentials are correct in `.env.local`
- [ ] Server is running and accessible
- [ ] Check browser console for errors
- [ ] Check server logs for detailed messages
- [ ] Wait 1-2 minutes for code to arrive
- [ ] Check Telegram app notifications
- [ ] Check SMS if not received in app
- [ ] Try with a different phone number

---

## Testing Recommendations

1. **Use a test phone number** that you control
2. **Enable verbose logging** to see all steps
3. **Monitor both browser console and server logs**
4. **Wait 1-2 minutes** for code delivery
5. **Check spam/blocked messages** in Telegram

---

## If Still Not Working

### Get More Information:

1. **Check what's happening:**
   ```bash
   # Run test script
   npx tsx scripts/test-telegram-otp.ts +YOUR_PHONE
   ```

2. **Enable debug mode:**
   - Add `console.log` statements in your frontend code
   - Check Network tab in browser DevTools
   - Verify request is being sent correctly

3. **Verify Telegram API:**
   - Test credentials at https://my.telegram.org
   - Try creating a new API ID/Hash
   - Ensure IP is not blocked

---

## Contact Support

If issue persists, provide:
- Server logs (last 50 lines)
- Browser console logs
- Phone number format you're using (hide last 4 digits)
- Error message shown
- Test script output

---

**Last Updated:** 2025-10-30
**Status:** Enhanced with detailed logging
