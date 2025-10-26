import { NextResponse } from "next/server"
import { Collections, getCollection, generateId } from "@/lib/mongodb/client"
import { setAuthSession } from "@/lib/mongodb/auth"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { telegramId, username, firstName, lastName, phoneNumber, referralCode } = body

    console.log("[UserRegister] Registering user:", telegramId, username)

    const users = await getCollection(Collections.USERS)

    // Check if user already exists
    const existingUser = await users.findOne({ telegram_id: telegramId })

    if (existingUser) {
      console.log("[UserRegister] User already exists:", existingUser._id, "Balance:", existingUser.balance)
      
      // Set auth session
      await setAuthSession(existingUser._id)
      
      return NextResponse.json({ user: existingUser })
    }

    // Find referrer if referral code provided
    let referrerId = null
    if (referralCode) {
      console.log("[UserRegister] Looking for referrer with code:", referralCode)
      
      // Check in referral_codes collection
      const referralCodes = await getCollection(Collections.REFERRAL_CODES)
      const refCode = await referralCodes.findOne({ code: referralCode, is_active: true })
      
      if (refCode) {
        console.log("[UserRegister] Found referral code:", refCode._id)
        // Increment used count
        await referralCodes.updateOne(
          { _id: refCode._id },
          { $inc: { used_count: 1 } }
        )
      } else {
        // Check if it's a user's personal referral code
        const referrer = await users.findOne({ referral_code: referralCode })
        if (referrer) {
          referrerId = referrer._id
          console.log("[UserRegister] Found referrer:", referrerId)
        } else {
          console.log("[UserRegister] Referrer not found for code:", referralCode)
        }
      }
    }

    // Generate unique referral code
    const newReferralCode = `ref_${telegramId}_${Date.now()}`
    console.log("[UserRegister] Generated referral code:", newReferralCode)

    // Create new user
    const userId = generateId()
    const newUser = {
      _id: userId,
      telegram_id: telegramId,
      telegram_username: username || `user_${telegramId}`,
      first_name: firstName,
      last_name: lastName,
      phone_number: phoneNumber,
      balance: 0.00,
      referral_code: newReferralCode,
      is_admin: false,
      created_at: new Date(),
      updated_at: new Date()
    }

    await users.insertOne(newUser)
    console.log("[UserRegister] User profile created:", userId)

    // Create referral record if there's a referrer
    if (referrerId) {
      console.log("[UserRegister] Creating referral link:", referrerId, "->", userId)
      const referrals = await getCollection(Collections.REFERRALS)
      await referrals.insertOne({
        _id: generateId(),
        referrer_id: referrerId,
        referred_user_id: userId,
        created_at: new Date()
      })
      console.log("[UserRegister] Referral created successfully")
    }

    // Set auth session
    await setAuthSession(userId)

    console.log("[UserRegister] Registration complete for:", telegramId)
    return NextResponse.json({ 
      user: newUser
    })
  } catch (error) {
    console.error("[UserRegister] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}
