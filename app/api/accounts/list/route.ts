import { NextRequest, NextResponse } from 'next/server'
import { Collections, getCollection } from '@/lib/mongodb/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { status, userId } = body

    const accounts = await getCollection(Collections.ACCOUNTS)
    
    const query: any = {}
    if (status) query.status = status
    if (userId) query.user_id = userId
    
    const accountsList = await accounts
      .find(query)
      .sort({ created_at: -1 })
      .toArray()

    return NextResponse.json({
      success: true,
      accounts: accountsList
    })
  } catch (error) {
    console.error('[AccountsList] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
