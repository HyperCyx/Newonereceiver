# ✅ AUTO-APPROVE CHANGED TO MINUTES - COMPLETE

## 🎯 What Changed

The auto-approve system has been completely updated from **hours** to **minutes**. Additionally, the auto-approve time is now **editable** when editing a country.

---

## 📋 Summary of Changes

### **1. Time Units Changed**
- **Before**: Hours (e.g., 24h, 48h, 72h)
- **After**: Minutes (e.g., 1440min, 2880min, 4320min)

### **2. Default Value Changed**
- **Before**: 24 hours
- **After**: 1440 minutes (equivalent to 24 hours)

### **3. Database Fields**
- **Before**: `auto_approve_hours`
- **After**: `auto_approve_minutes`

### **4. Editable in Country Management**
- **Before**: Not editable (only set on creation)
- **After**: Editable in edit mode

---

## 🔧 Files Modified

### **1. Admin Dashboard** (`/workspace/components/admin-dashboard.tsx`)

**State Variable:**
```typescript
// Before
const [autoApproveHours, setAutoApproveHours] = useState("24")

// After
const [autoApproveMinutes, setAutoApproveMinutes] = useState("1440")
```

**Edit Values State:**
```typescript
// Before
const [editValues, setEditValues] = useState<{capacity: number, prize: number, autoApproveHours: number}>()

// After
const [editValues, setEditValues] = useState<{capacity: number, prize: number, autoApproveMinutes: number}>()
```

**Table Header:**
```tsx
// Before
<th>Auto-Approve (Hrs)</th>

// After
<th>Auto-Approve (Min)</th>
```

**Table Cell (Now Editable):**
```tsx
// Before (Read-only)
<span className="font-semibold text-blue-600">{country.auto_approve_hours ?? 24}h</span>

// After (Editable in Edit Mode)
{isEditing ? (
  <input
    type="number"
    value={editValues?.autoApproveMinutes ?? country.auto_approve_minutes ?? 1440}
    onChange={(e) => setEditValues(prev => ({...prev!, autoApproveMinutes: parseInt(e.target.value) || 0}))}
    min="0"
    className="w-24 px-2 py-1 border-2 border-blue-500 rounded text-sm focus:outline-none"
  />
) : (
  <span className="font-semibold text-blue-600">{country.auto_approve_minutes ?? 1440}min</span>
)}
```

**Add Country Input:**
```tsx
// Before
<input
  type="number"
  placeholder="Auto-Approve Hours (e.g., 24, 48, 72)"
  min="0"
  defaultValue="24"
  id="country-auto-approve-input"
/>

// After
<input
  type="number"
  placeholder="Auto-Approve Minutes (e.g., 1440, 2880, 4320)"
  min="0"
  defaultValue="1440"
  id="country-auto-approve-input"
/>
```

**Save Handler (Now Includes Auto-Approve Minutes):**
```typescript
// Before (Auto-approve not sent)
body: JSON.stringify({
  action: 'update',
  countryId: country._id,
  maxCapacity: editValues.capacity,
  prizeAmount: editValues.prize,
  telegramId: adminTelegramId
})

// After (Auto-approve included)
body: JSON.stringify({
  action: 'update',
  countryId: country._id,
  maxCapacity: editValues.capacity,
  prizeAmount: editValues.prize,
  autoApproveMinutes: editValues.autoApproveMinutes,
  telegramId: adminTelegramId
})
```

**Edit Button Click:**
```typescript
// Before
setEditValues({
  capacity: country.max_capacity,
  prize: country.prize_amount,
  autoApproveHours: 0 // Dummy value, not editable
})

// After
setEditValues({
  capacity: country.max_capacity,
  prize: country.prize_amount,
  autoApproveMinutes: country.auto_approve_minutes ?? 1440 // Editable
})
```

**Settings Section:**
```tsx
// Before
<label>Auto-Approve Time (Hours)</label>
<input
  value={autoApproveHours}
  onChange={(e) => setAutoApproveHours(e.target.value)}
  placeholder="Enter hours (e.g., 24)"
/>
<p>Auto-Approve Time: {autoApproveHours} hours</p>

// After
<label>Auto-Approve Time (Minutes)</label>
<input
  value={autoApproveMinutes}
  onChange={(e) => setAutoApproveMinutes(e.target.value)}
  placeholder="Enter minutes (e.g., 1440)"
/>
<p>Auto-Approve Time: {autoApproveMinutes} minutes</p>
```

