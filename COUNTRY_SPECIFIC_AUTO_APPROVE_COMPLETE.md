# ✅ COUNTRY-SPECIFIC AUTO-APPROVE FEATURE - COMPLETE

## 🎯 Feature Overview

Auto-approve time is now **configurable per country**! Each country can have its own auto-approve time setting, allowing different approval periods for different regions.

**How it works:**
1. Admin sets auto-approve time for each country individually (e.g., USA: 24h, India: 48h, UK: 72h)
2. When user logs in with a phone number, system detects the country
3. Uses that country's auto-approve setting
4. After the specified time + successful login → ✅ **Account auto-approved**

---

## 📋 Complete Implementation

### 1. **Database Schema - Countries**

**Collection:** `country_capacity`

**Updated Schema:**
```javascript
{
  _id: ObjectId,
  country_code: "1",           // Phone country code (e.g., "1" for USA/Canada)
  country_name: "United States",
  max_capacity: 100,
  used_capacity: 25,
  prize_amount: 5.00,
  auto_approve_hours: 24,      // ✅ NEW: Country-specific auto-approve hours
  is_active: true,
  created_at: Date,
  updated_at: Date
}
```

**New Field:**
- `auto_approve_hours` (Number): Hours after which accounts auto-approve for this country
- Default value: 24 hours
- Can be different for each country

---

### 2. **Admin Panel UI - Countries Tab**

**File:** `/workspace/components/admin-dashboard.tsx`

**New Column Added:**

```
┌────────────┬──────┬──────────┬──────┬───────────┬───────┬──────────────────┬────────┬─────────┐
│ Country    │ Code │ Max Cap  │ Used │ Available │ Prize │ Auto-Approve(Hrs)│ Status │ Actions │
├────────────┼──────┼──────────┼──────┼───────────┼───────┼──────────────────┼────────┼─────────┤
│ USA        │  1   │   100    │  25  │    75     │ $5.00 │      24h         │ Active │ Edit... │
│ India      │ 91   │   200    │  50  │   150     │ $3.00 │      48h         │ Active │ Edit... │
│ UK         │ 44   │   50     │  10  │    40     │ $7.00 │      72h         │ Active │ Edit... │
└────────────┴──────┴──────────┴──────┴───────────┴───────┴──────────────────┴────────┴─────────┘
```

**Features:**
- ✅ View auto-approve hours for each country
- ✅ Click "Edit" to change settings
- ✅ Modify auto-approve hours (0-999+)
- ✅ Save changes with one click

**Edit Mode:**

When editing a country:
```
Max Capacity: [__100___]
Prize (USDT): [__5.00___]
Auto-Approve: [___24____] hours   ← Editable!
[💾 Save] [✕ Cancel]
```

---

### 3. **API Updates**

**File:** `/workspace/app/api/admin/countries/route.ts`

**Create Country:**
```typescript
const newCountry = {
  _id: generateId(),
  country_code: countryCode,
  country_name: countryName,
  max_capacity: maxCapacity || 0,
  prize_amount: prizeAmount || 0,
  auto_approve_hours: autoApproveHours !== undefined ? autoApproveHours : 24,  // ✅ Default 24h
  is_active: isActive !== undefined ? isActive : true,
  used_capacity: 0,
  created_at: new Date(),
  updated_at: new Date()
}
```

**Update Country:**
```typescript
const updateData: any = {
  updated_at: new Date()
}

if (countryName !== undefined) updateData.country_name = countryName
if (maxCapacity !== undefined) updateData.max_capacity = maxCapacity
if (prizeAmount !== undefined) updateData.prize_amount = prizeAmount
if (autoApproveHours !== undefined) updateData.auto_approve_hours = autoApproveHours  // ✅ NEW
if (isActive !== undefined) updateData.is_active = isActive
```

---

### 4. **Auto-Approve Logic - Country Detection**

**Files:** 
- `/workspace/app/api/telegram/auth/verify-otp/route.ts`
- `/workspace/app/api/telegram/auth/verify-2fa/route.ts`

**How it Works:**

