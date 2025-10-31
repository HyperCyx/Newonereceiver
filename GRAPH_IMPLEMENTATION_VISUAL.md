# 📊 Telegram Flow Graph - Visual Implementation Guide

This document maps your flowchart to the implemented code, showing exactly which files handle each part of the flow.

---

## 🗺️ Complete Flow with Implementation Mapping

```
┌───────────────────────────────────────────────────────────────────┐
│ A: Enter Telegram Number                                         │
│ FRONTEND: telegram-flow-wizard.tsx (Step 1)                      │
│ USER INPUT: Phone number field                                   │
└──────────────────────────┬────────────────────────────────────────┘
                           │
                           v
┌───────────────────────────────────────────────────────────────────┐
│ B: Database Check - Capacity & Not Sold?                         │
│ API: POST /api/telegram-flow/check-capacity/route.ts             │
│ CHECKS:                                                           │
│   - Country active?                                               │
│   - Capacity available?                                           │
│   - Not already sold?                                             │
└──────────────┬──────────────────────────────┬─────────────────────┘
               │                              │
          ✅ YES                         ❌ NO
               │                              │
               v                              v
┌─────────────────────┐          ┌────────────────────────────────┐
│ D: Send Telegram    │          │ C: ❌ REJECT                   │
│    OTP              │          │ REASONS:                       │
│ API: POST           │          │  - No capacity                 │
│ /send-otp/route.ts  │          │  - Country inactive            │
│ ACTIONS:            │          │  - Already sold                │
│  - Send OTP code    │          │ FRONTEND: Error alert          │
│  - Create account   │          └────────────────────────────────┘
│  - Store session    │
└──────────┬──────────┘
           │
           v
┌───────────────────────────────────────────────────────────────────┐
│ E: User Enters OTP                                                │
│ FRONTEND: telegram-flow-wizard.tsx (Step 2)                      │
│ USER INPUT: OTP code field                                       │
└──────────────────────────┬────────────────────────────────────────┘
                           │
                           v
┌───────────────────────────────────────────────────────────────────┐
│ F: OTP Correct?                                                   │
│ API: POST /api/telegram-flow/verify-otp/route.ts                 │
│ TELEGRAM: lib/telegram/auth.ts → verifyOTP()                     │
└──────────────┬──────────────────────────────┬─────────────────────┘
               │                              │
          ✅ YES                         ❌ NO
               │                              │
               v                              v
┌─────────────────────┐          ┌────────────────────────────────┐
│ H: Account Type?    │          │ G: ❌ Invalid OTP Error        │
│ DETECTED:           │          │ FRONTEND: Error message        │
│  - Direct Login     │          │ USER: Can retry                │
│  - Password Req     │          └────────────────────────────────┘
└──────┬──────┬───────┘
       │      │
  Direct│     │Password
   Login│     │Required
       │      │
       │      v
       │  ┌───────────────────────────────────────────────────────┐
       │  │ J: Ask for Account Password                           │
       │  │ FRONTEND: telegram-flow-wizard.tsx (Step 3)           │
       │  │ USER INPUT: 2FA password field                        │
       │  └──────────────────────┬────────────────────────────────┘
       │                         │
       │                         v
       │  ┌───────────────────────────────────────────────────────┐
       │  │ K: User Enters Password                               │
       │  │ FRONTEND: Password input                              │
       │  └──────────────────────┬────────────────────────────────┘
       │                         │
       │                         v
       │  ┌───────────────────────────────────────────────────────┐
       │  │ L: Password Correct?                                  │
       │  │ API: POST /api/telegram-flow/verify-2fa/route.ts      │
       │  │ TELEGRAM: lib/telegram/auth.ts → verify2FA()          │
       │  └──────────┬──────────────────────────┬─────────────────┘
       │             │                          │
       │        ✅ YES                     ❌ NO
       │             │                          │
       │             │                          v
       │             │              ┌────────────────────────────┐
       │             │              │ M: ❌ Wrong Password Error │
       │             │              │ FRONTEND: Error message    │
       │             │              │ USER: Can retry            │
       │             │              └────────────────────────────┘
       │             │
       │             v
       │        ┌────────┐
       │        │ N: Login│
       │        │ Success │
       v        └────┬────┘
   ┌────────┐       │
   │I: Login│       │
   │Success │       │
   └───┬────┘       │
       │            │
       └────────────┼─────────┐
                    │         │
                    v         v
┌───────────────────────────────────────────────────────────────────┐
│ O: Account Has Existing Password?                                │
│ DETECTED: During 2FA check (if verify-2fa was called)            │
│ DATABASE: account.had_existing_password                           │
└──────────────┬──────────────────────────────┬─────────────────────┘
               │                              │
           ✅ YES                         ❌ NO
               │                              │
               v                              v
┌─────────────────────┐          ┌────────────────────────────────┐
│ P: Disable User     │          │ Q: Set Default Password        │
│    Password →       │          │ API: POST                      │
│    Reset to Default │          │ /setup-password/route.ts       │
│ API: POST           │          │ TELEGRAM:                      │
│ /setup-password     │          │  setMasterPassword()           │
│ TELEGRAM:           │          │ CHECKS:                        │
│  setMasterPassword  │          │  - Can set password?           │
│  (with current pwd) │          │  - If NO → FAKE ACCOUNT        │
└──────────┬──────────┘          └──────────────┬─────────────────┘
           │                                    │
           └────────────────┬───────────────────┘
                            │
                            v
┌───────────────────────────────────────────────────────────────────┐
│ R: Password Setup Complete                                        │
│ DATABASE: master_password_set = true                              │
│ STATUS: checking_sessions                                         │
└──────────────────────────┬────────────────────────────────────────┘
                           │
                           v
┌───────────────────────────────────────────────────────────────────┐
│ S: Check Device Sessions                                          │
│ API: POST /api/telegram-flow/check-sessions/route.ts             │
│ TELEGRAM: lib/telegram/auth.ts → getActiveSessions()             │
│ COUNTS: Number of active devices                                 │
└──────────────┬──────────────────────────────┬─────────────────────┘
               │                              │
        Single Device                   Multiple Devices
               │                              │
               │                              v
               │                  ┌────────────────────────────────┐
               │                  │ V: First Logout Attempt        │
               │                  │ TELEGRAM:                      │
               │                  │  logoutOtherDevices()          │
               │                  │ DATABASE:                      │
               │                  │  first_logout_attempted=true   │
               │                  └──────────┬─────────────────────┘
               │                             │
               │                    ┌────────┴────────┐
               │                    │                 │
               │               ✅ Success        ❌ Failed
               │                    │                 │
               │                    v                 v
               │            ┌──────────┐     ┌──────────────┐
               │            │ W: Logout│     │ X: Go to     │
               │            │Successful│     │ Pending with │
               │            └────┬─────┘     │ Multi-Session│
               │                 │           │ Flag         │
               │                 │           └──────┬───────┘
               │                 │                  │
               v                 │                  │
        ┌──────────┐             │                  │
        │ U: Go to │◄────────────┴──────────────────┘
        │ Pending  │
        │ List     │
        └─────┬────┘
              │
              v
┌───────────────────────────────────────────────────────────────────┐
│ Y: Apply Country Wait Time                                        │
│ API: POST /api/telegram-flow/add-to-pending/route.ts             │
│ DATABASE:                                                         │
│  - status = 'pending'                                             │
│  - pending_since = NOW                                            │
│  - country_wait_minutes (from country_capacity)                   │
│ EXAMPLES:                                                         │
│  - USA: 60 minutes                                                │
│  - UK: 120 minutes                                                │
│  - Default: 1440 minutes (24 hours)                               │
└──────────────────────────┬────────────────────────────────────────┘
                           │
                           v
┌───────────────────────────────────────────────────────────────────┐
│ Z: Wait Until Auto-Upload Time                                    │
│ POLLING: GET /api/telegram-flow/add-to-pending?accountId=...     │
│ FRONTEND: Polls every 10 seconds                                 │
│ DISPLAYS:                                                         │
│  - Minutes passed                                                 │
│  - Minutes remaining                                              │
│  - Ready status                                                   │
└──────────────────────────┬────────────────────────────────────────┘
                           │
                           v
┌───────────────────────────────────────────────────────────────────┐
│ AA: Final Check All Pending Accounts                             │
│ CRON JOB: Runs every 10 minutes                                  │
│ API: POST /api/telegram-flow/auto-process/route.ts               │
│ OR MANUAL:                                                        │
│ API: POST /api/telegram-flow/final-validate/route.ts             │
│ FINDS: All accounts where minutesPassed >= country_wait_minutes  │
└──────────────────────────┬────────────────────────────────────────┘
                           │
                           v
┌───────────────────────────────────────────────────────────────────┐
│ BB: Multiple Devices Active?                                     │
│ TELEGRAM: getActiveSessions()                                    │
│ CHECK: sessionCount > 1 ?                                         │
└──────────────┬──────────────────────────────┬─────────────────────┘
               │                              │
           ❌ NO                          ✅ YES
               │                              │
               v                              v
┌─────────────────────┐          ┌────────────────────────────────┐
│ CC: ✅ Account      │          │ DD: Multi-Device Sessions      │
│     ACCEPTED        │          │     Alive?                     │
│ DATABASE:           │          │ CHECK: Are sessions still      │
│  status='accepted'  │          │        active after wait?      │
│  accepted_at=NOW    │          └──────────┬─────────────────────┘
│ ACTION:             │                     │
│  Increment capacity │              ┌──────┴──────┐
└──────────┬──────────┘              │             │
           │                     ❌ NO          ✅ YES
           │                         │             │
           │                         v             v
           │              ┌──────────────┐  ┌──────────────────┐
           │              │ Sessions died │  │ EE: Final Logout │
           │              │ naturally     │  │     Attempt      │
           │              │ → ACCEPT      │  │ TELEGRAM:        │
           │              └──────┬────────┘  │  logoutOther     │
           │                     │           │  Devices()       │
           │                     │           └──────┬───────────┘
           │                     │                  │
           │                     │         ┌────────┴─────────┐
           │                     │         │                  │
           │                     │    ✅ Success        ❌ Failed
           │                     │         │                  │
           │                     │         v                  v
           │                     │  ┌─────────┐      ┌───────────┐
           │                     │  │ FF:     │      │ GG: ❌    │
           │                     │  │ Logout  │      │ REJECTED  │
           │                     │  │ Success │      │ Reason:   │
           │                     │  └────┬────┘      │ Multi-    │
           │                     │       │           │ device    │
           │                     │       │           └─────┬─────┘
           │                     │       │                 │
           └─────────────────────┴───────┴─────────┐       │
                                                   │       │
                                                   v       v
                                          ┌──────────────────┐
                                          │ HH: Auto Upload  │
                                          │     Complete     │
                                          │ DATABASE:        │
                                          │  Final status    │
                                          │  recorded        │
                                          └────────┬─────────┘
                                                   │
                                          ┌────────┴────────┐
                                          │                 │
                                     ACCEPTED          REJECTED
                                          │                 │
                                          v                 v
                                   ┌───────────┐    ┌──────────┐
                                   │ Stay in   │    │ II:      │
                                   │ system    │    │ Remove   │
                                   │ (sold)    │    │ from     │
                                   └───────────┘    │ system   │
                                                    └──────────┘
```