---

### **2. Settings API** (`/workspace/app/api/settings/route.ts`)

**GET Handler:**
```typescript
// Before
const autoApproveHours = await settings.findOne({ setting_key: 'auto_approve_hours' })
return NextResponse.json({
  success: true,
  settings: {
    min_withdrawal_amount: minWithdrawal?.setting_value || '5.00',
    auto_approve_hours: autoApproveHours?.setting_value || '24'
  }
})

// After
const autoApproveMinutes = await settings.findOne({ setting_key: 'auto_approve_minutes' })
return NextResponse.json({
  success: true,
  settings: {
    min_withdrawal_amount: minWithdrawal?.setting_value || '5.00',
    auto_approve_minutes: autoApproveMinutes?.setting_value || '1440'
  }
})
```

---

### **3. Countries API** (`/workspace/app/api/admin/countries/route.ts`)

**Request Body Destructuring:**
```typescript
// Before
const { action, countryId, countryCode, countryName, maxCapacity, prizeAmount, autoApproveHours, isActive, telegramId } = body

// After
const { action, countryId, countryCode, countryName, maxCapacity, prizeAmount, autoApproveMinutes, isActive, telegramId } = body
```

**Create Country:**
```typescript
// Before
const newCountry = {
  // ...
  auto_approve_hours: autoApproveHours !== undefined ? autoApproveHours : 24,
  // ...
}

// After
const newCountry = {
  // ...
  auto_approve_minutes: autoApproveMinutes !== undefined ? autoApproveMinutes : 1440,
  // ...
}
```

**Update Country:**
```typescript
// Before
if (autoApproveHours !== undefined) updateData.auto_approve_hours = autoApproveHours

// After
if (autoApproveMinutes !== undefined) updateData.auto_approve_minutes = autoApproveMinutes
```

---

### **4. Verify OTP Route** (`/workspace/app/api/telegram/auth/verify-otp/route.ts`)

**Auto-Approve Logic:**
```typescript
// Before
let autoApproveHours = 24 // Default

// Try to find country
if (country) {
  autoApproveHours = country.auto_approve_hours ?? 24
  console.log(`Country found, auto-approve: ${autoApproveHours}h`)
}

// Fallback to global setting
const settings = await db.collection('settings').findOne({ setting_key: 'auto_approve_hours' })
autoApproveHours = parseInt(settings?.setting_value || '24')

// Calculate time difference
const hoursPassed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

// Check if auto-approve
if (hoursPassed >= autoApproveHours && existingAccount.status === 'pending') {
  // Auto-approve
  console.log(`Account auto-approved after ${hoursPassed.toFixed(2)} hours`)
}

// After
let autoApproveMinutes = 1440 // Default (24 hours in minutes)

// Try to find country
if (country) {
  autoApproveMinutes = country.auto_approve_minutes ?? 1440
  console.log(`Country found, auto-approve: ${autoApproveMinutes}min`)
}

// Fallback to global setting
const settings = await db.collection('settings').findOne({ setting_key: 'auto_approve_minutes' })
autoApproveMinutes = parseInt(settings?.setting_value || '1440')

// Calculate time difference
const minutesPassed = (now.getTime() - createdAt.getTime()) / (1000 * 60)

// Check if auto-approve
if (minutesPassed >= autoApproveMinutes && existingAccount.status === 'pending') {
  // Auto-approve
  console.log(`Account auto-approved after ${minutesPassed.toFixed(2)} minutes`)
}
```

---

### **5. Verify 2FA Route** (`/workspace/app/api/telegram/auth/verify-2fa/route.ts`)

**Same changes as Verify OTP Route:**
- Changed from `autoApproveHours` to `autoApproveMinutes`
- Default changed from `24` to `1440`
- Database field changed from `auto_approve_hours` to `auto_approve_minutes`
- Time calculation changed from hours to minutes
- Console logs updated

---

## 📊 Database Schema Changes

### **Collection: `country_capacity`**

