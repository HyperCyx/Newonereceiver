# ✅ ACCOUNT PRIZE PAYMENT & AUTO-APPROVAL FIXED

## 🎯 Issues Fixed

### 1. **Prize Money Not Being Paid** ✅ 
Users were not receiving prize money when selling their account.

### 2. **Timer Not Showing** ✅
No countdown timer was displayed showing when the account would be auto-approved.

### 3. **Auto-Approval Not Working** ✅
Accounts were staying in "pending" status forever and not being auto-approved.

---

## 📋 What Was Wrong

### **Problem 1: Prize Amount Set to 0**

**Before:**
```typescript
// When account was created
await db.collection('accounts').insertOne({
  user_id: user._id,
  phone_number: phoneNumber,
  amount: 0, // ❌ Always 0!
  status: 'pending',
  created_at: new Date()
})
```

**Issue:** The account was always created with `amount: 0`, regardless of the country's prize amount.

---

### **Problem 2: No Prize Payment on Auto-Approval**

**Before:**
```typescript
// When auto-approving
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
// ❌ No payment to user balance!
```

**Issue:** Even when auto-approved, the prize amount was not added to the user's balance.

---

### **Problem 3: No Timer in UI**

**Before:**
- User saw "PENDING" status
- No information about when it would be approved
- No countdown timer

---

### **Problem 4: Auto-Approval Only on Login**

**Before:**
- Auto-approval only happened when user logged in again
- If user didn't log in, account stayed pending forever
- No background processing

---

## 🔧 Fixes Applied

### **Fix 1: Set Prize Amount on Account Creation**

**Files Modified:**
- `/workspace/app/api/telegram/auth/verify-otp/route.ts`
- `/workspace/app/api/telegram/auth/verify-2fa/route.ts`

**After:**
```typescript
// Get prize amount from country
let prizeAmount = 0
const phoneDigits = phoneNumber.replace(/[^\d]/g, '')

for (let i = 1; i <= Math.min(4, phoneDigits.length); i++) {
  const possibleCode = phoneDigits.substring(0, i)
  const country = await db.collection('country_capacity').findOne({ 
    country_code: possibleCode 
  })
  
  if (country) {
    prizeAmount = country.prize_amount || 0
    console.log(`Prize amount from ${country.country_name}: ${prizeAmount}`)
    break
  }
}

// Insert new account record with prize amount
await db.collection('accounts').insertOne({
  user_id: user._id,
  phone_number: phoneNumber,
  amount: prizeAmount, // ✅ Correct prize amount!
  status: 'pending',
  created_at: new Date()
})

console.log(`Account created for ${phoneNumber} with prize amount: $${prizeAmount}`)
```

**Result:** Account is now created with the correct prize amount based on the user's country.

---

### **Fix 2: Pay Prize Amount on Auto-Approval**

**Files Modified:**
- `/workspace/app/api/telegram/auth/verify-otp/route.ts`
- `/workspace/app/api/telegram/auth/verify-2fa/route.ts`

**After:**
```typescript
// Auto-approve if time has passed
if (minutesPassed >= autoApproveMinutes && existingAccount.status === 'pending') {
  await db.collection('accounts').updateOne(
    { _id: existingAccount._id },
    { 
      $set: { 
        status: 'accepted',
        approved_at: new Date(),
        auto_approved: true,
        updated_at: new Date()
      }
    }
  )
  
  // Add prize amount to user balance
  if (existingAccount.amount && existingAccount.amount > 0) {
    await db.collection('users').updateOne(
      { _id: user._id },
      { $inc: { balance: existingAccount.amount } } // ✅ Payment!
    )
    console.log(`✅ Account auto-approved, added $${existingAccount.amount} to balance`)
  }
}
```

**Result:** When account is auto-approved, prize money is automatically added to user's balance.

---

### **Fix 3: Added Countdown Timer**

**File Modified:**
- `/workspace/components/transaction-list.tsx`

**Changes:**

1. **Added Fields to Transaction:**
```typescript
interface Transaction {
  // ... existing fields
  createdAt?: Date
  autoApproveMinutes?: number
}
```

2. **Added Timer Update:**
```typescript
// Update timer every minute
useEffect(() => {
  const interval = setInterval(() => {
    setTick(t => t + 1)
  }, 60000) // Update every minute
  return () => clearInterval(interval)
}, [])
```

3. **Added Time Remaining Function:**
```typescript
const getTimeRemaining = (transaction: Transaction) => {
  if (!transaction.createdAt || transaction.status[0] !== 'PENDING') return null
  
  const now = new Date()
  const createdAt = new Date(transaction.createdAt)
  const minutesPassed = (now.getTime() - createdAt.getTime()) / (1000 * 60)
  const minutesRemaining = (transaction.autoApproveMinutes || 1440) - minutesPassed
  
  if (minutesRemaining <= 0) {
    return 'Auto-approving...'
  }
  
  const hoursRemaining = Math.floor(minutesRemaining / 60)
  const minsRemaining = Math.floor(minutesRemaining % 60)
  
  if (hoursRemaining > 0) {
    return `${hoursRemaining}h ${minsRemaining}m`
  } else {
    return `${minsRemaining}m`
  }
}
```

