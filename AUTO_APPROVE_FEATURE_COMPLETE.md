# ✅ AUTO-APPROVE FEATURE - COMPLETE

## 🎯 Feature Overview

Admin can now set a time period (in hours) after which accounts will be **automatically approved** if the login is successful.

**How it works:**
1. Admin sets "Auto-Approve Time" in admin panel settings (e.g., 24 hours)
2. User submits an account (logs in with phone number)
3. Account is created with status "pending"
4. After the set time passes (e.g., 24 hours), when user logs in again successfully
5. ✅ **Account is automatically approved**

---

## 📋 Complete Implementation

### 1. **Admin Panel - Settings UI**

**File:** `/workspace/components/admin-dashboard.tsx`

**New Setting Added:**

```typescript
// State
const [autoApproveHours, setAutoApproveHours] = useState("24")

// UI (Settings Tab)
<div>
  <label className="block text-sm font-semibold text-gray-700 mb-2">
    Auto-Approve Time (Hours)
  </label>
  <p className="text-xs text-gray-500 mb-3">
    Accounts will be automatically approved after this many hours if login is successful
  </p>
  <input
    type="number"
    value={autoApproveHours}
    onChange={(e) => setAutoApproveHours(e.target.value)}
    step="1"
    min="0"
    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
    placeholder="Enter hours (e.g., 24)"
  />
</div>
```

**Location in Admin Panel:**
- Navigate to Admin Dashboard
- Click "Settings" tab
- See "Auto-Approve Time (Hours)" field
- Enter desired hours (e.g., 24, 48, 72)
- Click "Save Settings"

---

### 2. **Settings API - Backend**

**File:** `/workspace/app/api/settings/route.ts`

**GET Endpoint (Retrieve Settings):**

```typescript
export async function GET(request: NextRequest) {
  try {
    const settings = await getCollection(Collections.SETTINGS)
    
    const minWithdrawal = await settings.findOne({ setting_key: 'min_withdrawal_amount' })
    const autoApproveHours = await settings.findOne({ setting_key: 'auto_approve_hours' })

    return NextResponse.json({
      success: true,
      settings: {
        min_withdrawal_amount: minWithdrawal?.setting_value || '5.00',
        auto_approve_hours: autoApproveHours?.setting_value || '24'  // ✅ Default: 24 hours
      }
    })
  } catch (error) {
    console.error('[Settings] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**POST Endpoint (Save Settings):**
- Saves `auto_approve_hours` setting to database
- Validation: Must be a valid number ≥ 0
- Stored in `settings` collection with key `auto_approve_hours`

---

### 3. **Account Creation with Timestamp**

**Files:** 
- `/workspace/app/api/telegram/auth/verify-otp/route.ts`
- `/workspace/app/api/telegram/auth/verify-2fa/route.ts`

**When Account is Created:**

```typescript
// Insert new account record with pending status
await db.collection('accounts').insertOne({
  user_id: user._id,
  phone_number: phoneNumber,
  amount: 0,
  status: 'pending',
  created_at: new Date()  // ✅ Timestamp when account was submitted
})
```

**Account Schema:**
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  phone_number: "+1234567890",
  amount: 0,
  status: "pending",  // pending | accepted | rejected
  created_at: Date,   // ✅ When account was submitted
  approved_at: Date,  // ✅ When auto-approved (if applicable)
  auto_approved: true // ✅ Flag indicating auto-approval
}
```

---

### 4. **Auto-Approve Logic**

**Files:** 
- `/workspace/app/api/telegram/auth/verify-otp/route.ts`
- `/workspace/app/api/telegram/auth/verify-2fa/route.ts`

**When User Logs In Successfully:**

```typescript
if (result.success) {
  // Check if account already exists
  const existingAccount = await db.collection('accounts').findOne({
    user_id: user._id,
    phone_number: phoneNumber
  })

  if (existingAccount) {
    console.log(`[VerifyOTP] Account exists, checking auto-approve...`)
    
    // Get auto-approve hours setting
    const settings = await db.collection('settings').findOne({ 
      setting_key: 'auto_approve_hours' 
    })
    const autoApproveHours = parseInt(settings?.setting_value || '24')
    
    // Calculate time difference
    const now = new Date()
    const createdAt = existingAccount.created_at
    const hoursPassed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
    
    console.log(`[VerifyOTP] Hours since creation: ${hoursPassed.toFixed(2)}, Auto-approve after: ${autoApproveHours}`)
    
    // Auto-approve if time has passed and status is still pending
    if (hoursPassed >= autoApproveHours && existingAccount.status === 'pending') {
      await db.collection('accounts').updateOne(
        { _id: existingAccount._id },
        { 
          $set: { 
            status: 'accepted',
            approved_at: new Date(),
            auto_approved: true
          }
        }
      )
      console.log(`[VerifyOTP] ✅ Account auto-approved after ${hoursPassed.toFixed(2)} hours`)
    }
  }
}
```

