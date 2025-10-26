import { NextRequest, NextResponse } from 'next/server'
import { Collections, getCollection } from '@/lib/mongodb/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { status } = body

    const accounts = await getCollection(Collections.ACCOUNTS)
    
    const query = status ? { status } : {}
    const count = await accounts.countDocuments(query)

    return NextResponse.json({
      success: true,
      count
    })
  } catch (error) {
    console.error('[AccountsCount] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
