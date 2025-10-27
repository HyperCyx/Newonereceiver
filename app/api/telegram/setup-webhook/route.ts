import { NextRequest, NextResponse } from 'next/server'
import { setWebhook, getWebhookInfo } from '@/lib/telegram/bot'

export async function GET(request: NextRequest) {
  try {
    const webhookInfo = await getWebhookInfo()
    return NextResponse.json({
      success: true,
      info: webhookInfo
    })
  } catch (error) {
    console.error('[SetupWebhook] Error:', error)
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { webhookUrl } = await request.json()
    
    if (!webhookUrl) {
      return NextResponse.json({
        success: false,
        error: 'webhookUrl is required'
      }, { status: 400 })
    }

    console.log('[SetupWebhook] Setting up webhook:', webhookUrl)
    
    const result = await setWebhook(webhookUrl)
    
    if (result?.ok) {
      return NextResponse.json({
        success: true,
        message: 'Webhook configured successfully',
        result: result
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to set webhook',
        result: result
      }, { status: 500 })
    }
  } catch (error) {
    console.error('[SetupWebhook] Error:', error)
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 })
  }
}
