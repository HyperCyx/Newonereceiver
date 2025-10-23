import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { telegramId, username, firstName, lastName, phoneNumber, referralCode } = body

    console.log("[UserRegister] Registering user:", telegramId, username)

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
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("id, is_admin, referral_code, balance, telegram_id, telegram_username, first_name, last_name")
      .eq("telegram_id", telegramId)
      .single()

    if (existingUser) {
      console.log("[UserRegister] User already exists:", existingUser.id, "Balance:", existingUser.balance)
      return NextResponse.json({ user: existingUser })
    }

    // Find referrer if referral code provided
    let referrerId = null
    if (referralCode) {
      console.log("[UserRegister] Looking for referrer with code:", referralCode)
      const { data: referrer } = await supabase
        .from("users")
        .select("id")
        .eq("referral_code", referralCode)
        .single()

      if (referrer) {
        referrerId = referrer.id
        console.log("[UserRegister] Found referrer:", referrerId)
      } else {
        console.log("[UserRegister] Referrer not found for code:", referralCode)
      }
    }

    // Generate unique referral code
    const newReferralCode = `ref_${telegramId}_${Date.now()}`
    console.log("[UserRegister] Generated referral code:", newReferralCode)

    // Create auth user first (required for RLS policies)
    let authUserId = null
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: `${telegramId}@telegram.user`,
      email_confirm: true,
      user_metadata: {
        telegram_id: telegramId,
        username: username,
        first_name: firstName,
        last_name: lastName
      }
    })

    if (authError) {
      console.error("[UserRegister] Auth error:", authError.message)
      // If user already exists in auth, try to get their ID
      if (authError.message.includes('already been registered') || authError.code === 'email_exists') {
        console.log("[UserRegister] Auth user exists, searching for it...")
        const { data: existingAuthUser } = await supabase.auth.admin.listUsers()
        const foundUser = existingAuthUser?.users?.find(
          (u) => u.email === `${telegramId}@telegram.user`
        )
        if (foundUser) {
          authUserId = foundUser.id
          console.log("[UserRegister] Found existing auth user ID:", authUserId)
        } else {
          console.error("[UserRegister] Could not find existing auth user")
          return NextResponse.json(
            { error: "Failed to find auth user", details: authError.message },
            { status: 500 }
          )
        }
      } else {
        return NextResponse.json(
          { error: "Failed to create auth user", details: authError.message },
          { status: 500 }
        )
      }
    } else if (authUser?.user) {
      authUserId = authUser.user.id
      console.log("[UserRegister] Created new auth user:", authUserId)
    }

    if (!authUserId) {
      return NextResponse.json(
        { error: "Failed to get auth user ID" },
        { status: 500 }
      )
    }

    console.log("[UserRegister] Creating user profile with auth ID:", authUserId)

    // Try to create user profile with all fields
    let insertData: any = {
      id: authUserId,
      telegram_id: telegramId,
      telegram_username: username || `user_${telegramId}`,
      first_name: firstName,
      last_name: lastName,
      phone_number: phoneNumber,
      balance: 0.00,
      is_admin: false
    }

    // Only add referral_code if the column exists
    // First try with all fields including referral_code
    let { data: newUser, error: userError } = await supabase
      .from("users")
      .insert({
        ...insertData,
        referral_code: newReferralCode
      })
      .select("id, is_admin, telegram_id, telegram_username, first_name, last_name, balance")
      .single()

    // If error is about missing columns, retry with basic fields
    if (userError && (userError.message?.includes('referral_code') || userError.message?.includes('first_name') || userError.message?.includes('balance'))) {
      console.log("[UserRegister] Some columns not found, inserting with basic fields")
      const result = await supabase
        .from("users")
        .insert({
          id: authUserId,
          telegram_id: telegramId,
          telegram_username: username || `user_${telegramId}`,
          phone_number: phoneNumber,
          is_admin: false
        })
        .select("id, is_admin, telegram_id, telegram_username")
        .single()
      
      newUser = result.data ? {
        ...result.data,
        first_name: firstName,
        last_name: lastName,
        balance: 0
      } : null
      userError = result.error
    }

    if (userError) {
      console.error("[UserRegister] Error creating user profile:", userError)
      return NextResponse.json(
        { error: "Failed to create user profile", details: userError },
        { status: 500 }
      )
    }

    console.log("[UserRegister] User profile created:", newUser?.id)

    // Create referral record if there's a referrer
    if (referrerId && newUser) {
      console.log("[UserRegister] Creating referral link:", referrerId, "->", newUser.id)
      const { error: refError } = await supabase.from("referrals").insert({
        referrer_id: referrerId,
        referred_user_id: newUser.id
      })
      if (refError) {
        console.error("[UserRegister] Error creating referral:", refError)
      } else {
        console.log("[UserRegister] Referral created successfully")
      }
    }

    console.log("[UserRegister] Registration complete for:", telegramId)
    return NextResponse.json({ 
      user: {
        ...newUser,
        referral_code: newReferralCode
      }
    })
  } catch (error) {
    console.error("[UserRegister] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}