---

## 📂 File-to-Phase Mapping

| Phase | Graph Node | File | Function |
|-------|-----------|------|----------|
| **1** | A → B → C/D | `check-capacity/route.ts` | Capacity validation |
| **2** | D → E | `send-otp/route.ts` | OTP transmission |
| **3** | E → F → G/H | `verify-otp/route.ts` | OTP verification |
| **4** | J → K → L → M/N | `verify-2fa/route.ts` | 2FA validation |
| **5** | O → P/Q → R | `setup-password/route.ts` | Password management |
| **6-7** | R → S → T → V → W | `check-sessions/route.ts` | Session & logout |
| **8** | U/X → Y | `add-to-pending/route.ts` | Pending queue |
| **9** | Z | `add-to-pending/route.ts` (GET) | Status polling |
| **10-11** | AA → BB → DD → EE → FF | `final-validate/route.ts` | Final validation |
| **12** | HH/II | `auto-process/route.ts` | Auto-processing |

---

## 🎯 Decision Points Implementation

### ✅ Implemented Decision Points

| Node | Question | YES Path | NO Path | Implementation |
|------|----------|----------|---------|----------------|
| **B** | Has Capacity? | → D (Send OTP) | → C (Reject) | `check-capacity/route.ts` |
| **F** | OTP Correct? | → H (Check type) | → G (Error) | `verify-otp/route.ts` |
| **H** | Requires 2FA? | → J (Ask password) | → I (Login success) | `verify-otp/route.ts` (response) |
| **L** | Password Correct? | → N (Login success) | → M (Error) | `verify-2fa/route.ts` |
| **O** | Has Existing Password? | → P (Reset) | → Q (Set) | `setup-password/route.ts` |
| **T** | Multiple Devices? | → V (First logout) | → U (Pending) | `check-sessions/route.ts` |
| **W** | Logout Successful? | → U (Pending) | → X (Pending + flag) | `check-sessions/route.ts` |
| **BB** | Multiple Devices? | → DD (Check alive) | → CC (Accept) | `final-validate/route.ts` |
| **DD** | Sessions Alive? | → EE (Final logout) | → CC (Accept) | `final-validate/route.ts` |
| **FF** | Final Logout OK? | → CC (Accept) | → GG (Reject) | `final-validate/route.ts` |