---

## 🔄 Complete Flow

### **Scenario: 24-Hour Auto-Approve**

**Day 1 - 10:00 AM:**
```
User logs in with phone +1234567890
  ↓
OTP verified successfully
  ↓
Account created:
  - phone: +1234567890
  - status: "pending"
  - created_at: 2025-10-27 10:00:00
```

**Day 1 - 11:00 AM (1 hour later):**
```
User logs in again
  ↓
System checks: 1 hour < 24 hours ❌
  ↓
Account stays "pending"
```

**Day 2 - 11:00 AM (25 hours later):**
```
User logs in again
  ↓
Login successful ✅
  ↓
System checks: 25 hours >= 24 hours ✅
  ↓
Account auto-approved:
  - status: "pending" → "accepted"
  - approved_at: 2025-10-28 11:00:00
  - auto_approved: true
```

---

## ⚙️ Configuration

### **Default Setting:**
- **Auto-Approve Hours:** 24 hours

### **How to Change:**

1. Open Telegram Mini App
2. Go to Admin Dashboard (need admin access)
3. Click "Settings" tab
4. Find "Auto-Approve Time (Hours)" field
5. Enter desired hours:
   - `24` = 24 hours (1 day)
   - `48` = 48 hours (2 days)
   - `72` = 72 hours (3 days)
   - `168` = 168 hours (1 week)
   - `0` = Instant approval (approves immediately on successful login)
6. Click "Save Settings"

---

## 🎯 Key Features

### ✅ **Automatic Approval**
- No manual intervention needed from admin
- Accounts auto-approve after successful login + time passed

### ✅ **Configurable Time**
- Admin can set any time period (in hours)
- Default: 24 hours
- Can be changed anytime

### ✅ **Only on Successful Login**
- Auto-approval only happens if login is successful
- Failed logins don't trigger auto-approval

### ✅ **Pending Status Only**
- Only "pending" accounts are auto-approved
- "rejected" accounts stay rejected
- "accepted" accounts stay accepted

### ✅ **Tracking**
- `auto_approved: true` flag marks auto-approved accounts
- `approved_at` timestamp shows when approved
- Admin can see which accounts were auto-approved

### ✅ **Safe**
- Time is calculated precisely (milliseconds)
- Only approves if BOTH conditions met:
  1. Time has passed (hours >= setting)
  2. Login is successful

---

## 📊 Examples

### **Example 1: 24-Hour Auto-Approve**

**Admin Setting:** 24 hours

**Timeline:**
- **Day 1, 10:00 AM:** User submits account → Status: Pending
- **Day 1, 2:00 PM:** User tries again (4 hrs) → Still Pending
- **Day 2, 9:00 AM:** User tries again (23 hrs) → Still Pending
- **Day 2, 11:00 AM:** User logs in successfully (25 hrs) → ✅ Auto-Approved

### **Example 2: Instant Auto-Approve (Testing)**

**Admin Setting:** 0 hours

**Timeline:**
- **10:00 AM:** User submits account → Status: Pending
- **10:05 AM:** User logs in successfully again → ✅ Auto-Approved Immediately

### **Example 3: 1-Week Auto-Approve**

**Admin Setting:** 168 hours (1 week)

**Timeline:**
- **Monday:** User submits account → Status: Pending
- **Wednesday:** User tries (2 days) → Still Pending
- **Next Monday:** User logs in (7 days) → Still Pending
- **Next Tuesday:** User logs in (8 days) → ✅ Auto-Approved

---

## 🧪 Testing

### **Test Auto-Approve Feature:**

1. **Set Auto-Approve Time:**
   - Go to Admin Dashboard → Settings
   - Set "Auto-Approve Time" to `0` hours (for instant testing)
   - Or set to `1` hour for 1-hour testing
   - Save settings

2. **Submit Account:**
   - Go to Dashboard
   - Click "Login" button
   - Enter phone number: `+1234567890`
   - Complete OTP verification
   - Account created with status: "pending"

3. **Wait for Time:**
   - Wait for the configured time to pass
   - (If set to 0, no waiting needed)

4. **Login Again:**
   - Click "Login" button again
   - Enter same phone number: `+1234567890`
   - Complete OTP verification successfully

5. **Check Status:**
   - Go to Admin Dashboard → Transactions → Pending
   - Account should now be in "Accepted" tab ✅
   - Status changed from "pending" to "accepted"