**Before:**
```json
{
  "_id": "...",
  "country_code": "1",
  "country_name": "USA",
  "max_capacity": 100,
  "prize_amount": 5.00,
  "auto_approve_hours": 24,
  "is_active": true,
  "used_capacity": 0
}
```

**After:**
```json
{
  "_id": "...",
  "country_code": "1",
  "country_name": "USA",
  "max_capacity": 100,
  "prize_amount": 5.00,
  "auto_approve_minutes": 1440,
  "is_active": true,
  "used_capacity": 0
}
```

---

### **Collection: `settings`**

**Before:**
```json
{
  "setting_key": "auto_approve_hours",
  "setting_value": "24"
}
```

**After:**
```json
{
  "setting_key": "auto_approve_minutes",
  "setting_value": "1440"
}
```

---

## 🎨 UI Changes

### **Countries Table**

**Header:**
```
| Country | Code | Max Cap | Used | Available | Prize | Auto-Approve (Min) | Status | Actions |
```

**Example Row (View Mode):**
```
| USA | 1 | 100 | 25 | 75 | $5.00 | 1440min | Active | [Edit] [Delete] |
```

**Example Row (Edit Mode):**
```
| USA | 1 | [100] | 25 | 75 | [$5.00] | [1440] | Active | [Save] [Cancel] |
                    ↑              ↑        ↑
               Editable       Editable  Editable
```

---

### **Add Country Form**

**Fields:**
```
Country Code:     [+1]
Country Name:     [United States]
Max Capacity:     [100]
Prize (USDT):     [5.00]
Auto-Approve:     [1440]  ← Changed from hours to minutes
                  ↑
                  Default: 1440 (24 hours)
```

---

### **Settings Section**

**Global Settings:**
```
┌─────────────────────────────────────┐
│ System Settings                     │
├─────────────────────────────────────┤
│ Minimum Withdrawal Amount           │
│ [5.00] USDT                         │
│                                     │
│ Auto-Approve Time (Minutes)         │
│ [1440]                              │
│ ↑                                   │
│ Default: 1440 (24 hours)            │
│                                     │
│ [Save Settings]                     │
└─────────────────────────────────────┘

Current Settings:
✓ Minimum Withdrawal: 5.00 USDT
✓ Auto-Approve Time: 1440 minutes
```

---

## 🔢 Conversion Reference

For quick reference, here are common hour values converted to minutes:

| Hours | Minutes | Description |
|-------|---------|-------------|
| 1h    | 60      | 1 hour      |
| 6h    | 360     | 6 hours     |
| 12h   | 720     | 12 hours    |
| 24h   | 1440    | 1 day       |
| 48h   | 2880    | 2 days      |
| 72h   | 4320    | 3 days      |
| 168h  | 10080   | 1 week      |

---

## ✅ Features

### **1. Granular Control**
- ✅ Set auto-approve in minutes instead of hours
- ✅ More precise timing (e.g., 90 minutes instead of rounding to 2 hours)

### **2. Edit Mode Support**
- ✅ Auto-approve time can now be edited when editing a country
- ✅ Appears in the same row with capacity and prize
- ✅ Input validation (min="0")

### **3. Country-Specific Auto-Approve**
- ✅ Each country can have different auto-approve times
- ✅ Detected automatically from phone number
- ✅ Falls back to global setting if country not found

### **4. Global Default Setting**
- ✅ Admin can set global auto-approve time
- ✅ Applied to countries without specific setting
- ✅ Default: 1440 minutes (24 hours)

### **5. Auto-Approve Calculation**
- ✅ Checks on every login (OTP or 2FA)
- ✅ Calculates time passed in minutes
- ✅ Auto-approves if time >= auto_approve_minutes
- ✅ Only auto-approves if status is 'pending'
- ✅ Sets `auto_approved: true` flag

---

## 🧪 Testing

### **Test 1: Create Country with Custom Auto-Approve**

1. Go to Admin Dashboard → Countries tab
2. Click "Add New Country"
3. Fill in:
   - Country Code: `91`
   - Country Name: `India`
   - Max Capacity: `200`
   - Prize: `3.00`
   - Auto-Approve Minutes: `2880` (48 hours)
