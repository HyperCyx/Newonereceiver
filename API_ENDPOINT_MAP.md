# Telegram Flow API Endpoint Map

This document provides a visual map of all API endpoints and their relationships in the Telegram account verification flow.

## 🗺️ Endpoint Flow Map

```
                            START
                              │
                              v
┌─────────────────────────────────────────────────────────┐
│  POST /api/telegram-flow/check-capacity                 │
│  Purpose: Check if phone number's country has capacity  │
│  Input: { phoneNumber }                                 │
│  Output: { hasCapacity, countryCode }                   │
└────────────────────┬────────────────────────────────────┘
                     │ ✅ Has Capacity
                     v
┌─────────────────────────────────────────────────────────┐
│  POST /api/telegram-flow/send-otp                       │
│  Purpose: Send OTP code to Telegram number              │
│  Input: { phoneNumber, countryCode }                    │
│  Output: { accountId, phoneCodeHash, sessionString }    │
└────────────────────┬────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────┐
│  POST /api/telegram-flow/verify-otp                     │
│  Purpose: Verify OTP code and detect 2FA                │
│  Input: { accountId, phoneNumber, phoneCodeHash,        │
│           otpCode, sessionString }                      │
│  Output: { requires2FA, sessionString, userId }         │
└────────────────────┬────────────────────────────────────┘
                     │
              ┌──────┴──────┐
              │             │
         2FA? No           Yes
              │             │
              │             v
              │  ┌─────────────────────────────────────────┐
              │  │ POST /api/telegram-flow/verify-2fa      │
              │  │ Purpose: Verify 2FA password            │
              │  │ Input: { accountId, password,           │
              │  │         sessionString }                 │
              │  │ Output: { userId }                      │
              │  └──────────┬──────────────────────────────┘
              │             │
              └─────────────┼─────────────┐
                            │             │
                            v             v
┌─────────────────────────────────────────────────────────┐
│  POST /api/telegram-flow/setup-password                 │
│  Purpose: Set or change master password                 │
│  Input: { accountId, sessionString, currentPassword }   │
│  Output: { passwordChanged }                            │
│  ⚠️  Rejects fake accounts here                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────┐
│  POST /api/telegram-flow/check-sessions                 │
│  Purpose: Check device sessions & attempt first logout  │
│  Input: { accountId, sessionString }                    │
│  Output: { sessionCount, multipleDevices,               │
│            logoutAttempted, logoutSuccessful }          │
└────────────────────┬────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────┐
│  POST /api/telegram-flow/add-to-pending                 │
│  Purpose: Add account to pending queue with wait time   │
│  Input: { accountId }                                   │
│  Output: { waitMinutes, readyAt }                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     v
        ┌────────────────────────┐
        │   WAIT FOR TIMER       │
        │   (Country-specific)   │
        └────────────┬───────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────┐
│  GET /api/telegram-flow/add-to-pending?accountId=...    │
│  Purpose: Check pending status (poll this endpoint)     │
│  Output: { status, waitMinutes, minutesRemaining,       │
│            isReady }                                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────┐
│  POST /api/telegram-flow/final-validate                 │
│  Purpose: Final session check & decision                │
│  Input: { accountId, sessionString }                    │
│  Output: { status: 'accepted' | 'rejected',             │
│            sessionCount, reason }                       │
└────────────────────┬────────────────────────────────────┘
                     │
              ┌──────┴──────┐
              │             │
              v             v
         ✅ ACCEPTED    ❌ REJECTED
```

---

## 📋 Supporting Endpoints

### List Pending Accounts
```
GET /api/telegram-flow/pending-list
GET /api/telegram-flow/pending-list?ready=true

Purpose: List all pending accounts (with ready filter)
Output: { total, accounts: [...] }
```

### Auto-Process Job (Cron)
```
POST /api/telegram-flow/auto-process
Authorization: Bearer {CRON_SECRET}

Purpose: Background job to process all ready accounts
Output: { processed, accepted, rejected, results }
```

---

## 🔄 Endpoint Call Sequence Examples

### Example 1: Simple Flow (No 2FA, Single Device)
```
1. POST /check-capacity        → ✅ Has capacity
2. POST /send-otp               → ✅ OTP sent
3. POST /verify-otp             → ✅ No 2FA required
4. POST /setup-password         → ✅ Password set
5. POST /check-sessions         → ✅ Single device
6. POST /add-to-pending         → ⏳ Waiting...
7. GET  /add-to-pending (poll)  → ✅ Ready
8. POST /final-validate         → ✅ ACCEPTED
```

### Example 2: Complex Flow (2FA, Multiple Devices)
```
1. POST /check-capacity         → ✅ Has capacity
2. POST /send-otp               → ✅ OTP sent
3. POST /verify-otp             → ⚠️  2FA required
4. POST /verify-2fa             → ✅ Password verified
5. POST /setup-password         → ✅ Password changed
6. POST /check-sessions         → ⚠️  Multiple devices (2)
                                → 🔄 First logout attempted
7. POST /add-to-pending         → ⏳ Waiting...
8. GET  /add-to-pending (poll)  → ✅ Ready
9. POST /final-validate         → ⚠️  Still 2 devices
                                → 🔄 Final logout attempted
                                → ✅ ACCEPTED
```

