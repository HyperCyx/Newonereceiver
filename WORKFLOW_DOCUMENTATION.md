# Telegram Account Verification and Session Management Workflow

## Overview

This document describes the comprehensive verification workflow for Telegram accounts as implemented in the codebase. The workflow ensures security, prevents fraud, and manages multiple device sessions.

## Workflow Diagram

```
graph TD
    A[Enter Telegram Number] --> B{Database Check}
    B --> C{Capacity Available & Not Sold?}
    C -->|No| D[Reject - No Capacity/Sold]
    C -->|Yes| E[Send Telegram OTP]
    
    E --> F[User Enters OTP]
    F --> G{OTP Correct?}
    G -->|No| H[Invalid OTP - Error]
    G -->|Yes| I{Account Type?}
    
    I -->|Direct Login| J[Login Successful]
    I -->|Password Required| K[Ask for Account Password]
    
    K --> L[User Enters Password]
    L --> M{Password Correct?}
    M -->|No| N[Wrong Password - Error]
    M -->|Yes| O[Login Successful]
    
    J --> P[Set Master Password Background]
    O --> P
    
    P --> Q{Master Password Set/Changed?}
    Q -->|Failed| R[Reject - Fake Account]
    Q -->|Success| S[Check Active Device Sessions]
    
    S --> T{Multiple Devices Logged In?}
    T -->|Yes| U[Logout All Other Devices]
    T -->|No| V[Proceed Normally]
    
    U --> W{Logout Successful?}
    W -->|Yes| V
    W -->|No| X[Continue with Multiple Sessions]
    
    V --> Y[Go to Pending List]
    X --> Y
    
    Y --> Z[Apply Country Wait Time]
    Z --> AA[Wait Complete - Check Sessions Again]
    
    AA --> BB{Multiple Devices Still Active?}
    BB -->|Yes| CC[Force Logout Attempt]
    BB -->|No| DD[Account Accepted - Single Device]
    
    CC --> EE{Logout Successful?}
    EE -->|Yes| DD
    EE -->|No| FF[Reject - Security Risk]
    
    DD --> GG[Account Active - Normal Functions]
    R --> HH[Remove from Pending]
    FF --> HH
```

## Architecture

### Core Components

1. **Session Manager** (`lib/telegram/session-manager.ts`)
   - Check active device sessions
   - Logout other devices
   - Force reset all authorizations
   - Detect multiple device usage

2. **Master Password Manager** (`lib/telegram/master-password.ts`)
   - Check if 2FA is enabled
   - Set master password (auto-generate)
   - Change existing master password
   - Detect fake accounts

3. **Workflow Orchestrator** (`lib/telegram/account-verification-workflow.ts`)
   - Complete workflow implementation
   - Step-by-step processing
   - Error handling and rollback
   - Decision making logic

4. **Pending List Manager** (`lib/telegram/pending-list-manager.ts`)
   - Manage pending accounts
   - Apply country-specific wait times
   - Auto-process accounts after wait time
   - Manual approve/reject functionality

## Workflow Steps

### Step 1: Phone Number Entry & Eligibility Check

**API Endpoint:** `POST /api/telegram/verify/check-eligibility`

**Request:**
```json
{
  "phoneNumber": "+1234567890",
  "telegramId": 123456789
}
```

**Checks:**
- Phone number format validation
- Database check for existing submissions
- Country capacity verification
- User eligibility

**Possible Outcomes:**
- ✅ Eligible - Proceed to OTP
- ❌ Already sold to another user
- ❌ Already accepted/rejected
- ❌ Country capacity full

### Step 2-4: OTP Verification

**API Endpoint:** `POST /api/telegram/auth/send-otp`

**Request:**
```json
{
  "phoneNumber": "+1234567890",
  "telegramId": 123456789,
  "countryCode": "+1"
}
```

**Response:**
```json
{
  "success": true,
  "phoneCodeHash": "abc123...",
  "sessionString": "session_data...",
  "message": "OTP sent successfully"
}
```

**Then verify:** `POST /api/telegram/auth/verify-otp`

**Request:**
```json
{
  "phoneNumber": "+1234567890",
  "phoneCodeHash": "abc123...",
  "otpCode": "12345",
  "sessionString": "session_data...",
  "telegramId": 123456789
}
```

**Possible Outcomes:**
- ✅ OTP Verified - Direct login (no 2FA)
- 🔐 OTP Verified - 2FA required
- ❌ Invalid OTP

### Step 5-6: 2FA Password Verification (if required)

**API Endpoint:** `POST /api/telegram/auth/verify-2fa`

**Request:**
```json
{
  "phoneNumber": "+1234567890",
  "sessionString": "session_data...",
  "password": "user_password",
  "telegramId": 123456789
}
```

