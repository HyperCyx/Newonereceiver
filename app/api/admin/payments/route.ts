import { NextRequest, NextResponse } from 'next/server'
import { Collections, getCollection } from '@/lib/mongodb/client'
import { requireAdmin } from '@/lib/mongodb/auth'

// GET - Fetch all payment requests
export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    await requireAdmin()

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
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Approve or reject payment request
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    await requireAdmin()

    const body = await request.json()
    const { paymentId, action } = body

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
      // Update payment status to approved
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
      // Update payment status to rejected
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
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
