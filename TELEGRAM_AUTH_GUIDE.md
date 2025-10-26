# Telegram Account Session Management System

## Overview

This system allows users to log in with their Telegram phone number, receive an OTP via the Telegram app, and create a session file that is stored on the server. This is useful for selling Telegram accounts or automating Telegram operations.

## 🔑 API Used

**GramJS (Telegram JavaScript Library)**
- Official Telegram MTProto API implementation for Node.js
- Documentation: https://gram.js.org/
- GitHub: https://github.com/gram-js/gramjs

### Why GramJS?
- ✅ Full Telegram Client functionality (not just Bot API)
- ✅ TypeScript support (native to your Next.js app)
- ✅ Session string support (easy to save/load)
- ✅ Handles OTP, 2FA, and all authentication flows
- ✅ Can access all Telegram features (messages, channels, groups, etc.)

## 📁 File Structure

```
/workspaces/Newonereceiver/
├── lib/telegram/
│   └── auth.ts                 # Core authentication logic
├── app/api/telegram/auth/
│   ├── send-otp/route.ts       # POST: Send OTP to phone
│   ├── verify-otp/route.ts     # POST: Verify OTP & create session
│   ├── verify-2fa/route.ts     # POST: Verify 2FA password
│   └── sessions/route.ts       # GET: List sessions, DELETE: Remove session
├── components/
│   └── login-page.tsx          # Updated with real Telegram auth
└── telegram_sessions/          # Created automatically - stores .json session files
```

## 🔐 Environment Variables

Already configured in `.env.local`:

```bash
API_ID=23404078
API_HASH=6f05053d7edb7a3aa89049bd934922d1
```

These are obtained from https://my.telegram.org/apps

## 🚀 Authentication Flow

### Step 1: Send OTP

**User Action:** Enter phone number on login page

**API Call:**
```typescript
POST /api/telegram/auth/send-otp
Body: { phoneNumber: "+1234567890" }
Response: {
  success: true,
  phoneCodeHash: "abc123xyz...",
  message: "OTP sent successfully. Check your Telegram app."
}
```

**What Happens:**
- Creates a Telegram client connection
- Sends authentication code request to Telegram servers
- User receives 5-digit OTP in their Telegram app
- Returns `phoneCodeHash` (needed for verification)

### Step 2: Verify OTP

**User Action:** Enter 5-digit OTP from Telegram app

**API Call:**
```typescript
POST /api/telegram/auth/verify-otp
Body: {
  phoneNumber: "+1234567890",
  phoneCodeHash: "abc123xyz...",
  otpCode: "12345"
}

Response (Success):
{
  success: true,
  sessionString: "1AgAOMTQ3LjExxx...", // Long base64 string
  userId: "123456789",
  message: "Login successful! Session created."
}

Response (2FA Required):
{
  success: false,
  requires2FA: true,
  error: "Two-factor authentication required",
  message: "Please enter your 2FA password"
}
```

**What Happens:**
- Verifies OTP with Telegram servers
- If successful:
  - Creates session string (contains all auth data)
  - Gets user info (ID, name, etc.)
  - Saves session to file: `telegram_sessions/{phone}_{timestamp}.json`
- If 2FA enabled:
  - Returns `requires2FA: true`
  - User must enter password (Step 3)

### Step 3: Verify 2FA (Optional - only if account has 2FA)

**User Action:** Enter Telegram password

**API Call:**
```typescript
POST /api/telegram/auth/verify-2fa
Body: {
  phoneNumber: "+1234567890",
  sessionString: "1AgAOMTQ3LjExxx...",
  password: "mypassword123"
}

Response:
{
  success: true,
  userId: "123456789",
  message: "Login successful! Session created."
}
```

**What Happens:**
- Completes authentication with password
- Updates session file with full auth
- User is now logged in

## 📄 Session File Format

Sessions are stored in `telegram_sessions/` directory as JSON files:

**Filename:** `{phone_without_plus}_{timestamp}.json`

**Example:** `1234567890_1729900000000.json`