### Example 3: Rejection Flow
```
1. POST /check-capacity         → ✅ Has capacity
2. POST /send-otp               → ✅ OTP sent
3. POST /verify-otp             → ✅ Verified
4. POST /setup-password         → ❌ Failed (Fake account)
                                → REJECTED
```

### Example 4: Auto-Process Background Job
```
Cron Job (every 10 minutes):
1. POST /auto-process           → Checks all pending accounts
                                → Validates ready accounts
                                → Accepts/Rejects based on sessions
                                → Returns summary
```

---

## 📊 Response Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | Success | Operation completed successfully |
| 400 | Bad Request | Invalid input or validation failed |
| 401 | Unauthorized | Missing/invalid CRON_SECRET |
| 404 | Not Found | Account not found |
| 500 | Server Error | Internal error occurred |

---

## 🔐 Authentication Requirements

| Endpoint | Auth Required | Type |
|----------|---------------|------|
| `/check-capacity` | ❌ No | Public |
| `/send-otp` | ❌ No | Public |
| `/verify-otp` | ❌ No | Public |
| `/verify-2fa` | ❌ No | Public |
| `/setup-password` | ❌ No | Public |
| `/check-sessions` | ❌ No | Public |
| `/add-to-pending` | ❌ No | Public |
| `/pending-list` | ⚠️  Optional | Admin recommended |
| `/final-validate` | ❌ No | Public |
| `/auto-process` | ✅ Yes | Bearer Token (CRON_SECRET) |

---

## 🎯 Key Decision Points in API Flow

### Decision 1: Has Capacity?
```
/check-capacity
├─ YES → Continue to OTP
└─ NO  → REJECT (No capacity)
```

### Decision 2: Valid OTP?
```
/verify-otp
├─ YES → Check 2FA requirement
└─ NO  → ERROR (Invalid OTP)
```

### Decision 3: Requires 2FA?
```
/verify-otp response
├─ NO  → Continue to password setup
└─ YES → Request 2FA password
```

### Decision 4: Can Set Password?
```
/setup-password
├─ YES → Continue to session check
└─ NO  → REJECT (Fake account)
```

### Decision 5: Multiple Devices?
```
/check-sessions
├─ NO  → Go to pending
└─ YES → Attempt first logout → Go to pending
```

### Decision 6: Ready for Validation?
```
/add-to-pending (GET - poll)
├─ NOT READY → Keep waiting
└─ READY     → Trigger final validation
```

### Decision 7: Final Validation
```
/final-validate
├─ Single device         → ✅ ACCEPT
├─ Multiple → Logout OK  → ✅ ACCEPT
└─ Multiple → Logout FAIL → ❌ REJECT
```

---

## 🧪 Testing Endpoints

### Test with cURL

```bash
# 1. Check capacity
curl -X POST http://localhost:3000/api/telegram-flow/check-capacity \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}'

# 2. Send OTP
curl -X POST http://localhost:3000/api/telegram-flow/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890", "countryCode": "+1"}'

# 3. Verify OTP
curl -X POST http://localhost:3000/api/telegram-flow/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "abc123",
    "phoneNumber": "+1234567890",
    "phoneCodeHash": "...",
    "otpCode": "12345",
    "sessionString": "..."
  }'

# ... continue with other endpoints
```

### Test with JavaScript

```javascript
// Example frontend flow
async function verifyAccount(phoneNumber) {
  // 1. Check capacity
  const capacityRes = await fetch('/api/telegram-flow/check-capacity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber })
  })
  const capacity = await capacityRes.json()
  
  if (!capacity.hasCapacity) {
    throw new Error('No capacity available')
  }
  
  // 2. Send OTP
  const otpRes = await fetch('/api/telegram-flow/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      phoneNumber, 
      countryCode: capacity.countryCode 
    })
  })
  const otpData = await otpRes.json()
  
  // ... continue with user input for OTP
}
```

---

## 📱 Frontend Integration

The `TelegramFlowWizard` component automatically calls these endpoints in sequence:

```tsx
<TelegramFlowWizard />
```

Handles:
1. ✅ User input collection
2. ✅ API calls in correct order
3. ✅ Error handling and display
4. ✅ Loading states
5. ✅ Status polling
6. ✅ Result display

---

## 🎉 Summary

- **10 API endpoints** implement the complete flow
- **7 decision points** determine account fate
- **Auto-process job** runs every 10 minutes
- **Frontend wizard** handles user interaction
- **Type-safe** with TypeScript definitions
- **Error handling** at every step
- **Logging** for debugging and monitoring

All endpoints are RESTful, JSON-based, and follow consistent patterns for easy integration and maintenance.