```typescript
// 1. Detect country from phone number
let autoApproveHours = 24 // Default

// Extract country code from phone number (e.g., +1234567890 -> try 1, 12, 123, 1234)
const phoneDigits = phoneNumber.replace(/[^\d]/g, '')
let countryFound = false

// 2. Try progressively longer codes (1-4 digits)
for (let i = 1; i <= Math.min(4, phoneDigits.length) && !countryFound; i++) {
  const possibleCode = phoneDigits.substring(0, i)
  const country = await db.collection('country_capacity').findOne({ 
    country_code: possibleCode 
  })
  
  if (country) {
    autoApproveHours = country.auto_approve_hours ?? 24
    console.log(`[VerifyOTP] Country found: ${country.country_name}, auto-approve: ${autoApproveHours}h`)
    countryFound = true
  }
}

// 3. Fallback to global setting if no country match
if (!countryFound) {
  const settings = await db.collection('settings').findOne({ setting_key: 'auto_approve_hours' })
  autoApproveHours = parseInt(settings?.setting_value || '24')
  console.log(`[VerifyOTP] No country match, using global setting: ${autoApproveHours}h`)
}

// 4. Calculate and apply auto-approve
const now = new Date()
const createdAt = existingAccount.created_at
const hoursPassed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

console.log(`[VerifyOTP] Hours since creation: ${hoursPassed.toFixed(2)}, Auto-approve after: ${autoApproveHours}`)

// 5. Auto-approve if time has passed
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
```

---

## 🌍 Country Code Detection

### **How Phone Numbers Are Parsed:**

**Example 1: USA Phone Number**
```
Phone: +1234567890
       ↓
Digits: 1234567890
       ↓
Try codes:
  - "1" → ✅ Found! USA (country_code: "1")
  - Auto-approve: 24 hours
```

**Example 2: India Phone Number**
```
Phone: +919876543210
       ↓
Digits: 919876543210
       ↓
Try codes:
  - "9" → Not found
  - "91" → ✅ Found! India (country_code: "91")
  - Auto-approve: 48 hours
```

**Example 3: UK Phone Number**
```
Phone: +447911123456
       ↓
Digits: 447911123456
       ↓
Try codes:
  - "4" → Not found
  - "44" → ✅ Found! UK (country_code: "44")
  - Auto-approve: 72 hours
```

**Example 4: No Match**
```
Phone: +8881234567 (fictional)
       ↓
Digits: 8881234567
       ↓
Try codes:
  - "8" → Not found
  - "88" → Not found
  - "888" → Not found
  - "8881" → Not found
  ↓
Use global setting: 24 hours (from Settings tab)
```

---

## 🔄 Complete Flow Example

### **Scenario: Different Countries, Different Times**

**Admin Configuration:**
```
USA (code: 1):        Auto-approve after 24 hours
India (code: 91):     Auto-approve after 48 hours
UK (code: 44):        Auto-approve after 72 hours
Global Setting:       Auto-approve after 24 hours (fallback)
```

**User A - USA (+1234567890):**
```
Day 1, 10:00 AM
  → Submits account (status: pending)
  → Country detected: USA (code: 1)
  → Auto-approve time: 24 hours

Day 2, 11:00 AM (25 hours later)
  → Logs in successfully
  → System checks: 25h >= 24h ✅
  → Status: pending → accepted ✅
```

**User B - India (+919876543210):**
```
Day 1, 10:00 AM
  → Submits account (status: pending)
  → Country detected: India (code: 91)
  → Auto-approve time: 48 hours

Day 2, 11:00 AM (25 hours later)
  → Logs in successfully
  → System checks: 25h < 48h ❌
  → Status: still pending

Day 3, 11:00 AM (49 hours later)
  → Logs in successfully
  → System checks: 49h >= 48h ✅
  → Status: pending → accepted ✅
```

**User C - UK (+447911123456):**
```
Day 1, 10:00 AM
  → Submits account (status: pending)
  → Country detected: UK (code: 44)
  → Auto-approve time: 72 hours (3 days)

Day 4, 11:00 AM (73 hours later)
  → Logs in successfully
  → System checks: 73h >= 72h ✅
  → Status: pending → accepted ✅
```

