import { createClient } from "@/lib/supabase/server"

interface ReferralSignupData {
  telegramId: number
  username: string
  firstName: string
  lastName?: string
  phoneNumber?: string
  referralCode?: string
}

export async function handleReferralSignup(data: ReferralSignupData) {
  try {
    const supabase = await createClient()

    // Check if user already exists
    const { data: existingUser } = await supabase.from("users").select("id").eq("telegram_id", data.telegramId).single()

    if (existingUser) {
      console.log("[v0] User already exists:", data.telegramId)
      return
    }

    // Find referrer if referral code provided
    let referrerId = null
    if (data.referralCode) {
      const { data: referrer } = await supabase
        .from("users")
        .select("id")
        .eq("referral_code", data.referralCode)
        .single()

      referrerId = referrer?.id
    }

    // Create new user
    const { data: newUser, error } = await supabase
      .from("users")
      .insert({
        telegram_id: data.telegramId,
        username: data.username,
        first_name: data.firstName,
        last_name: data.lastName,
        phone_number: data.phoneNumber,
        referrer_id: referrerId,
        referral_code: `ref_${data.telegramId}`,
        joined_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating user:", error)
      return
    }

    // Create referral record if there's a referrer
    if (referrerId) {
      await supabase.from("referrals").insert({
        referrer_id: referrerId,
        referred_user_id: newUser.id,
        created_at: new Date().toISOString(),
      })
    }

    console.log("[v0] New user created:", newUser.id)
    return newUser
  } catch (error) {
    console.error("[v0] Referral signup error:", error)
  }
}
