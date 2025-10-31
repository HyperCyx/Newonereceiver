# Telegram Account Login & Verification Flow - Setup Guide

## 🎯 Overview

This system implements a comprehensive 12-phase authentication and validation pipeline for Telegram accounts, ensuring only legitimate, single-device accounts are accepted.

---

## 📊 Flow Architecture

```
┌─────────────────┐
│ Enter Phone     │
│ Number          │
└────────┬────────┘
         │
         v
┌─────────────────┐      ❌ No Capacity
│ Check Database  │──────────────────► REJECT
│ Capacity        │
└────────┬────────┘
         │ ✅ Has Capacity
         v
┌─────────────────┐
│ Send Telegram   │
│ OTP             │
└────────┬────────┘
         │
         v
┌─────────────────┐      ❌ Invalid OTP
│ Verify OTP      │──────────────────► ERROR
└────────┬────────┘
         │ ✅ Valid
         v
    ┌────┴────┐
    │ 2FA?    │
    └─┬────┬──┘
      │    │
  No  │    │ Yes
      │    │
      │    v
      │  ┌─────────────┐   ❌ Wrong Password
      │  │ Verify 2FA  │──────────────────► ERROR
      │  └──────┬──────┘
      │         │ ✅ Valid
      └─────────┼─────────┐
                │         │
                v         v
           ┌─────────────────┐
           │ Setup Master    │
           │ Password        │
           └────────┬────────┘
                    │
                    v
           ┌─────────────────┐
           │ Check Device    │
           │ Sessions        │
           └────────┬────────┘
                    │
              ┌─────┴─────┐
              │ Multiple? │
              └─┬───────┬─┘
           No   │       │ Yes
                │       │
                │       v
                │  ┌─────────────┐
                │  │ First       │
                │  │ Logout      │
                │  └──────┬──────┘
                │         │
                └─────────┼─────────┐
                          │         │
                          v         v
                   ┌─────────────────┐
                   │ Pending Queue   │
                   │ (Country Wait)  │
                   └────────┬────────┘
                            │
                            v
                   ┌─────────────────┐
                   │ Wait Until      │
                   │ Ready Time      │
                   └────────┬────────┘
                            │
                            v
                   ┌─────────────────┐
                   │ Final Session   │
                   │ Check           │
                   └────────┬────────┘
                            │
                      ┌─────┴─────┐
                      │ Multiple? │
                      └─┬───────┬─┘
                   No   │       │ Yes
                        │       │
                        │       v
                        │  ┌─────────────┐
                        │  │ Final       │
                        │  │ Logout      │
                        │  └──────┬──────┘
                        │         │
                        │    ┌────┴────┐
                        │    │Success? │
                        │    └─┬────┬──┘
                        │  Yes │    │ No
                        │      │    │
                        └──────┼────┘
                               │    │
                               v    v
                          ┌─────┐ ┌─────┐
                          │ ✅  │ │ ❌  │
                          │ACCEPT│ │REJECT│
                          └─────┘ └─────┘
```

---

## 🗂️ Project Structure

```
/workspace/
├── app/api/telegram-flow/
│   ├── check-capacity/route.ts       # Step 1: Capacity check
│   ├── send-otp/route.ts             # Step 2: Send OTP
│   ├── verify-otp/route.ts           # Step 3: Verify OTP
│   ├── verify-2fa/route.ts           # Step 4: Verify 2FA (optional)
│   ├── setup-password/route.ts       # Step 5: Master password
│   ├── check-sessions/route.ts       # Step 6: Session detection
│   ├── add-to-pending/route.ts       # Step 7: Pending queue
│   ├── pending-list/route.ts         # List pending accounts
│   ├── final-validate/route.ts       # Step 8: Final validation
│   └── auto-process/route.ts         # Background job
├── components/
│   └── telegram-flow-wizard.tsx      # Frontend wizard
├── lib/
│   ├── types/account.ts              # Type definitions
│   ├── services/
│   │   └── telegram-flow-orchestrator.ts
│   └── telegram/
│       └── auth.ts                   # Telegram API wrapper
├── scripts/
│   ├── 009_update_country_capacity.ts
│   └── setup-cron-job.sh
└── TELEGRAM_FLOW_IMPLEMENTATION.md
```

