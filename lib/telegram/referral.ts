import { getDb } from "@/lib/mongodb/connection"

interface ReferralSignupData {
  telegramId: number
  username: string
  firstName: string
  lastName?: string
  phoneNumber?: string
  referralCode?: string | null
}

export async function handleReferralSignup(data: ReferralSignupData) {
  try {
    console.log("[Referral] Starting signup for telegram ID:", data.telegramId)
    
    const db = await getDb()

    // Check if user already exists
    const existingUser = await db.collection("users").findOne({ telegram_id: data.telegramId })

    if (existingUser) {
      console.log("[Referral] User already exists:", data.telegramId)
      return {
        id: existingUser._id.toString(),
        referral_code: existingUser.referral_code
      }
    }

    // Find referrer if referral code provided (not required)
    let referrerId = null
    if (data.referralCode) {
      console.log("[Referral] Looking for referrer with code:", data.referralCode)
      const referrer = await db.collection("users").findOne({ referral_code: data.referralCode })

      if (referrer) {
        referrerId = referrer._id
        console.log("[Referral] Found referrer:", referrer._id.toString())
      } else {
        console.log("[Referral] Referral code not found:", data.referralCode)
      }
    } else {
      console.log("[Referral] No referral code provided, registering user directly")
    }

    // Generate unique referral code for new user
    const newReferralCode = `ref_${data.telegramId}_${Date.now()}`

    // Create user profile
    const insertData: any = {
      telegram_id: data.telegramId,
      telegram_username: data.username,
      first_name: data.firstName,
      last_name: data.lastName,
      phone_number: data.phoneNumber,
      balance: 0.00,
      is_admin: false,
      referral_code: newReferralCode,
      email: `${data.telegramId}@telegram.user`,
      created_at: new Date()
    }

    const result = await db.collection("users").insertOne(insertData)
    const newUser = await db.collection("users").findOne({ _id: result.insertedId })

    if (!newUser) {
      console.error("[Referral] Error creating user profile")
      return null
    }

    console.log("[Referral] User profile created:", newUser._id.toString())

    // Create referral record if there's a referrer
    if (referrerId && newUser) {
      await db.collection("referrals").insertOne({
        referrer_id: referrerId,
        referred_user_id: newUser._id,
        created_at: new Date()
      })

      console.log("[Referral] Created referral link:", referrerId.toString(), "->", newUser._id.toString())
    }

    console.log("[Referral] New user created:", newUser._id.toString(), "with code:", newReferralCode)
    return {
      id: newUser._id.toString(),
      referral_code: newReferralCode,
      ...newUser
    }
  } catch (error) {
    console.error("[Referral] Signup error:", error)
    return null
  }
}