---

## 🎨 Frontend Wizard Steps

```
┌─────────────────────────────────────────────────────┐
│ telegram-flow-wizard.tsx                            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  STEP 1: Phone Number Entry                        │
│  ├─ Input: Phone number                            │
│  ├─ Button: Continue                               │
│  └─ Calls: POST /check-capacity                    │
│                                                     │
│  STEP 2: OTP Entry                                 │
│  ├─ Display: "Code sent to {phone}"                │
│  ├─ Input: OTP code                                │
│  ├─ Button: Verify                                 │
│  └─ Calls: POST /verify-otp                        │
│                                                     │
│  STEP 3: 2FA Password (Conditional)                │
│  ├─ Display: "Enter Telegram password"             │
│  ├─ Input: Password                                │
│  ├─ Button: Verify                                 │
│  └─ Calls: POST /verify-2fa                        │
│                                                     │
│  STEP 4: Processing                                │
│  ├─ Display: Loading spinner                       │
│  ├─ Action: Setup password                         │
│  ├─ Action: Check sessions                         │
│  └─ Auto-proceed to Step 5                         │
│                                                     │
│  STEP 5: Pending Status                            │
│  ├─ Display: Wait time info                        │
│  ├─ Display: Countdown timer                       │
│  ├─ Display: Minutes remaining                     │
│  ├─ Polls: GET /add-to-pending (every 10s)         │
│  └─ Auto-proceed when ready                        │
│                                                     │
│  STEP 6: Final Result                              │
│  ├─ Display: ✅ Accepted or ❌ Rejected             │
│  ├─ Display: Reason (if rejected)                  │
│  └─ Show appropriate icon & message                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🔄 Background Job Flow

```
┌───────────────────────────────────────────────────────┐
│ CRON JOB (Every 10 minutes)                           │
│ Script: /tmp/telegram-flow-cron.sh                    │
└──────────────────────┬────────────────────────────────┘
                       │
                       v