---

## 🚀 Setup Instructions

### 1. Run Database Migration

```bash
# Update country capacity with wait times
npx tsx scripts/009_update_country_capacity.ts
```

This will:
- Add `wait_time_minutes` to all countries
- Set default wait times (US: 1hr, UK: 2hr, etc.)
- Add global settings for default wait time (24hr)
- Generate default master password

### 2. Configure Environment Variables

```bash
# Add to .env
MONGODB_URI=your_mongodb_uri
API_ID=your_telegram_api_id
API_HASH=your_telegram_api_hash
CRON_SECRET=your_cron_secret_key
```

### 3. Setup Auto-Process Cron Job

```bash
# Make script executable
chmod +x scripts/setup-cron-job.sh

# Run setup
./scripts/setup-cron-job.sh
```

This will:
- Generate a secure CRON_SECRET
- Create a cron job that runs every 10 minutes
- Configure automatic processing of pending accounts

### 4. Start the Application

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

---

## 📡 API Endpoints Reference

### **1. Check Capacity**
```http
POST /api/telegram-flow/check-capacity
Content-Type: application/json

{
  "phoneNumber": "+1234567890"
}

Response:
{
  "success": true,
  "hasCapacity": true,
  "countryCode": "+1"
}
```

### **2. Send OTP**
```http
POST /api/telegram-flow/send-otp
Content-Type: application/json

{
  "phoneNumber": "+1234567890",
  "countryCode": "+1"
}

Response:
{
  "success": true,
  "accountId": "abc123",
  "phoneCodeHash": "...",
  "sessionString": "..."
}
```

### **3. Verify OTP**
```http
POST /api/telegram-flow/verify-otp
Content-Type: application/json

{
  "accountId": "abc123",
  "phoneNumber": "+1234567890",
  "phoneCodeHash": "...",
  "otpCode": "12345",
  "sessionString": "..."
}

Response:
{
  "success": true,
  "requires2FA": false,
  "sessionString": "...",
  "userId": "..."
}
```

### **4. Verify 2FA** (Optional)
```http
POST /api/telegram-flow/verify-2fa
Content-Type: application/json

{
  "accountId": "abc123",
  "phoneNumber": "+1234567890",
  "password": "user_password",
  "sessionString": "..."
}

Response:
{
  "success": true,
  "userId": "..."
}
```

### **5. Setup Master Password**
```http
POST /api/telegram-flow/setup-password
Content-Type: application/json

{
  "accountId": "abc123",
  "sessionString": "...",
  "currentPassword": "..." // if had 2FA
}

Response:
{
  "success": true,
  "passwordChanged": false
}
```

### **6. Check Sessions**
```http
POST /api/telegram-flow/check-sessions
Content-Type: application/json

{
  "accountId": "abc123",
  "sessionString": "..."
}

Response:
{
  "success": true,
  "sessionCount": 1,
  "multipleDevices": false,
  "logoutAttempted": false
}
```

### **7. Get Pending Status**
```http
GET /api/telegram-flow/add-to-pending?accountId=abc123

Response:
{
  "accountId": "abc123",
  "status": "pending",
  "waitMinutes": 60,
  "minutesPassed": 30,
  "minutesRemaining": 30,
  "isReady": false
}
```

### **8. List Pending Accounts**
```http
GET /api/telegram-flow/pending-list?ready=true

Response:
{
  "success": true,
  "total": 5,
  "accounts": [...]
}
```

### **9. Final Validate**
```http
POST /api/telegram-flow/final-validate
Content-Type: application/json

{
  "accountId": "abc123",
  "sessionString": "..."
}

Response:
{
  "success": true,
  "status": "accepted",
  "sessionCount": 1
}
```

### **10. Auto-Process** (Cron Job)
```http
POST /api/telegram-flow/auto-process
Authorization: Bearer {CRON_SECRET}

Response:
{
  "success": true,
  "processed": 10,
  "accepted": 8,
  "rejected": 2
}
```

---

## 🎨 Frontend Usage

### Using the Wizard Component

