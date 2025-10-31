# Pyrogram Testing Guide 🧪

## Pre-Testing Checklist

✅ Pyrogram 2.0.106 installed  
✅ All API endpoints migrated  
✅ Next.js server running on port 5000  
✅ Python script operational  
✅ Environment variables configured  

## Test 1: Quick Pyrogram Verification

```bash
# Test Python Pyrogram directly
python3 -c "import pyrogram; print('✅ Pyrogram working')"
```

Expected: `✅ Pyrogram working`

## Test 2: Send OTP via Script

```bash
# Replace with your test phone number
npx tsx scripts/test-pyrogram.ts +998901234567
```

**Expected Output:**
```
🧪 Testing Pyrogram Integration

📱 Test phone number: +998901234567

1️⃣ Testing Send OTP...
✅ Send OTP successful!
   - Phone code hash: xxxxx
   - Session file: 998901234567.session
   - Session string length: 350+ chars

✅ Pyrogram integration test completed!
```

## Test 3: Full Flow Through UI

### Step 1: Open Application
```
http://localhost:5000
```

### Step 2: Select Country
- Choose country from dropdown
- Verify capacity check works

### Step 3: Enter Phone Number
- Enter phone number in format: +998901234567
- Click "Continue" or "Submit"

### Step 4: Monitor Backend Logs
```bash
# In another terminal
tail -f /tmp/nextjs.log | grep -E "Pyrogram|SendOTP|VerifyOTP|Verify2FA|SetPassword|CheckSessions"
```

### Step 5: Enter OTP Code
- Receive OTP via Telegram
- Enter code in UI
- Backend calls: `pyrogramVerifyOTP`

**Expected Log:**
```
[Pyrogram] Executing: verify_otp
[VerifyOTP] ✅ OTP verified successfully
```

### Step 6: Enter 2FA Password (if required)
- If account has 2FA, enter password
- Backend calls: `pyrogramVerify2FA`

**Expected Log:**
```
[Pyrogram] Executing: verify_2fa
[Verify2FA] ✅ 2FA password verified successfully
```

### Step 7: Master Password Setup
- Backend automatically calls: `pyrogramSetPassword`

**Expected Log:**
```
[Pyrogram] Executing: set_password
[SetupPassword-Pyrogram] ✅ Master password changed successfully
```

### Step 8: Session Check
- Backend calls: `pyrogramGetSessions` + `pyrogramLogoutDevices`

**Expected Log:**
```
[Pyrogram] Executing: get_sessions
[CheckSessions-Pyrogram] Found X active session(s)
[Pyrogram] Executing: logout_devices
[CheckSessions-Pyrogram] ✅ Successfully logged out X device(s)
```

### Step 9: Verify Account Status
```bash
# Check account in database
curl http://localhost:5000/api/admin/accounts | jq '.accounts[] | select(.phone_number == "+998901234567") | {status, master_password_set, multiple_devices_detected}'
```

**Expected:**
```json
{
  "status": "pending",
  "master_password_set": true,
  "multiple_devices_detected": false
}
```

## Test 4: Direct Python Script Test

Create a test file to verify Python integration:

```bash
cd /workspace/telegram_python

# Test send_otp
python3 pyrogram_operations.py send_otp "+998901234567"
```

**Expected Output:**
```json
{
  "success": true,
  "phone_code_hash": "...",
  "session_string": "...",
  "session_file": "998901234567.session"
}
```

## Test 5: Session File Verification

```bash
# Check session file was created
ls -lh telegram_sessions/*.session

# Verify it's a valid Pyrogram session string
head -c 50 telegram_sessions/998901234567.session
```

Expected: Long base64-like string

## Test 6: Admin Panel Tests

### Check Sessions List
```
http://localhost:5000/admin
→ Sessions Tab
→ Verify sessions are listed
```

### Download Session
```
→ Click "Download" on a session
→ Verify .session file downloads
→ Check Content-Type: text/plain
```

### Download by Country
```
→ Select country dropdown
→ Click "Download Country Sessions"
→ Verify ZIP file downloads with multiple .session files
```

## Common Issues & Solutions

### Issue 1: "Module not found: pyrogram"
**Solution:**
```bash
cd /workspace/telegram_python
pip3 install -r requirements.txt
```

### Issue 2: "Session string invalid"
**Solution:**
- Delete old session file
- Restart flow from OTP step

### Issue 3: "FLOOD_WAIT error"
**Solution:**
- Wait specified seconds
- Telegram rate limiting active

### Issue 4: "Python script timeout"
**Solution:**
- Check Python path: `which python3`
- Verify environment variables loaded
- Increase timeout in python-wrapper.ts

### Issue 5: "Password change failed"
**Solution:**
- Verify current 2FA password is correct
- Check account has 2FA enabled
- Review Python script logs

## Performance Benchmarks

| Operation | Expected Time |
|-----------|--------------|
| Send OTP | 2-3 seconds |
| Verify OTP | 1-2 seconds |
| Verify 2FA | 1-2 seconds |
| Set Password | 2-3 seconds |
| Get Sessions | 1-2 seconds |
| Logout Devices | 2-3 seconds |

## Debug Commands

### Check Python Environment
```bash
python3 --version
python3 -m pip list | grep pyrogram
```

### Test Telegram API Credentials
```bash
echo "API_ID: $TELEGRAM_API_ID"
echo "API_HASH: $TELEGRAM_API_HASH"
```

### Monitor All Pyrogram Calls
```bash
# Terminal 1: Server logs
npm run dev

# Terminal 2: Python script output
tail -f /tmp/nextjs.log | grep Pyrogram
```

### Check Session Files
```bash
find telegram_sessions -name "*.session" -exec ls -lh {} \;
```

## Success Criteria

✅ Send OTP returns phone_code_hash and session_string  
✅ Verify OTP correctly identifies 2FA requirement  
✅ Verify 2FA accepts correct password  
✅ Set Password successfully changes password  
✅ Get Sessions returns current + other sessions  
✅ Logout Devices terminates other sessions  
✅ Session files created in correct format  
✅ Admin panel downloads work  
✅ Full flow completes without errors  
✅ Account reaches 'pending' status  

## Production Deployment

Once testing passes:

1. **Run Full Build:**
```bash
npm run build
```

2. **Set Production Environment:**
```bash
export NODE_ENV=production
export TELEGRAM_API_ID=your_production_id
export TELEGRAM_API_HASH=your_production_hash
```

3. **Start Production Server:**
```bash
npm start
```

4. **Monitor Production Logs:**
```bash
pm2 logs
# or
docker logs -f container_name
```

## Rollback Procedure

If critical issues found:

1. **Stop Server**
2. **Revert Imports:**
```bash
# Restore old imports in API files
git checkout HEAD~1 app/api/telegram-flow/
```

3. **Rebuild:**
```bash
npm run build
```

4. **Restart Server**

---

**Last Updated:** 2025-10-31  
**Pyrogram Version:** 2.0.106  
**Status:** ✅ Ready for Testing