**Contents:**
```json
{
  "phoneNumber": "+1234567890",
  "sessionString": "1AgAOMTQ3LjExOC4xNzUuMjI2BuyGWg...",
  "createdAt": "2025-10-26T12:34:56.789Z",
  "userId": "123456789"
}
```

### What is `sessionString`?

The `sessionString` is a base64-encoded string containing:
- Authorization key
- Server salt
- User ID
- DC (Data Center) info
- All data needed to restore a Telegram session

**Important:** This string is equivalent to logged-in credentials. Keep it secure!

## 🔄 Using Saved Sessions

To use a saved session (e.g., for automation):

```typescript
import { loadSession } from '@/lib/telegram/auth'

const { success, client } = await loadSession('+1234567890')

if (success && client) {
  // Now you can use the client
  const me = await client.getMe()
  console.log(`Logged in as: ${me.firstName}`)
  
  // Send a message
  await client.sendMessage('username', { message: 'Hello!' })
  
  // Get dialogs (chats)
  const dialogs = await client.getDialogs()
  
  // Disconnect when done
  await client.disconnect()
}
```

## 🛠️ Management API

### List All Sessions

```typescript
GET /api/telegram/auth/sessions

Response:
{
  success: true,
  sessions: [
    {
      phoneNumber: "+1234567890",
      userId: "123456789",
      createdAt: "2025-10-26T12:34:56.789Z"
    }
  ]
}
```

### Delete a Session

```typescript
DELETE /api/telegram/auth/sessions
Body: { phoneNumber: "+1234567890" }

Response:
{
  success: true,
  message: "Session deleted successfully"
}
```

## 🎨 UI Integration

The login page (`components/login-page.tsx`) now has 3 steps:

1. **Phone Number Entry**
   - User enters phone number
   - Click "Continue" → Sends OTP

2. **OTP Verification**
   - 5 input boxes for OTP code
   - User checks Telegram app for code
   - Click "Verify OTP" → Creates session

3. **2FA Password (if needed)**
   - Only appears if account has 2FA enabled
   - User enters Telegram password
   - Click "Continue" → Completes login

## ⚠️ Important Security Notes

### Session File Security

1. **Never commit session files to Git**
   Add to `.gitignore`:
   ```
   telegram_sessions/
   *.session
   ```

2. **Restrict file permissions:**
   ```bash
   chmod 700 telegram_sessions/
   chmod 600 telegram_sessions/*.json
   ```

3. **Encrypt sessions if storing in database:**
   ```typescript
   import crypto from 'crypto'
   
   const algorithm = 'aes-256-cbc'
   const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')
   const iv = crypto.randomBytes(16)
   
   function encrypt(text: string) {
     const cipher = crypto.createCipheriv(algorithm, key, iv)
     let encrypted = cipher.update(text, 'utf8', 'hex')
     encrypted += cipher.final('hex')
     return iv.toString('hex') + ':' + encrypted
   }
   ```

### Rate Limiting

Telegram has rate limits:
- **OTP requests:** Max 5 per phone per hour
- **Login attempts:** Max 5 failed attempts before temp ban

Implement rate limiting:
```typescript
// In your API route
const attempts = await getLoginAttempts(phoneNumber)
if (attempts > 5) {
  return NextResponse.json(
    { success: false, error: 'Too many attempts. Try again later.' },
    { status: 429 }
  )
}
```

## 🧪 Testing

### Test the Flow

1. **Start development server:**
   ```bash
   pnpm dev
   ```

2. **Navigate to login page**

3. **Enter a valid phone number** (with country code, e.g., `+1234567890`)

4. **Check your Telegram app** for the OTP code

5. **Enter the 5-digit code**

6. **If 2FA is enabled**, enter your password

7. **Check the console logs:**
   ```
   [TelegramAuth] Session saved to: /workspaces/Newonereceiver/telegram_sessions/1234567890_1729900000000.json
   ```

8. **Verify the session file exists:**
   ```bash
   ls telegram_sessions/
   ```

### Test Session Loading