```tsx
import { TelegramFlowWizard } from '@/components/telegram-flow-wizard'

export default function VerificationPage() {
  return <TelegramFlowWizard />
}
```

The wizard handles:
- ✅ Phone number input
- ✅ OTP verification
- ✅ 2FA password (if needed)
- ✅ Automated password setup
- ✅ Automated session checks
- ✅ Pending status with countdown
- ✅ Final result display

---

## ⚙️ Configuration

### Country Wait Times

Edit in MongoDB `country_capacity` collection:

```javascript
{
  country_code: "+1",
  country_name: "United States",
  wait_time_minutes: 60,  // 1 hour
  max_capacity: 100,
  used_capacity: 0
}
```

### Default Settings

Edit in MongoDB `settings` collection:

```javascript
// Default wait time (fallback)
{
  setting_key: "default_wait_time_minutes",
  setting_value: "1440"  // 24 hours
}

// Default master password
{
  setting_key: "default_master_password",
  setting_value: "MP_secure_password_123"
}
```

---

## 🔍 Monitoring & Logs

### View Auto-Process Logs

```bash
tail -f /var/log/telegram-flow-cron.log
```

### Check Pending Accounts

```bash
curl http://localhost:3000/api/telegram-flow/pending-list
```

### Manual Processing

```bash
curl -X POST http://localhost:3000/api/telegram-flow/auto-process \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

---

## 📊 Account States

| Status | Description |
|--------|-------------|
| `checking_capacity` | Initial capacity check |
| `sending_otp` | Sending OTP to phone |
| `verifying_otp` | Verifying OTP code |
| `verifying_2fa` | Verifying 2FA password |
| `setting_password` | Setting master password |
| `checking_sessions` | Checking device sessions |
| `pending` | Waiting in queue |
| `final_validation` | Final validation in progress |
| `accepted` | ✅ Account accepted |
| `rejected` | ❌ Account rejected |

---

## 🎯 Rejection Reasons

| Reason | Description |
|--------|-------------|
| `COUNTRY_INACTIVE` | Country not accepting accounts |
| `NO_CAPACITY` | Country capacity full |
| `COUNTRY_NOT_SUPPORTED` | Country not configured |
| `ALREADY_SOLD` | Account already sold |
| `Fake Account - Unable to set master password` | Can't set password (fake) |
| `Multiple devices still active after final logout attempt` | Multiple devices detected |

---

## 🧪 Testing

### Manual Test Flow

```bash
# 1. Check capacity
curl -X POST http://localhost:3000/api/telegram-flow/check-capacity \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}'

# 2. Send OTP
# ... continue with other endpoints

# 3. Verify end-to-end with UI
# Visit: http://localhost:3000/verification
```

---

## 🚨 Troubleshooting

### Issue: Accounts stuck in pending

**Solution:** Check auto-process cron job:
```bash
crontab -l
tail -f /var/log/telegram-flow-cron.log
```

### Issue: All accounts rejected

**Solution:** Check session detection logic and wait times:
```bash
# Check settings
mongosh
> use telegram_accounts
> db.settings.find()
```

### Issue: OTP not received

**Solution:** Verify Telegram API credentials:
```bash
# Check .env
cat .env | grep API_
```

---

## 📚 Additional Resources

- [Telegram Flow Implementation](./TELEGRAM_FLOW_IMPLEMENTATION.md)
- [Authentication Flow Analysis](./AUTHENTICATION_FLOW_ANALYSIS.md)
- [Telegram API Documentation](https://core.telegram.org/api)

---

## ✅ Success Criteria

After setup, your system should:
1. ✅ Accept phone numbers with available capacity
2. ✅ Send and verify OTP codes
3. ✅ Handle 2FA accounts correctly
4. ✅ Set master passwords on all accounts
5. ✅ Detect and logout multiple device sessions
6. ✅ Queue accounts with country-specific wait times
7. ✅ Auto-process pending accounts every 10 minutes
8. ✅ Accept single-device accounts
9. ✅ Reject multi-device accounts after final logout fails
10. ✅ Increment country capacity on acceptance

---

## 🎉 You're All Set!

The Telegram Account Login & Verification Flow is now fully implemented and configured. The system will automatically process accounts according to the 12-phase flowchart.
