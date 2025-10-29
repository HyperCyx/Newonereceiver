# 🔍 DEBUG: Country Detection & Amount Display

## 📊 Current Issue Found

I can see from the logs that your pending account has phone number: **+998701470983**

**Problem:** Country code **998** is not found in your database!

```
[AccountsList] Detecting country for +998701470983, digits: 998701470983
[AccountsList] No country found for +998701470983, using global: 1440 minutes
```

**Country Code:** `998` (Uzbekistan)
**Result:** Falls back to default **1440 minutes** (24 hours)

---

## 🔧 Solution

### **Option 1: Add Country Code 998 to Database**

1. Go to **Admin Dashboard** → **Countries** tab
2. Click **"Add New Country"**
3. Fill in:
   - **Country Code:** `998` (just the digits, no +)
   - **Country Name:** `Uzbekistan` (or any name)
   - **Max Capacity:** e.g., `100`
   - **Prize Amount:** e.g., `5.00` (the money user will get)
   - **Auto-Approve Minutes:** e.g., `1` (for 1 minute)
4. Click **"Add Country"**

**After adding, the account will show:**
- ⏱️ Timer: `0h 0m 59s` (if you set 1 minute)
- 💰 Amount: `5.00 USDT` (whatever prize you set)

---

### **Option 2: Check Existing Country Codes**

**Make sure your country code in database matches the phone number:**

**Phone Format:** `+998701470983`
- First digit: `9`
- First 2 digits: `99`
- First 3 digits: `998` ← This is the country code!

**Database Format:** Country code should be stored as `"998"` (string, no +)

**Example of correct country in database:**
```json
{
  "country_code": "998",
  "country_name": "Uzbekistan",
  "max_capacity": 100,
  "prize_amount": 5.0,
  "auto_approve_minutes": 1,
  "is_active": true
}
```

---

## 🔍 How to Debug

### **Step 1: Open Browser Console (F12)**

When you view the pending list, you'll see detailed logs:

```
[TransactionList] Raw accounts data: [...]
[TransactionList] Formatted transactions: [
  {
    phone: "+998701470983",
    amount: "0.00",  ← Check if this is 0!
    autoApproveMinutes: 1440,  ← Check if this is 1440 (24h)!
    autoApproveHours: 24,
    status: ["PENDING"]
  }
]
```

**What to check:**
1. **amount:** If it's `"0.00"`, the account was created without prize
2. **autoApproveMinutes:** If it's `1440`, country wasn't found

---

### **Step 2: Check Server Logs**

In the server terminal, you'll see:

```
[AccountsList] Found 1 accounts with query: { status: 'pending', user_id: '...' }
[AccountsList] Raw accounts: [
  {
    phone: "+998701470983",
    amount: 0,  ← Prize amount from database
    status: "pending",
    created_at: "2025-..."
  }
]
[AccountsList] Detecting country for +998701470983, digits: 998701470983
[AccountsList] Trying code: 9, found: none
[AccountsList] Trying code: 99, found: none
[AccountsList] Trying code: 998, found: none  ← Country not in database!
[AccountsList] Trying code: 9987, found: none
[AccountsList] ❌ No country found for +998701470983, using global: 1440 minutes
[AccountsList] Enriched account: {
  phone: "+998701470983",
  amount: 0,  ← Will show as 0.00 USDT
  auto_approve_minutes: 1440,  ← Will show as 24h
  detected_country: null
}
```

**If country IS found, you'll see:**
```
[AccountsList] Trying code: 998, found: Uzbekistan
[AccountsList] ✅ Country found: Uzbekistan, code: 998, auto-approve: 1 minutes, prize: 5
[AccountsList] Enriched account: {
  phone: "+998701470983",
  amount: 0,  ← Note: Amount is from database, not from country!
  auto_approve_minutes: 1,  ← Now shows 1 minute!
  detected_country: "Uzbekistan"
}
```

---

## ⚠️ Important: Amount vs Prize

### **Current Account Amount:**

The account in your database currently has `amount: 0` because it was created before the prize system was implemented.