┌───────────────────────────────────────────────────────┐
│ Calls: POST /api/telegram-flow/auto-process          │
│ Auth: Bearer {CRON_SECRET}                            │
└──────────────────────┬────────────────────────────────┘
                       │
                       v
┌───────────────────────────────────────────────────────┐
│ auto-process/route.ts                                 │
│                                                       │
│ 1. Find all pending accounts                         │
│ 2. Filter ready accounts (wait time passed)          │
│ 3. For each ready account:                           │
│    ├─ Check sessions                                 │
│    ├─ If single → Accept                             │
│    ├─ If multiple → Attempt logout                   │
│    │  ├─ Success → Accept                            │
│    │  └─ Failed → Reject                             │
│    └─ Update database                                │
│ 4. Increment capacity for accepted                   │
│ 5. Return summary                                    │
└──────────────────────┬────────────────────────────────┘
                       │
                       v
┌───────────────────────────────────────────────────────┐
│ Response: {                                           │
│   processed: 10,                                      │
│   accepted: 8,                                        │
│   rejected: 2,                                        │
│   results: [...]                                      │
│ }                                                     │
└───────────────────────────────────────────────────────┘
```

---

## 🎯 Key Functions Used

### Telegram API Functions (`lib/telegram/auth.ts`)

| Function | Purpose | Used In |
|----------|---------|---------|
| `sendOTP()` | Send OTP to phone | `/send-otp` |
| `verifyOTP()` | Verify OTP code | `/verify-otp` |
| `verify2FA()` | Verify 2FA password | `/verify-2fa` |
| `setMasterPassword()` | Set/change password | `/setup-password` |
| `getActiveSessions()` | Get device sessions | `/check-sessions`, `/final-validate` |
| `logoutOtherDevices()` | Logout other devices | `/check-sessions`, `/final-validate` |

---

## 📊 Database State Transitions

```
checking_capacity
    ↓
