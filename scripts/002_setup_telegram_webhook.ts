import { setWebhook } from "@/lib/telegram/bot"

async function setupWebhook() {
  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL

  if (!webhookUrl) {
    console.error("TELEGRAM_WEBHOOK_URL environment variable is not set")
    process.exit(1)
  }

  console.log("Setting up Telegram webhook at:", webhookUrl)
  const result = await setWebhook(webhookUrl)

  if (result.ok) {
    console.log("Webhook setup successful!")
  } else {
    console.error("Webhook setup failed:", result)
  }
}

setupWebhook()