---

## ⚙️ Admin Configuration

### **How to Set Different Times for Different Countries:**

1. **Open Admin Dashboard**
   - Navigate to Admin Login
   - Enter admin credentials

2. **Go to Countries Tab**
   - See list of all countries

3. **Edit Country**
   - Click "✏️ Edit" button for the country
   - Modify "Auto-Approve" field
   - Examples:
     - `24` = 24 hours (1 day)
     - `48` = 48 hours (2 days)
     - `72` = 72 hours (3 days)
     - `168` = 168 hours (1 week)
     - `0` = Instant approval

4. **Save Changes**
   - Click "💾 Save"
   - Settings applied immediately

### **Setting Up New Country:**

When adding a new country:
```
Country Code: 1
Country Name: United States
Max Capacity: 100
Prize Amount: 5.00
Auto-Approve Hours: 24  ← Set here!
```

Default is 24 hours if not specified.

---

## 📊 Use Cases

### **Use Case 1: High-Trust Countries**

**Scenario:** USA, Canada, UK - Low fraud risk

**Configuration:**
- USA (code 1): 24 hours
- Canada (code 1): 24 hours (same code as USA)
- UK (code 44): 24 hours

**Benefit:** Fast approval for trusted regions

### **Use Case 2: Medium-Trust Countries**

**Scenario:** India, Brazil - Moderate fraud risk

**Configuration:**
- India (code 91): 48 hours
- Brazil (code 55): 48 hours

**Benefit:** Extra day to verify account quality

### **Use Case 3: High-Risk Countries**

**Scenario:** New markets, unknown patterns

**Configuration:**
- Country X (code XX): 168 hours (1 week)

**Benefit:** Full week to ensure account works

### **Use Case 4: Testing/VIP**

**Scenario:** Special accounts for testing

**Configuration:**
- Test Country: 0 hours (instant)

**Benefit:** Immediate approval for testing

---

## 🎯 Key Features

### ✅ **Country-Specific Settings**
- Each country has its own auto-approve time
- Ranges from 0 hours (instant) to 999+ hours
- Completely independent settings

### ✅ **Automatic Detection**
- System detects country from phone number
- Uses country code matching (1-4 digits)
- Fallback to global setting if no match

### ✅ **Flexible Configuration**
- Admin can change anytime
- No need to restart server
- Takes effect immediately

### ✅ **Visual Management**
- See all countries in one table
- Edit mode for easy changes
- Clear display of current settings

### ✅ **Backward Compatible**
- Existing countries default to 24 hours
- Global setting still works as fallback
- No data migration needed

---

## 🧪 Testing

### **Test Country-Specific Auto-Approve:**

**Step 1: Set Different Times**
1. Go to Admin Dashboard → Countries
2. Edit USA (code 1): Set to `1` hour
3. Edit India (code 91): Set to `2` hours
4. Save changes

**Step 2: Test USA Phone**
1. Go to Dashboard → Login
2. Enter: `+1234567890`
3. Complete OTP
4. Account created (pending)
5. Wait 1+ hours
6. Login again with same number
7. ✅ Should auto-approve (USA = 1 hour)

**Step 3: Test India Phone**
1. Go to Dashboard → Login
2. Enter: `+919876543210`
3. Complete OTP
4. Account created (pending)
5. Wait 1 hour (< 2 hours)
6. Login again
7. ❌ Still pending (India = 2 hours)
8. Wait another hour (total 2+ hours)
9. Login again
10. ✅ Should auto-approve (India = 2 hours)

**Step 4: Test Unknown Country**
1. Enter phone with code not in database
2. Should use global setting (24 hours by default)

---

## 📝 Database Structure

