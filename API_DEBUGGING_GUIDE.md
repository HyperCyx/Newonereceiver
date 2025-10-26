# 🔍 API Debugging Guide

## ✅ Enhanced Server Logging Added!

The API now logs detailed information for every request.

---

## 🧪 How to Debug

### Step 1: Open Two Windows

**Window 1 - Server Logs:**
```bash
# In terminal, watch the server logs:
tail -f /tmp/nextjs.log | grep "Countries API"
```

**Window 2 - Browser Console:**
```
1. Open admin panel in Telegram
2. Press F12
3. Go to Console tab
```

### Step 2: Try an Action

**Click Delete or Reset** on any country

**You'll see logs in BOTH windows:**

#### In Browser Console:
```
[Delete] Country ID: 68fe6ff8c6310106da6839cb
[Delete] Admin Telegram ID: 1211362365
[Delete] Sending delete request...
[Delete] Response: 404 {error: "Country not found", countryId: "..."}
```

#### In Server Logs (terminal):
```
[Countries API] POST request: { action: 'delete', countryId: '...', telegramId: 1211362365 }
[Countries API] Admin check: { telegramId: 1211362365, isAdmin: true }
[Countries API] Delete - countryId: 68fe6ff8c6310106da6839cb
[Countries API] Country exists: No
```

---

## 🎯 What the Logs Tell Us

### If you see "Country exists: No"

**Problem:** The country ID doesn't match any document in database

**Possible causes:**
1. Country was already deleted
2. ID format mismatch
3. Database connection issue

**Fix:** Check what IDs exist in database:
```bash
curl -s http://localhost:3000/api/admin/countries | grep "_id"
```

Compare with what's being sent from frontend.

---

### If you see "Admin check: { telegramId: ..., isAdmin: false }"

**Problem:** You're not recognized as admin

**Fix:**
```bash
npx tsx scripts/set-admin.ts
```

---

### If you see "No telegram ID provided"

**Problem:** Frontend not sending Telegram ID

**Fix:**
1. Refresh the page
2. Check browser console for "Admin Telegram ID: ..."
3. Should show your ID: 1211362365

---

## 🔧 Quick Diagnostic

### Test 1: Check Your Countries
```bash
curl -s http://localhost:3000/api/admin/countries
```

**You should see:**
```json
{
  "success": true,
  "countries": [
    {"_id": "...", "country_name": "United States", ...},
    ...
  ]
}
```

**Copy one of the _id values for testing.**

---

### Test 2: Test Delete Directly
```bash
# Replace COUNTRY_ID with actual ID from Test 1
curl -X POST http://localhost:3000/api/admin/countries \
  -H "Content-Type: application/json" \
  -d '{"action":"delete","countryId":"COUNTRY_ID_HERE","telegramId":1211362365}'
```

**If it works:**
```json
{"success":true,"message":"Country deleted successfully"}
```

**If it fails:**
```json
{"error":"Country not found","countryId":"..."}
```

This tells us if the API works at all.

---

### Test 3: Check Admin Status
```bash
curl -X POST http://localhost:3000/api/admin/check-admin \
  -H "Content-Type: application/json" \
  -d '{"telegramId":1211362365}'
```

**Expected:**
```json
{"isAdmin":true}
```

**If false:**
```bash
npx tsx scripts/set-admin.ts
```

---

## 📊 Debug Checklist

Run through these in order:

### ✅ 1. Server Running?
```bash
curl http://localhost:3000/api/admin/countries
# Should return list of countries
```

### ✅ 2. Admin Access Working?
```bash
curl -X POST http://localhost:3000/api/admin/check-admin \
  -d '{"telegramId":1211362365}' \
  -H "Content-Type: application/json"
# Should return: {"isAdmin":true}
```

### ✅ 3. Can List Countries?
```bash
curl http://localhost:3000/api/admin/countries
# Should return countries array
```

### ✅ 4. Get Real Country ID
```bash
# Copy an actual _id from the response above
# Example: "68fe6ff8c6310106da6839cb"
```

### ✅ 5. Test Delete with Real ID
```bash
curl -X POST http://localhost:3000/api/admin/countries \
  -H "Content-Type: application/json" \
  -d '{"action":"delete","countryId":"68fe6ff8c6310106da6839cb","telegramId":1211362365}'
```

**This will tell us if the API itself works!**

---

## 🎯 Next Steps

### Option A: API Works in Terminal but Not in Browser

**Problem:** Frontend sending wrong data

**Solution:** Check browser console logs:
- What countryId is being sent?
- Does it match database IDs?

### Option B: API Doesn't Work Even in Terminal

**Problem:** Database or API issue

**Solutions:**
1. Check MongoDB connection
2. Verify country exists
3. Check server logs for errors

### Option C: Admin Check Fails

**Problem:** Not set as admin

**Solution:**
```bash
npx tsx scripts/set-admin.ts
```

---

## 🚨 Most Likely Issues

### Issue 1: Country Already Deleted ✅

If you click delete twice, the second time will fail.

**Fix:** Just ignore, it's already gone.

---

### Issue 2: ID Mismatch ⚠️

Frontend sends one ID, database has different format.

**Check:** Compare IDs in browser console vs. API response.

---

### Issue 3: Cache Problem 🔄

Old data showing in frontend.

**Fix:** Hard refresh (Ctrl+Shift+R)

---

## 🎬 Do This Now

### Step 1: Get a Real Country ID

```bash
curl -s http://localhost:3000/api/admin/countries | grep -o '"_id":"[^"]*"' | head -1
```

**Copy the ID value (without quotes)**

### Step 2: Test Delete with That ID

```bash
# Replace YOUR_ID_HERE with actual ID from step 1
curl -X POST http://localhost:3000/api/admin/countries \
  -H "Content-Type: application/json" \
  -d '{"action":"delete","countryId":"YOUR_ID_HERE","telegramId":1211362365}'
```

### Step 3: Tell Me the Result

**If success:**
```json
{"success":true,"message":"Country deleted successfully"}
```
✅ API works! Problem is in frontend.

**If error:**
```json
{"error":"Country not found"}
```
❌ API issue. Need to check why.

---

**Try these steps and tell me what you see!** 🔍

This will help us identify exactly where the problem is.