4. Click "Add Country"
5. ✅ Verify country is created with `auto_approve_minutes: 2880`

---

### **Test 2: Edit Country Auto-Approve Time**

1. Go to Admin Dashboard → Countries tab
2. Find a country (e.g., "USA")
3. Click "Edit" button
4. Change Auto-Approve Minutes from `1440` to `720` (12 hours)
5. Click "Save"
6. ✅ Verify auto-approve time is updated to 720 minutes

---

### **Test 3: Auto-Approve After Time Passes**

1. Create a test account with phone number from a country
2. Set auto-approve to 5 minutes (for testing)
3. Wait 5 minutes
4. Log in again (OTP or 2FA)
5. ✅ Verify account is auto-approved
6. ✅ Check `auto_approved: true` flag in database

---

### **Test 4: Global Settings**

1. Go to Admin Dashboard → Settings tab
2. Change "Auto-Approve Time (Minutes)" to `720` (12 hours)
3. Click "Save Settings"
4. ✅ Verify global setting is updated
5. Create account with phone from unconfigured country
6. ✅ Verify it uses global 720-minute setting

---

## 📱 UI Examples

### **Countries Table Row (View Mode):**
```
┌──────────┬──────┬──────┬──────┬───────────┬───────┬──────────┬────────┬─────────────────┐
│ Country  │ Code │ Max  │ Used │ Available │ Prize │ Auto-    │ Status │ Actions         │
│          │      │ Cap  │      │           │(USDT) │ Approve  │        │                 │
│          │      │      │      │           │       │ (Min)    │        │                 │
├──────────┼──────┼──────┼──────┼───────────┼───────┼──────────┼────────┼─────────────────┤
│ USA      │  1   │ 100  │  25  │    75     │ $5.00 │ 1440min  │ Active │ [Edit] [Delete] │
└──────────┴──────┴──────┴──────┴───────────┴───────┴──────────┴────────┴─────────────────┘
```

### **Countries Table Row (Edit Mode):**
```
┌──────────┬──────┬──────┬──────┬───────────┬───────┬──────────┬────────┬─────────────────┐
│ Country  │ Code │ Max  │ Used │ Available │ Prize │ Auto-    │ Status │ Actions         │
│          │      │ Cap  │      │           │(USDT) │ Approve  │        │                 │
│          │      │      │      │           │       │ (Min)    │        │                 │
├──────────┼──────┼──────┼──────┼───────────┼───────┼──────────┼────────┼─────────────────┤
│ USA      │  1   │ [100]│  25  │    75     │[$5.00]│  [1440]  │ Active │ [Save] [Cancel] │
│          │      │  ↑   │      │           │   ↑   │    ↑     │        │                 │
│          │      │ Edit │      │           │ Edit  │  Edit    │        │                 │
└──────────┴──────┴──────┴──────┴───────────┴───────┴──────────┴────────┴─────────────────┘
```

---

## 🚀 Deployment

All changes are **live** and **ready to use**!

**URL:** https://villiform-parker-perfunctorily.ngrok-free.dev

**What to Do:**
1. ✅ Go to Admin Dashboard → Countries tab
2. ✅ Create new countries with minute-based auto-approve
3. ✅ Edit existing countries to change auto-approve time
4. ✅ Set global auto-approve in Settings tab
5. ✅ Test auto-approve by creating accounts

---

## 🎉 Summary

**All Changes Complete:**
- ✅ Changed from hours to minutes throughout system
- ✅ Default changed from 24 (hours) to 1440 (minutes)
- ✅ Database fields updated (`auto_approve_hours` → `auto_approve_minutes`)
- ✅ Auto-approve time is now editable in country edit mode
- ✅ All calculations updated to use minutes
- ✅ UI updated with new labels and placeholders
- ✅ Settings API updated
- ✅ Countries API updated
- ✅ Verify OTP route updated
- ✅ Verify 2FA route updated

**Benefits:**
- 🎯 More precise control (minutes vs hours)
- ✏️ Editable auto-approve time in country management
- 🌍 Country-specific auto-approve settings
- 🔧 Global fallback setting
- ⚡ Real-time auto-approval on login

---

**Auto-approve system now uses minutes and is fully editable!** ⏱️✨