**The amount field is set when:**
1. Account is **created** (gets prize from country)
2. Account is **approved by admin** (gets prize from country)
3. Account is **auto-approved** (gets prize from existing amount)

**Your existing pending account has `amount: 0` because:**
- It was created before I added the prize detection code
- The account needs to be re-created OR
- Admin needs to approve it manually

---

## 🔄 Two Ways to Fix Existing Account

### **Option A: Create New Account (Recommended)**

1. Delete the existing pending account (or wait for it to be rejected)
2. Add country code `998` with prize amount
3. Sell the account again (login with same number)
4. **New account will have:**
   - ✅ Correct prize amount from country
   - ✅ Correct auto-approve time

### **Option B: Admin Manual Approval**

1. Add country code `998` with prize amount
2. Admin approves the pending account via API
3. **On approval:**
   - ✅ System detects country from phone number
   - ✅ Gets prize from country settings
   - ✅ Adds prize to user balance
   - ✅ Sets account amount to prize

**To manually approve via API:**
```bash
curl -X POST https://your-domain/api/admin/accounts \\
  -H "Content-Type: application/json" \\
  -d '{
    "accountId": "your-account-id",
    "action": "approve",
    "telegramId": 1211362365
  }'
```

---

## 📋 Quick Checklist

**To fix your issue:**

- [ ] Add country code `998` in Admin → Countries
- [ ] Set prize amount (e.g., `5.00`)
- [ ] Set auto-approve minutes (e.g., `1`)
- [ ] Delete existing pending account OR approve it manually
- [ ] Create new account by logging in again
- [ ] Check browser console for logs
- [ ] Verify timer shows correct minutes
- [ ] Verify amount shows correct prize

---

## 🎯 Expected Result After Fix

### **In Admin Dashboard → Countries:**
```
┌──────────────┬──────┬─────────┬──────┬───────────┬───────┬──────────┬────────┐
│ Country      │ Code │ Max Cap │ Used │ Available │ Prize │ Auto-App │ Status │
├──────────────┼──────┼─────────┼──────┼───────────┼───────┼──────────┼────────┤
│ Uzbekistan   │ 998  │  100    │  0   │   100     │ $5.00 │  1min    │ Active │
└──────────────┴──────┴─────────┴──────┴───────────┴───────┴──────────┴────────┘
```

### **In User's Pending List:**
```
┌────────────────────────────────────────┐
│ +998701470983                          │
│ 5.00 USDT  ← Correct prize!           │
│ ⏱️ Auto-approve in: 0h 0m 59s         │
│              ↑ Correct time (1 min)!  │
│ [PENDING]                              │
└────────────────────────────────────────┘
```

### **In Browser Console:**
```
[TransactionList] Formatted transactions: [{
  phone: "+998701470983",
  amount: "5.00",  ← Correct!
  autoApproveMinutes: 1,  ← Correct!
  autoApproveHours: 0.016666...,
  status: ["PENDING"]
}]
```

### **In Server Logs:**
```
[AccountsList] ✅ Country found: Uzbekistan, code: 998, auto-approve: 1 minutes, prize: 5
[AccountsList] Enriched account: {
  phone: "+998701470983",
  amount: 5,  ← From new account creation
  auto_approve_minutes: 1,
  detected_country: "Uzbekistan"
}
```

---

## 🚀 Next Steps

1. **Add the country code 998** to your database
2. **Set the prize amount** and **auto-approve minutes**
3. **Test with a new account** or **approve the existing one**
4. **Check the logs** in browser console (F12)
5. **Verify** timer and amount are correct

**Open browser console (F12) and check the logs to see exactly what's happening!**

---

## 💡 Pro Tip

**To see all country codes in your database:**
```javascript
// Run in Admin Dashboard → Countries tab
// Check the table to see what country codes you have
```

**Common country codes:**
- `1` - USA/Canada
- `44` - UK
- `91` - India
- `998` - Uzbekistan
- `86` - China
- `81` - Japan
- `82` - South Korea
- `7` - Russia/Kazakhstan

**Make sure your country code matches the phone number prefix!**

---

**Once you add country code 998, everything should work perfectly!** 🎉