4. **Display Timer in UI:**
```tsx
{transaction.status[0] === 'PENDING' && getTimeRemaining(transaction) && (
  <p className="text-[12px] text-blue-600 mt-1 font-medium">
    ⏱️ Auto-approve in: {getTimeRemaining(transaction)}
  </p>
)}
```

**Result:** Users now see a live countdown timer showing when their account will be auto-approved!

---

### **Fix 4: Background Auto-Approval**

**New File Created:**
- `/workspace/app/api/accounts/auto-approve/route.ts`

**What It Does:**
- Checks all pending accounts
- Calculates time passed since creation
- Auto-approves accounts that have exceeded their auto-approve time
- Adds prize money to user balance
- Can be called manually or by a cron job

**Code:**
```typescript
export async function POST(request: NextRequest) {
  const accounts = await getCollection(Collections.ACCOUNTS)
  const users = await getCollection(Collections.USERS)
  const countryCapacity = await getCollection(Collections.COUNTRY_CAPACITY)
  const settings = await getCollection(Collections.SETTINGS)
  
  // Find all pending accounts
  const pendingAccounts = await accounts
    .find({ status: 'pending' })
    .toArray()
  
  let approvedCount = 0
  const now = new Date()
  
  for (const account of pendingAccounts) {
    // Detect country auto-approve time
    let autoApproveMinutes = 1440 // Default
    // ... country detection logic ...
    
    // Calculate time passed
    const createdAt = account.created_at
    const minutesPassed = (now.getTime() - createdAt.getTime()) / (1000 * 60)
    
    // Auto-approve if time has passed
    if (minutesPassed >= autoApproveMinutes) {
      // Update account status
      await accounts.updateOne(
        { _id: account._id },
        { 
          $set: { 
            status: 'accepted',
            approved_at: new Date(),
            auto_approved: true,
            updated_at: new Date()
          } 
        }
      )
      
      // Add prize amount to user balance
      if (account.amount && account.amount > 0) {
        await users.updateOne(
          { _id: account.user_id },
          { $inc: { balance: account.amount } }
        )
      }
      
      approvedCount++
    }
  }
  
  return NextResponse.json({
    success: true,
    message: `Auto-approved ${approvedCount} accounts`,
    approvedCount: approvedCount,
    pendingCount: pendingAccounts.length
  })
}
```

**Usage:**
```bash
# Call manually to process pending accounts
curl -X POST https://your-domain/api/accounts/auto-approve
```

**Result:** Accounts can be auto-approved in the background without requiring user login!

---

### **Fix 5: Admin Accounts Approval API**

**New File Created:**
- `/workspace/app/api/admin/accounts/route.ts`

**What It Does:**
- Admin can manually approve/reject accounts
- When approved:
  - Account status changes to "accepted"
  - Prize amount from country is added to user balance
  - Country's used_capacity is incremented
- When rejected:
  - Account status changes to "rejected"
  - No payment made

**Key Logic:**
```typescript
if (action === 'approve') {
  // Get country prize amount
  const phoneDigits = account.phone_number.replace(/[^\d]/g, '')
  let prizeAmount = 0
  
  for (let i = 1; i <= Math.min(4, phoneDigits.length); i++) {
    const possibleCode = phoneDigits.substring(0, i)
    const country = await countryCapacity.findOne({ country_code: possibleCode })
    
    if (country) {
      prizeAmount = country.prize_amount || 0
      
      // Increment used capacity
      await countryCapacity.updateOne(
        { _id: country._id },
        { $inc: { used_capacity: 1 } }
      )
      
      break
    }
  }
  
  // Update account
  await accounts.updateOne(
    { _id: accountId },
    { 
      $set: { 
        status: 'accepted',
        amount: prizeAmount,
        approved_at: new Date(),
        updated_at: new Date()
      } 
    }
  )

  // Add prize to user balance
  if (prizeAmount > 0) {
    await users.updateOne(
      { _id: account.user_id },
      { $inc: { balance: prizeAmount } }
    )
  }
}
```

**Result:** Admin can manually approve accounts and users immediately receive their prize money!

---

### **Fix 6: Enhanced Accounts List API**

**File Modified:**
- `/workspace/app/api/accounts/list/route.ts`

**What Changed:**
- Now includes `auto_approve_minutes` for each account
- Detects country from phone number
- Falls back to global setting if no country found

**Result:** Transaction list can show accurate countdown timers for each account!

---

## 📊 Complete Flow

### **User Sells Account:**

1. **User logs in with phone number** (`/api/telegram/auth/verify-otp` or `verify-2fa`)
2. **System detects country** from phone number prefix
3. **System gets prize amount** from country settings
4. **Account is created** with:
   - ✅ `amount: <country prize amount>`
   - ✅ `status: 'pending'`
   - ✅ `created_at: <now>`

---

### **Auto-Approval (3 Ways):**

