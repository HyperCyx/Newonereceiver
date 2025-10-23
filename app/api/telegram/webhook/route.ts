import { type NextRequest, NextResponse } from "next/server"
import { handleTelegramUpdate } from "@/lib/telegram/bot"

export async function POST(request: NextRequest) {
  try {
    const update = await request.json()
    await handleTelegramUpdate(update)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[v0] Telegram webhook error:", error)
    return NextResponse.json({ ok: false, error: "Webhook processing failed" }, { status: 500 })
  }
}
