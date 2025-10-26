import { NextRequest, NextResponse } from 'next/server'
import { Collections, getCollection } from '@/lib/mongodb/client'
import { checkAdminByTelegramId } from '@/lib/mongodb/auth'

// GET - Fetch all payment requests
export async function GET(request: NextRequest) {
  try {
    const paymentRequests = await getCollection(Collections.PAYMENT_REQUESTS)
    const users = await getCollection(Collections.USERS)

    // Fetch all payment requests
    const allPayments = await paymentRequests
      .find({})
      .sort({ created_at: -1 })
      .toArray()

    // Populate user data
    const paymentsWithUsers = await Promise.all(
      allPayments.map(async (payment) => {
        const user = await users.findOne({ _id: payment.user_id })
        return {
          ...payment,
          users: user ? {
            telegram_username: user.telegram_username,
            first_name: user.first_name,
            last_name: user.last_name
          } : null
        }
      })
    )

    return NextResponse.json({
      success: true,
      payments: paymentsWithUsers
    })
  } catch (error: any) {
    console.error('[AdminPayments] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Approve or reject payment request or fetch with auth
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentId, action, telegramId } = body

    // If telegramId is provided, check admin and return data
    if (telegramId && !paymentId) {
      const isAdmin = await checkAdminByTelegramId(telegramId)
      
      if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
      }

      const paymentRequests = await getCollection(Collections.PAYMENT_REQUESTS)
      const users = await getCollection(Collections.USERS)

      const allPayments = await paymentRequests
        .find({})
        .sort({ created_at: -1 })
        .toArray()

      const paymentsWithUsers = await Promise.all(
        allPayments.map(async (payment) => {
          const user = await users.findOne({ _id: payment.user_id })
          return {
            ...payment,
            users: user ? {
              telegram_username: user.telegram_username,
              first_name: user.first_name,
              last_name: user.last_name
            } : null
          }
        })
      )

      return NextResponse.json({
        success: true,
        payments: paymentsWithUsers
      })
    }

    // Handle payment actions
    if (!paymentId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const paymentRequests = await getCollection(Collections.PAYMENT_REQUESTS)
    const users = await getCollection(Collections.USERS)

    const payment = await paymentRequests.findOne({ _id: paymentId })

    if (!payment) {
      return NextResponse.json({ error: 'Payment request not found' }, { status: 404 })
    }

    if (action === 'approve') {
      await paymentRequests.updateOne(
        { _id: paymentId },
        { 
          $set: { 
            status: 'approved',
            updated_at: new Date()
          } 
        }
      )

      // Deduct amount from user's balance
      await users.updateOne(
        { _id: payment.user_id },
        { $inc: { balance: -payment.amount } }
      )

      return NextResponse.json({
        success: true,
        message: 'Payment approved successfully'
      })
    } 
    else if (action === 'reject') {
      await paymentRequests.updateOne(
        { _id: paymentId },
        { 
          $set: { 
            status: 'rejected',
            updated_at: new Date()
          } 
        }
      )

      return NextResponse.json({
        success: true,
        message: 'Payment rejected'
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('[AdminPayments] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
