import { createClient } from "@supabase/supabase-js"

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
    
    // Create Supabase client with service role for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, referral_code")
      .eq("telegram_id", data.telegramId)
      .single()

    if (existingUser) {
      console.log("[Referral] User already exists:", data.telegramId)
      return existingUser
    }

    // Find referrer if referral code provided (not required)
    let referrerId = null
    if (data.referralCode) {
      console.log("[Referral] Looking for referrer with code:", data.referralCode)
      const { data: referrer } = await supabase
        .from("users")
        .select("id")
        .eq("referral_code", data.referralCode)
        .single()

      if (referrer) {
        referrerId = referrer.id
        console.log("[Referral] Found referrer:", referrer.id)
      } else {
        console.log("[Referral] Referral code not found:", data.referralCode)
      }
    } else {
      console.log("[Referral] No referral code provided, registering user directly")
    }

    // Generate unique referral code for new user
    const newReferralCode = `ref_${data.telegramId}_${Date.now()}`

    // Try to create auth user, but handle if already exists
    let authUserId = null
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: `${data.telegramId}@telegram.user`,
      email_confirm: true,
      user_metadata: {
        telegram_id: data.telegramId,
        username: data.username,
        first_name: data.firstName,
        last_name: data.lastName
      }
    })

    if (authError) {
      // If user already exists in auth, try to get their ID
      if (authError.message.includes('already been registered')) {
        const { data: existingAuthUser } = await supabase.auth.admin.listUsers()
        const foundUser = existingAuthUser?.users?.find(
          (u) => u.email === `${data.telegramId}@telegram.user`
        )
        if (foundUser) {
          authUserId = foundUser.id
          console.log("[Referral] Auth user already exists, using existing ID:", authUserId)
        } else {
          console.error("[Referral] Could not find existing auth user")
          return null
        }
      } else {
        console.error("[Referral] Error creating auth user:", authError)
        return null
      }
    } else if (authUser?.user) {
      authUserId = authUser.user.id
    }

    if (!authUserId) {
      console.error("[Referral] Failed to get auth user ID")
      return null
    }

    // Create user profile
    let insertData: any = {
      id: authUserId,
      telegram_id: data.telegramId,
      telegram_username: data.username,
      first_name: data.firstName,
      last_name: data.lastName,
      phone_number: data.phoneNumber,
      balance: 0.00,
      is_admin: false
    }

    // Try to insert with all fields including referral_code
    let { data: newUser, error: userError } = await supabase
      .from("users")
      .insert({
        ...insertData,
        referral_code: newReferralCode
      })
      .select()
      .single()

    // If error is about missing columns, retry with basic fields
    if (userError && (userError.message?.includes('referral_code') || userError.message?.includes('first_name') || userError.message?.includes('balance'))) {
      console.log("[Referral] Some columns not found, inserting with basic fields")
      const result = await supabase
        .from("users")
        .insert({
          id: authUserId,
          telegram_id: data.telegramId,
          telegram_username: data.username,
          phone_number: data.phoneNumber,
          is_admin: false
        })
        .select()
        .single()
      
      newUser = result.data
      userError = result.error
    }

    if (userError) {
      console.error("[Referral] Error creating user profile:", userError)
      return null
    }

    console.log("[Referral] User profile created:", newUser?.id)

    // Create referral record if there's a referrer
    if (referrerId && newUser) {
      const { error: refError } = await supabase
        .from("referrals")
        .insert({
          referrer_id: referrerId,
          referred_user_id: newUser.id
        })

      if (refError) {
        console.error("[Referral] Error creating referral:", refError)
      } else {
        console.log("[Referral] Created referral link:", referrerId, "->", newUser.id)
      }
    }

    console.log("[Referral] New user created:", newUser?.id, "with code:", newReferralCode)
    return {
      ...newUser,
      referral_code: newReferralCode
    }
  } catch (error) {
    console.error("[Referral] Signup error:", error)
    return null
  }
}