```typescript
// Create a test script: scripts/test-session.ts
import { loadSession } from '@/lib/telegram/auth'

async function test() {
  const { success, client } = await loadSession('+1234567890')
  
  if (success && client) {
    const me = await client.getMe()
    console.log('✅ Session valid:', me.firstName)
    await client.disconnect()
  } else {
    console.log('❌ Session invalid or not found')
  }
}

test()
```

Run: `npx tsx scripts/test-session.ts`

## 📊 Use Cases

### 1. Selling Telegram Accounts

- User logs in with their phone
- Session file is created
- Seller can download the session file
- Buyer loads the session file to access the account

### 2. Telegram Automation

- Create sessions for multiple accounts
- Use sessions to:
  - Send bulk messages
  - Join channels automatically
  - Scrape data from chats
  - Monitor for new messages

### 3. Account Backup

- Users can backup their session
- Restore access on a new device
- No need to re-verify phone number

## 🔧 Advanced Features

### Session Pooling

Manage multiple sessions:

```typescript
import { loadSession } from '@/lib/telegram/auth'

class SessionPool {
  private clients: Map<string, TelegramClient> = new Map()
  
  async getClient(phoneNumber: string) {
    if (!this.clients.has(phoneNumber)) {
      const { success, client } = await loadSession(phoneNumber)
      if (success && client) {
        this.clients.set(phoneNumber, client)
      }
    }
    return this.clients.get(phoneNumber)
  }
  
  async disconnectAll() {
    for (const client of this.clients.values()) {
      await client.disconnect()
    }
    this.clients.clear()
  }
}

export const sessionPool = new SessionPool()
```

### Auto-Reconnect

```typescript
async function withAutoReconnect(phoneNumber: string, callback: (client: TelegramClient) => Promise<void>) {
  let { success, client } = await loadSession(phoneNumber)
  
  if (!success || !client) {
    throw new Error('Session not found')
  }
  
  try {
    await callback(client)
  } catch (error: any) {
    if (error.message.includes('AUTH_KEY_UNREGISTERED')) {
      // Session expired, need to re-authenticate
      console.log('Session expired. Please log in again.')
      deleteSession(phoneNumber)
    }
    throw error
  } finally {
    await client.disconnect()
  }
}
```

## 🐛 Troubleshooting

### "Could not find the 'telegram' module"

```bash
pnpm add telegram input
```

### "API_ID or API_HASH not defined"

Check `.env.local` has:
```
API_ID=23404078
API_HASH=6f05053d7edb7a3aa89049bd934922d1
```

### "PHONE_NUMBER_INVALID"

- Ensure phone includes country code (e.g., `+1` for US)
- No spaces or special characters
- Format: `+[country_code][phone_number]`

### "SESSION_PASSWORD_NEEDED"

- Account has 2FA enabled
- User must enter password in Step 3
- Cannot bypass if 2FA is enabled

### "FLOOD_WAIT_X"

- Hit Telegram rate limit
- Must wait X seconds
- Implement exponential backoff

### Session file not created

Check permissions:
```bash
ls -la telegram_sessions/
chmod 700 telegram_sessions/
```

## 📚 Additional Resources

- **GramJS Docs:** https://gram.js.org/
- **Telegram API Docs:** https://core.telegram.org/api
- **MTProto Protocol:** https://core.telegram.org/mtproto
- **Get API credentials:** https://my.telegram.org/apps

## ✅ Next Steps

1. ✅ **Installed:** GramJS library
2. ✅ **Created:** Authentication library (`lib/telegram/auth.ts`)
3. ✅ **Created:** API endpoints for OTP and verification
4. ✅ **Updated:** Login page with real Telegram auth
5. ⏳ **Test:** Try logging in with a real phone number
6. ⏳ **Secure:** Add rate limiting and session encryption
7. ⏳ **Deploy:** Ensure `telegram_sessions/` directory exists on server

---

**Status:** Ready to test! 🚀

Try logging in with your phone number and check if the session file is created in `telegram_sessions/` directory.
