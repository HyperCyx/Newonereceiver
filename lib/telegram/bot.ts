import { handleReferralSignup } from "./referral"

const TELEGRAM_API_URL = "https://api.telegram.org/bot"
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

export async function handleTelegramUpdate(update: any) {
  if (!update.message) return

  const message = update.message
  const chatId = message.chat.id
  const text = message.text
  const from = message.from

  console.log("[TelegramBot] Received message from:", from.username || from.id)

  // Handle /start command with or without referral code
  if (text?.startsWith("/start")) {
    const args = text.split(" ")
    const referralCode = args.length > 1 ? args[1] : null

    console.log("[TelegramBot] Processing /start", referralCode ? `with referral: ${referralCode}` : "without referral")

    const user = await handleReferralSignup({
      telegramId: from.id,
      username: from.username || `user_${from.id}`,
      firstName: from.first_name,
      lastName: from.last_name,
      phoneNumber: undefined,
      referralCode: referralCode,
    })

    let welcomeMessage = `Welcome ${from.first_name}! 🎉\n\n`
    
    if (user) {
      welcomeMessage += `✅ You've been successfully registered!\n\n`
      if (referralCode) {
        welcomeMessage += `🎁 You joined via referral link!\n\n`
      }
      welcomeMessage += `📱 Your referral code: <code>${user.referral_code}</code>\n\n`
      welcomeMessage += `🔗 Share this link with friends:\nhttps://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'WhatsAppNumberRedBot'}?start=${user.referral_code}\n\n`
      welcomeMessage += `💡 Open the web app to start using the system!`
    } else {
      welcomeMessage += `👋 You're already registered! Welcome back!`
    }

    await sendTelegramMessage(chatId, welcomeMessage)
  }
  
  // Handle other commands
  else if (text === "/help") {
    const helpMessage = `📖 Available Commands:\n\n` +
      `/start - Register and get your referral link\n` +
      `/balance - Check your balance\n` +
      `/referrals - View your referrals\n` +
      `/help - Show this help message`
    
    await sendTelegramMessage(chatId, helpMessage)
  }
}

export async function sendTelegramMessage(chatId: number, text: string) {
  try {
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
    const response = await fetch(`${TELEGRAM_API_URL}${BOT_TOKEN}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "callback_query"],
      }),
    })
    const result = await response.json()
    console.log("[TelegramBot] Webhook set:", result)
    return result
  } catch (error) {
    console.error("[TelegramBot] Failed to set webhook:", error)
  }
}