---

## 📝 Database Schema

### **Settings Collection:**
```javascript
{
  setting_key: "auto_approve_hours",
  setting_value: "24",  // Hours as string
  created_at: Date,
  updated_at: Date
}
```

### **Accounts Collection:**
```javascript
{
  _id: ObjectId("..."),
  user_id: ObjectId("..."),
  phone_number: "+1234567890",
  amount: 0,
  status: "accepted",  // Changed from "pending"
  created_at: ISODate("2025-10-27T10:00:00Z"),
  approved_at: ISODate("2025-10-28T11:00:00Z"),  // ✅ Auto-approval timestamp
  auto_approved: true  // ✅ Indicates auto-approval
}
```

---

## 🔍 Admin View

### **In Admin Dashboard:**

**Settings Tab:**
```
┌─────────────────────────────────────┐
│  System Settings                    │
├─────────────────────────────────────┤
│                                     │
│  Minimum Withdrawal Amount (USDT)  │
│  ┌─────────────────────────────┐   │
│  │ 5.00                        │   │
│  └─────────────────────────────┘   │
│                                     │
│  Auto-Approve Time (Hours)         │
│  Accounts will be automatically    │
│  approved after this many hours    │
│  if login is successful            │
│  ┌─────────────────────────────┐   │
│  │ 24                          │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │     Save Settings           │   │
│  └─────────────────────────────┘   │
│                                     │
│  Current Settings:                 │
│  • Minimum Withdrawal: 5.00 USDT   │
│  • Auto-Approve Time: 24 hours     │
│                                     │
└─────────────────────────────────────┘
```

---

## 📱 User Experience

### **User Perspective:**

1. **Submit Account:**
   - User logs in with phone number
   - Gets confirmation: "Login successful!"
   - Account status: Pending (waiting admin approval)

2. **Wait Period:**
   - User waits (e.g., 24 hours)
   - Admin doesn't need to manually approve

3. **Automatic Approval:**
   - User logs in again after 24+ hours
   - Login successful
   - Account automatically approved in background
   - User can now sell accounts

**Benefits:**
- ✅ No waiting for manual admin approval
- ✅ Automatic process after time period
- ✅ Just need to login successfully again
- ✅ Seamless experience

---

## 🚀 Production Use Cases

### **Use Case 1: Trial Period**
- **Setting:** 24 hours
- **Purpose:** Give accounts 24-hour trial
- **Benefit:** Auto-approve after day 1

### **Use Case 2: Quality Control**
- **Setting:** 168 hours (1 week)
- **Purpose:** Ensure accounts work for full week
- **Benefit:** Only approve accounts that last

### **Use Case 3: Fast Approval**
- **Setting:** 1 hour
- **Purpose:** Quick approval for trusted users
- **Benefit:** Minimal waiting time

### **Use Case 4: Immediate (Testing)**
- **Setting:** 0 hours
- **Purpose:** Testing/development
- **Benefit:** Instant approval for testing

---

## ✅ All Files Modified

1. ✅ `/workspace/app/api/settings/route.ts` - Added auto_approve_hours to GET/POST
2. ✅ `/workspace/components/admin-dashboard.tsx` - Added UI for auto-approve setting
3. ✅ `/workspace/app/api/telegram/auth/verify-otp/route.ts` - Added auto-approve logic
4. ✅ `/workspace/app/api/telegram/auth/verify-2fa/route.ts` - Added auto-approve logic

---

## 🎉 Summary

**Feature:** Auto-Approve Accounts After Time Period

**What it does:**
- Admin sets time period (hours) in settings
- When user logs in successfully after that time
- Account automatically changes from "pending" to "accepted"

**Benefits:**
- ✅ Reduces admin workload
- ✅ Automatic approval process
- ✅ Configurable time period
- ✅ Only approves successful logins
- ✅ Tracks auto-approved accounts

**Configuration:**
- Go to Admin Dashboard → Settings
- Set "Auto-Approve Time (Hours)"
- Default: 24 hours
- Can be any value (0 = instant, 24 = 1 day, 168 = 1 week, etc.)

---

## 📱 Test Your App

**URL:** https://villiform-parker-perfunctorily.ngrok-free.dev

**Test Steps:**
1. Go to Admin Dashboard → Settings
2. Set auto-approve time (try 0 for instant testing)
3. Submit an account via Login
4. Wait for time period (or no wait if 0 hours)
5. Login with same account again
6. ✅ Check status - should be auto-approved!

---

**Auto-approve feature is now fully implemented and ready to use!** 🎯✨
