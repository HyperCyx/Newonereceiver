import { NextRequest, NextResponse } from 'next/server'
import { Collections, getCollection, generateId } from '@/lib/mongodb/client'
import { requireAdmin, getAuthUser } from '@/lib/mongodb/auth'

// GET - List all referral codes
export async function GET(request: NextRequest) {
  try {
    const referralCodes = await getCollection(Collections.REFERRAL_CODES)
    
    const codes = await referralCodes
      .find({})
      .sort({ created_at: -1 })
      .toArray()

    return NextResponse.json({
      success: true,
      codes: codes || []
    })
  } catch (error) {
    console.error('[ReferralCodes] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new referral code
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const user = await requireAdmin()

    const body = await request.json()
    const { codeName } = body

    // Generate unique code
    const code = `${(codeName || 'REF').toUpperCase()}_${generateId()}`

    const referralCodes = await getCollection(Collections.REFERRAL_CODES)

    // Create new referral code
    const newCode = {
      _id: generateId(),
      code: code,
      name: codeName || 'Master Code',
      is_active: true,
      created_by: user._id,
      max_uses: null,
      used_count: 0,
      created_at: new Date(),
      expires_at: null
    }

    await referralCodes.insertOne(newCode)

    // Generate bot link
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'WhatsAppNumberRedBot'
    const link = `https://t.me/${botUsername}?start=${code}`

    return NextResponse.json({
      success: true,
      code: code,
      link: link,
      referralCode: newCode
    })
  } catch (error: any) {
    console.error('[ReferralCodes] POST error:', error)
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
