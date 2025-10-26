import { NextRequest, NextResponse } from 'next/server'
import { Collections, getCollection } from '@/lib/mongodb/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, status } = body

    const transactions = await getCollection(Collections.TRANSACTIONS)
    const users = await getCollection(Collections.USERS)
    
    const query: any = {}
    if (userId) query.user_id = userId
    if (status) query.status = status
    
    const allTransactions = await transactions
      .find(query)
      .sort({ created_at: -1 })
      .limit(100)
      .toArray()

    // Populate user data
    const transactionsWithUsers = await Promise.all(
      allTransactions.map(async (transaction) => {
        const user = await users.findOne({ _id: transaction.user_id })
        return {
          ...transaction,
          users: user ? {
            telegram_username: user.telegram_username
          } : null
        }
      })
    )

    return NextResponse.json({
      success: true,
      transactions: transactionsWithUsers
    })
  } catch (error) {
    console.error('[TransactionsList] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const transactions = await getCollection(Collections.TRANSACTIONS)
    const users = await getCollection(Collections.USERS)
    
    const allTransactions = await transactions
      .find({})
      .sort({ created_at: -1 })
      .limit(100)
      .toArray()

    // Populate user data
    const transactionsWithUsers = await Promise.all(
      allTransactions.map(async (transaction) => {
        const user = await users.findOne({ _id: transaction.user_id })
        return {
          ...transaction,
          users: user ? {
            telegram_username: user.telegram_username
          } : null
        }
      })
    )

    return NextResponse.json({
      success: true,
      transactions: transactionsWithUsers
    })
  } catch (error) {
    console.error('[TransactionsList] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