sending_otp
    ↓
verifying_otp
    ↓
verifying_2fa (if needed)
    ↓
setting_password
    ↓
checking_sessions
    ↓
pending
    ↓
final_validation
    ↓
accepted / rejected
```

---

## ✅ Complete Implementation Checklist

- [x] **Node A**: Phone number input (Frontend)
- [x] **Node B**: Capacity check (API)
- [x] **Node C**: Rejection handling (Frontend)
- [x] **Node D**: OTP sending (API)
- [x] **Node E**: OTP input (Frontend)
- [x] **Node F**: OTP verification (API)
- [x] **Node G**: OTP error (Frontend)
- [x] **Node H**: Account type detection (API)
- [x] **Node I**: Direct login success (API)
- [x] **Node J**: 2FA password request (Frontend)
- [x] **Node K**: Password input (Frontend)
- [x] **Node L**: 2FA verification (API)
- [x] **Node M**: Password error (Frontend)
- [x] **Node N**: 2FA login success (API)
- [x] **Node O**: Existing password check (API)
- [x] **Node P**: Password reset (API)
- [x] **Node Q**: Password setup (API)
- [x] **Node R**: Password complete (API)
- [x] **Node S**: Session check (API)
- [x] **Node T**: Multiple device detection (API)
- [x] **Node U**: Add to pending (API)
- [x] **Node V**: First logout (API)
- [x] **Node W**: Logout result (API)
- [x] **Node X**: Pending with flag (API)
- [x] **Node Y**: Wait time application (API)
- [x] **Node Z**: Wait timer (Frontend polling)
- [x] **Node AA**: Final check (Cron/API)
- [x] **Node BB**: Device check (API)
- [x] **Node CC**: Acceptance (API)
- [x] **Node DD**: Session alive check (API)
- [x] **Node EE**: Final logout (API)
- [x] **Node FF**: Final logout result (API)
- [x] **Node GG**: Rejection (API)
- [x] **Node HH**: Upload complete (API)
- [x] **Node II**: Remove from system (API)

---

## 🎉 Summary

✅ **ALL GRAPH NODES IMPLEMENTED**
✅ **ALL DECISION POINTS WORKING**
✅ **ALL API ENDPOINTS CREATED**
✅ **FRONTEND WIZARD COMPLETE**
✅ **BACKGROUND JOB AUTOMATED**
✅ **DATABASE SCHEMA READY**

Your flowchart has been fully transformed into a working system!