#### **Option 1: On Next Login** (Immediate)
- User logs in again
- System checks time passed
- If time >= auto-approve minutes:
  - ✅ Status → 'accepted'
  - ✅ Prize added to balance

#### **Option 2: Background Job** (Automatic)
- Call `/api/accounts/auto-approve`
- Checks all pending accounts
- Auto-approves eligible ones
- ✅ Prize added to balance

#### **Option 3: Manual Admin Approval** (Manual)
- Admin calls `/api/admin/accounts` with action='approve'
- Account immediately approved
- ✅ Prize added to balance
- ✅ Country capacity incremented

---

### **User Sees:**

**In Transaction List (Pending Tab):**
```
┌─────────────────────────────────────────┐
│ +1234567890                             │
│ 5.00 USDT                               │
│ ⏱️ Auto-approve in: 23h 45m            │
│ [PENDING]                               │
└─────────────────────────────────────────┘
```

**Timer Updates:**
- Every minute
- Shows: `23h 45m`, `1h 30m`, `45m`, etc.
- When time passed: `Auto-approving...`

**After Approval:**
```
┌─────────────────────────────────────────┐
│ +1234567890                             │
│ 5.00 USDT                               │
│ [ACCEPTED] [SUCCESS]                    │
└─────────────────────────────────────────┘
```

**User Balance:**
- Before: `$0.00`
- After: `$5.00` (or country prize amount)

---

## 🧪 Testing

### **Test 1: Create Account and Check Prize**

1. Login with a phone number from a configured country
2. Check the created account in database:
   ```
   {
     phone_number: "+1234567890",
     amount: 5.00,  ← Should be country prize!
     status: "pending"
   }
   ```
3. ✅ Prize amount should match country setting

---

### **Test 2: Timer Display**

1. Create an account
2. Go to Dashboard → Pending tab
3. ✅ Should see: `⏱️ Auto-approve in: 23h 59m`
4. Wait 1 minute, refresh
5. ✅ Timer should update: `23h 58m`

---

### **Test 3: Auto-Approval (Login Method)**

1. Create account (set auto-approve to 1 minute for testing)
2. Wait 1 minute
3. Log in again with same phone number
4. Check user balance
5. ✅ Balance should increase by prize amount
6. ✅ Account status should be "accepted"

---

### **Test 4: Auto-Approval (Background)**

1. Create several pending accounts
2. Wait for auto-approve time
3. Call background job:
   ```bash
   curl -X POST https://your-domain/api/accounts/auto-approve
   ```
4. Check response:
   ```json
   {
     "success": true,
     "message": "Auto-approved 3 accounts",
     "approvedCount": 3,
     "pendingCount": 5
   }
   ```
5. ✅ Check user balances - should increase

---

### **Test 5: Manual Admin Approval**

1. Admin goes to Admin Dashboard → Accounts tab (if added)
2. Clicks "Approve" on pending account
3. ✅ Account status → "accepted"
4. ✅ User balance increases
5. ✅ Country used capacity increments

---

## 📱 UI Examples

### **Pending Account (with Timer):**
```
╔═══════════════════════════════════════════╗
║ 💼 +1234567890                           ║
║ 💰 5.00 USDT                             ║
║ ⏱️ Auto-approve in: 23h 45m              ║
║ ╔════════════════════════╗               ║
║ ║   [PENDING]            ║               ║
║ ╚════════════════════════╝               ║
╚═══════════════════════════════════════════╝
```

### **Approved Account:**
```
╔═══════════════════════════════════════════╗
║ 💼 +1234567890                           ║
║ 💰 5.00 USDT                             ║
║ ╔════════════════════════╗               ║
║ ║ [ACCEPTED] [SUCCESS]   ║               ║
║ ╚════════════════════════╝               ║
╚═══════════════════════════════════════════╝
```

---

## 🚀 Summary

**All 3 Issues Fixed:**

1. ✅ **Prize Money Paid**
   - Set correctly on account creation
   - Added to balance on approval
   - Based on country settings

2. ✅ **Timer Showing**
   - Live countdown display
   - Updates every minute
   - Shows hours and minutes remaining

3. ✅ **Auto-Approval Working**
   - On next login (immediate)
   - Background job (automatic)
   - Manual admin approval (manual)

**Prize Flow:**
1. User sells account → Prize amount set
2. Account approved → Money added to balance
3. User sees balance increase! 💰

**Auto-Approval Methods:**
- 🔄 On login (automatic check)
- ⏰ Background job (bulk processing)
- 👤 Admin manual (immediate approval)

**Timer Display:**
- ⏱️ Live countdown
- 📊 Accurate to the minute
- 🔔 "Auto-approving..." when ready

---

## 🌐 Live Now

**URL:** https://villiform-parker-perfunctorily.ngrok-free.dev

**Try It:**
1. Sell an account
2. See prize amount in pending list
3. Watch the countdown timer
4. Wait for auto-approval or ask admin to approve
5. Check your balance - money added! 💰

---

**All fixes are live and working!** 🎉✨