### **Countries Collection:**
```javascript
// USA
{
  _id: ObjectId("..."),
  country_code: "1",
  country_name: "United States",
  max_capacity: 100,
  used_capacity: 25,
  prize_amount: 5.00,
  auto_approve_hours: 24,  // ✅ 24 hours for USA
  is_active: true,
  created_at: ISODate("..."),
  updated_at: ISODate("...")
}

// India
{
  _id: ObjectId("..."),
  country_code: "91",
  country_name: "India",
  max_capacity: 200,
  used_capacity: 50,
  prize_amount: 3.00,
  auto_approve_hours: 48,  // ✅ 48 hours for India
  is_active: true,
  created_at: ISODate("..."),
  updated_at: ISODate("...")
}

// UK
{
  _id: ObjectId("..."),
  country_code: "44",
  country_name: "United Kingdom",
  max_capacity: 50,
  used_capacity: 10,
  prize_amount: 7.00,
  auto_approve_hours: 72,  // ✅ 72 hours for UK
  is_active: true,
  created_at: ISODate("..."),
  updated_at: ISODate("...")
}
```

---

## 🔍 Admin View

### **Countries Table:**
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Country Capacity Management                                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│ Country  │ Code │ Max  │ Used │ Available │ Prize  │ Auto-Approve │ Status  │   │
│          │      │ Cap  │      │           │ (USDT) │    (Hrs)     │         │   │
├──────────┼──────┼──────┼──────┼───────────┼────────┼──────────────┼─────────┼───┤
│ USA      │  1   │ 100  │  25  │    75     │ $5.00  │     24h      │ Active  │ ✏️│
│ India    │ 91   │ 200  │  50  │   150     │ $3.00  │     48h      │ Active  │ ✏️│
│ UK       │ 44   │  50  │  10  │    40     │ $7.00  │     72h      │ Active  │ ✏️│
└──────────┴──────┴──────┴──────┴───────────┴────────┴──────────────┴─────────┴───┘
```

**Click ✏️ to Edit:**
```
┌───────────────────────────────┐
│ Editing: USA                  │
├───────────────────────────────┤
│ Max Capacity:  [__100___]    │
│ Prize (USDT):  [__5.00___]   │
│ Auto-Approve:  [___24____]h  │   ← Change this!
│                               │
│ [💾 Save]  [✕ Cancel]        │
└───────────────────────────────┘
```

---

## ✅ All Files Modified

1. ✅ `/workspace/app/api/admin/countries/route.ts`
   - Added `autoApproveHours` parameter
   - Create: Sets default 24 hours
   - Update: Updates auto_approve_hours field

2. ✅ `/workspace/components/admin-dashboard.tsx`
   - Added "Auto-Approve (Hrs)" column
   - Edit mode includes auto-approve input
   - Save button sends auto-approve hours
   - State updated to include autoApproveHours

3. ✅ `/workspace/app/api/telegram/auth/verify-otp/route.ts`
   - Country detection from phone number
   - Uses country-specific auto-approve hours
   - Fallback to global setting

4. ✅ `/workspace/app/api/telegram/auth/verify-2fa/route.ts`
   - Country detection from phone number
   - Uses country-specific auto-approve hours
   - Fallback to global setting

---

## 🎉 Summary

**Feature:** Country-Specific Auto-Approve Time

**What it does:**
- Each country can have different auto-approve time
- System detects country from phone number
- Uses country's setting for auto-approval
- Falls back to global setting if no match

**Benefits:**
- ✅ Flexible per-country policies
- ✅ Different approval times for different regions
- ✅ Better fraud control
- ✅ Easy to configure
- ✅ Automatic detection
- ✅ No manual intervention needed

**Configuration:**
- Admin Dashboard → Countries tab
- Edit any country → Set auto-approve hours
- Save → Takes effect immediately

**Examples:**
- USA: 24 hours (fast approval)
- India: 48 hours (medium verification)
- UK: 72 hours (extended verification)
- Unknown: 24 hours (global fallback)

---

## 📱 Test Your App

**URL:** https://villiform-parker-perfunctorily.ngrok-free.dev

**Test Steps:**
1. Go to Admin Dashboard → Countries
2. Set different auto-approve times for different countries
3. Test with phone numbers from those countries
4. Verify auto-approve happens at correct times

---

**Country-specific auto-approve is now fully implemented!** 🌍✨

**Each country can have its own approval time, perfectly configured for your business needs!**
