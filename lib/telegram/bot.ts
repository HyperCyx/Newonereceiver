const TELEGRAM_API_URL = "https://api.telegram.org/bot"
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const WEB_APP_URL = process.env.NEXT_PUBLIC_WEB_APP_URL || "https://villiform-parker-perfunctorily.ngrok-free.dev"

export async function handleTelegramUpdate(update: any) {
  if (!update.message) return

  const message = update.message
  const chatId = message.chat.id
  const text = message.text
  const from = message.from

  console.log("[TelegramBot] Received message from:", from.username || from.id, "Text:", text)

  // Handle /start command with or without referral code
  if (text?.startsWith("/start")) {
    const args = text.split(" ")
    const referralCode = args.length > 1 ? args[1] : null

    console.log("[TelegramBot] /start command", referralCode ? `with referral: ${referralCode}` : "without referral")

    // Build welcome message
    let welcomeMessage = `👋 Welcome to WhatsApp Number System!\n\n`
    
    if (referralCode) {
      welcomeMessage += `🎁 You were invited with a referral code!\n\n`
    }
    
    welcomeMessage += `Click the button below to open the app and get started! 🚀`

    // Send message with Web App button
    await sendWebAppButton(chatId, welcomeMessage, referralCode)
  }
  
  // Handle other commands
  else if (text === "/help") {
    const helpMessage = `📖 Available Commands:\n\n` +
      `/start - Open the web app\n` +
      `/help - Show this help message\n\n` +
      `💡 Use the web app to:\n` +
      `• Check your balance\n` +
      `• Send accounts\n` +
      `• View referrals\n` +
      `• Make withdrawals`
    
    await sendTelegramMessage(chatId, helpMessage)
  }
}

export async function sendWebAppButton(chatId: number, text: string, referralCode?: string | null) {
  try {
    if (!BOT_TOKEN) {
      console.error("[TelegramBot] ❌ TELEGRAM_BOT_TOKEN not configured!")
      return
    }

    // Build Web App URL with referral code
    let webAppUrl = WEB_APP_URL
    if (referralCode) {
      webAppUrl += `?start=${referralCode}`
    }

    console.log("[TelegramBot] Sending Web App button, URL:", webAppUrl)

    const response = await fetch(`${TELEGRAM_API_URL}${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🚀 Open App",
                web_app: { url: webAppUrl }
              }
            ]
          ]
        }
      }),
    })
    
    const result = await response.json()
    
    if (!result.ok) {
      console.error("[TelegramBot] ❌ Send button error:", result)
    } else {
      console.log("[TelegramBot] ✅ Web App button sent successfully")
    }
    
    return result
  } catch (error) {
    console.error("[TelegramBot] ❌ Failed to send Web App button:", error)
  }
}

export async function sendTelegramMessage(chatId: number, text: string) {
  try {
    if (!BOT_TOKEN) {
      console.error("[TelegramBot] ❌ TELEGRAM_BOT_TOKEN not configured!")
      return
    }

    const response = await fetch(`${TELEGRAM_API_URL}${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    })
    const result = await response.json()
    if (!result.ok) {
      console.error("[TelegramBot] Send message error:", result)
    }
    return result
  } catch (error) {
    console.error("[TelegramBot] Failed to send message:", error)
  }
}

export async function setWebhook(webhookUrl: string) {
  try {
    if (!BOT_TOKEN) {
      console.error("[TelegramBot] ❌ TELEGRAM_BOT_TOKEN not configured!")
      return { ok: false, error: "Bot token not configured" }
    }

    console.log("[TelegramBot] Setting webhook to:", webhookUrl)

    const response = await fetch(`${TELEGRAM_API_URL}${BOT_TOKEN}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: true
      }),
    })
    const result = await response.json()
    
    if (result.ok) {
      console.log("[TelegramBot] ✅ Webhook set successfully:", result)
    } else {
      console.error("[TelegramBot] ❌ Webhook setup failed:", result)
    }
    
    return result
  } catch (error) {
    console.error("[TelegramBot] ❌ Failed to set webhook:", error)
    return { ok: false, error: String(error) }
  }
}

export async function getWebhookInfo() {
  try {
    if (!BOT_TOKEN) {
      console.error("[TelegramBot] ❌ TELEGRAM_BOT_TOKEN not configured!")
      return { ok: false, error: "Bot token not configured" }
    }

    const response = await fetch(`${TELEGRAM_API_URL}${BOT_TOKEN}/getWebhookInfo`)
    const result = await response.json()
    console.log("[TelegramBot] Webhook info:", result)
    return result
  } catch (error) {
    console.error("[TelegramBot] Failed to get webhook info:", error)
    return { ok: false, error: String(error) }
  }
}