**Possible Outcomes:**
- ✅ Password Verified - Proceed
- ❌ Invalid password

### Step 7: Master Password Setup (Background)

**Automatic Process** - Runs in background after OTP/2FA verification

**Purpose:**
- Set or change account's master password
- Generate random secure password
- Detect fake/restricted accounts

**Possible Outcomes:**
- ✅ Master password set successfully
- ❌ Failed - Account rejected as FAKE

### Step 8-9: Device Session Management

**Automatic Process** - Runs after master password setup

**Purpose:**
- Check for multiple active devices
- Logout other devices
- Ensure single device access

**Actions:**
1. Check active sessions via Telegram API
2. If multiple devices: logout all others
3. Log success/failure

**Possible Outcomes:**
- ✅ Single device - Proceed
- ✅ Multiple devices - Logged out successfully
- ⚠️ Multiple devices - Failed to logout (continues with warning)

### Step 10: Add to Pending List

**Automatic Process** - Account added to pending list

**Data Stored:**
```javascript
{
  user_id: "user_id",
  phone_number: "+1234567890",
  amount: 10.00,
  status: "pending",
  session_string: "session_data...",
  telegram_user_id: "telegram_id",
  wait_time_minutes: 1440, // 24 hours
  country_code: "+1",
  country_name: "United States",
  created_at: "2025-10-30T12:00:00Z",
  updated_at: "2025-10-30T12:00:00Z"
}
```

### Step 11-13: Final Decision (After Wait Time)

**Automatic Process** - Runs via cron job every 10 minutes

**API Endpoint:** `GET /api/telegram/cron/process-pending`

**Process:**
1. Find accounts where wait time has elapsed
2. Check active sessions again
3. If multiple devices: Force logout
4. Make final decision:
   - ✅ Accept if single device
   - ❌ Reject if multiple devices (security risk)

## API Endpoints

### Verification Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/telegram/verify/check-eligibility` | POST | Check phone eligibility | No |
| `/api/telegram/verify/complete-workflow` | POST | Run complete workflow | No |
| `/api/telegram/verify/session-check` | POST | Check/manage sessions | No |
| `/api/telegram/verify/master-password` | POST | Set master password | No |

### Pending List Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/telegram/pending/status` | GET | Get account status | No |
| `/api/telegram/pending/list` | GET | List pending accounts | User/Admin |
| `/api/telegram/pending/process` | POST | Process pending accounts | Admin |
| `/api/telegram/pending/approve` | POST | Manually approve account | Admin |
| `/api/telegram/pending/reject` | POST | Manually reject account | Admin |

### Cron Job Endpoint

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/telegram/cron/process-pending` | GET/POST | Auto-process pending accounts | Cron Secret |

## Database Schema

### Accounts Collection

```javascript
{
  _id: ObjectId,
  user_id: String,              // Reference to users collection
  phone_number: String,          // Unique phone number
  amount: Number,                // Prize amount
  status: String,                // 'pending', 'accepted', 'rejected'
  session_string: String,        // Telegram session string
  telegram_user_id: String,      // Telegram user ID
  wait_time_minutes: Number,     // Country-specific wait time
  country_code: String,          // Country code (e.g., +1)
  country_name: String,          // Country name
  created_at: Date,              // When account was submitted
  updated_at: Date,              // Last update
  approved_at: Date,             // When approved (if accepted)
  rejected_at: Date,             // When rejected (if rejected)
  rejection_reason: String,      // Reason for rejection
  auto_approved: Boolean         // Was it auto-approved?
}
```

### Country Capacity Collection

```javascript
{
  _id: ObjectId,
  country_code: String,          // Country code (e.g., +1)
  country_name: String,          // Country name
  max_capacity: Number,          // Maximum accounts allowed
  used_capacity: Number,         // Current usage
  prize_amount: Number,          // Prize per account
  auto_approve_minutes: Number,  // Wait time for auto-approval
  is_active: Boolean,            // Is country active?
  created_at: Date,
  updated_at: Date
}
```

## Cron Job Setup

### Vercel Cron (vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/telegram/cron/process-pending",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

**Schedule:** Every 10 minutes

**Environment Variable Required:**
```bash
CRON_SECRET=your-secret-key-here
```

### Alternative: External Cron Service

Use services like:
- **cron-job.org**
- **EasyCron**
- **GitHub Actions**

Configure to call:
```bash
curl -X GET "https://your-domain.com/api/telegram/cron/process-pending" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Security Features

### 1. Master Password Detection
- Automatically sets/changes master password
- Detects fake accounts that don't allow password changes
- Rejects accounts immediately if password setup fails

