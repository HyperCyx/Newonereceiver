import { handleReferralSignup } from "./referral"

const TELEGRAM_API_URL = "https://api.telegram.org/bot"
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

export async function handleTelegramUpdate(update: any) {
  if (!update.message) return

  const message = update.message
  const chatId = message.chat.id
  const text = message.text
  const from = message.from

  // Handle /start command with referral code
  if (text?.startsWith("/start")) {
    const args = text.split(" ")
    const referralCode = args[1] || null

    await handleReferralSignup({
      telegramId: from.id,
      username: from.username || `user_${from.id}`,
      firstName: from.first_name,
      lastName: from.last_name,
      phoneNumber: from.phone_number,
      referralCode,
    })

    const welcomeMessage = `Welcome ${from.first_name}! You've been registered in our system.`
    await sendTelegramMessage(chatId, welcomeMessage)
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
      }),
    })
    return await response.json()
  } catch (error) {
    console.error("[v0] Failed to send Telegram message:", error)
  }
}

export async function setWebhook(webhookUrl: string) {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}${BOT_TOKEN}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
      }),
    })
    return await response.json()
  } catch (error) {
    console.error("[v0] Failed to set webhook:", error)
  }
}