### 2. Multi-Device Detection
- Checks active sessions at submission time
- Checks again after wait time
- Force logout capability
- Rejects accounts with persistent multiple devices

### 3. Country Capacity Limits
- Prevents over-submission from specific countries
- Configurable capacity per country
- Real-time capacity checking

### 4. Wait Time Verification
- Country-specific wait times
- Allows accounts to "settle"
- Second verification after wait time

### 5. Database Uniqueness
- Phone numbers are unique globally
- Prevents duplicate submissions
- Tracks submission history

## Usage Examples

### User Flow

1. **User enters phone number**
   ```javascript
   POST /api/telegram/verify/check-eligibility
   { phoneNumber: "+1234567890", telegramId: 123 }
   ```

2. **System sends OTP**
   ```javascript
   POST /api/telegram/auth/send-otp
   { phoneNumber: "+1234567890", telegramId: 123 }
   ```

3. **User enters OTP**
   ```javascript
   POST /api/telegram/auth/verify-otp
   { phoneNumber: "+1234567890", otpCode: "12345", ... }
   ```

4. **System runs background verification**
   - Sets master password
   - Manages sessions
   - Adds to pending list

5. **User waits for approval**
   ```javascript
   GET /api/telegram/pending/status?phoneNumber=+1234567890
   ```

6. **System auto-processes after wait time**
   - Cron job runs every 10 minutes
   - Final session check
   - Accept or reject decision

### Admin Actions

**View all pending accounts:**
```javascript
GET /api/telegram/pending/list?admin=true
```

**Manually approve account:**
```javascript
POST /api/telegram/pending/approve
{ phoneNumber: "+1234567890" }
```

**Manually reject account:**
```javascript
POST /api/telegram/pending/reject
{ phoneNumber: "+1234567890", reason: "Invalid account" }
```

**Force process all pending:**
```javascript
POST /api/telegram/pending/process
```

## Error Handling

### Common Errors

| Error Code | Description | Action |
|------------|-------------|--------|
| `PHONE_ALREADY_SOLD` | Phone submitted by another user | Reject |
| `PHONE_ALREADY_ACCEPTED` | Phone already accepted | Show status |
| `PHONE_ALREADY_REJECTED` | Phone already rejected | Reject |
| `CAPACITY_FULL` | Country capacity reached | Reject |
| `FAKE_ACCOUNT_DETECTED` | Failed master password setup | Reject |
| `SECURITY_RISK_MULTIPLE_SESSIONS` | Multiple devices active | Reject |
| `INVALID_PHONE_FORMAT` | Bad phone format | Reject |
| `USER_NOT_FOUND` | User doesn't exist | Error |

## Monitoring & Logs

### Log Patterns

```
[Workflow] Step X: Description
[SessionManager] Action description
[MasterPassword] Action description
[PendingList] Action description
[CronJob] Action description
```

### Key Metrics to Monitor

1. **Pending accounts count**
2. **Auto-approval success rate**
3. **Rejection reasons distribution**
4. **Average wait time**
5. **Multiple device detection rate**
6. **Fake account detection rate**

## Troubleshooting

### Issue: Accounts stuck in pending

**Solution:** 
- Check cron job is running
- Manually trigger: `POST /api/telegram/pending/process`
- Verify wait time settings

### Issue: High rejection rate

**Check:**
- Session management errors
- Master password setup failures
- Multiple device detections

### Issue: Cron job not running

**Verify:**
- `vercel.json` configuration
- `CRON_SECRET` environment variable
- Cron job logs in Vercel dashboard

## Migration

To apply the new schema to existing database:

```bash
# Run migration script
npm run migrate:009

# Or directly
npx ts-node scripts/009_update_accounts_schema.ts
```

## Testing

### Test Workflow Manually

```bash
# 1. Check eligibility
curl -X POST http://localhost:3000/api/telegram/verify/check-eligibility \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+1234567890","telegramId":123}'

# 2. Send OTP
curl -X POST http://localhost:3000/api/telegram/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+1234567890","telegramId":123}'

# 3. Verify OTP
curl -X POST http://localhost:3000/api/telegram/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+1234567890","otpCode":"12345","phoneCodeHash":"...","sessionString":"...","telegramId":123}'

# 4. Check status
curl http://localhost:3000/api/telegram/pending/status?phoneNumber=+1234567890

# 5. Process pending (admin)
curl -X POST http://localhost:3000/api/telegram/pending/process \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

## Support

For issues or questions:
1. Check logs for detailed error messages
2. Review this documentation
3. Check database records
4. Contact development team

---

**Last Updated:** 2025-10-30
**Version:** 1.0.0
