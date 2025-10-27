import { NextResponse } from "next/server"
import { Collections, getCollection, generateId } from "@/lib/mongodb/client"
import { setAuthSession } from "@/lib/mongodb/auth"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { telegramId, username, firstName, lastName, phoneNumber, referralCode } = body

    console.log("[UserRegister] ========================================")
    console.log("[UserRegister] Registration request received")
    console.log("[UserRegister] Telegram ID:", telegramId)
    console.log("[UserRegister] Username:", username)
    console.log("[UserRegister] First Name:", firstName)
    console.log("[UserRegister] ========================================")

    if (!telegramId) {
      console.error("[UserRegister] Missing telegramId!")
      return NextResponse.json(
        { error: 'Telegram ID is required' },
        { status: 400 }
      )
    }

    const users = await getCollection(Collections.USERS)
    console.log("[UserRegister] Got users collection")

    // Check if user already exists
    const existingUser = await users.findOne({ telegram_id: telegramId })

    if (existingUser) {
      console.log("[UserRegister] User already exists:", existingUser._id, "Balance:", existingUser.balance, "Admin:", existingUser.is_admin)
      
      // Set auth session
      await setAuthSession(existingUser._id)
      
      return NextResponse.json({ 
        success: true,
        user: existingUser 
      })
    }

    // Find referrer if referral code provided
    let referrerId = null
    if (referralCode) {
      console.log("[UserRegister] Looking for referrer with code:", referralCode)
      
      // Check in referral_codes collection (admin-created codes)
      const referralCodes = await getCollection(Collections.REFERRAL_CODES)
      const refCode = await referralCodes.findOne({ code: referralCode, is_active: true })
      
      if (refCode) {
        console.log("[UserRegister] ✅ Found admin referral code:", refCode.code)
        console.log("[UserRegister] Code details:", { 
          id: refCode._id, 
          name: refCode.name, 
          created_by: refCode.created_by,
          used_count: refCode.used_count 
        })
        
        // Set referrer to the admin who created this code
        // If created_by is "system", find the actual admin user
        if (refCode.created_by === 'system') {
          console.log("[UserRegister] Code was created by system, finding admin user...")
          const adminUser = await users.findOne({ is_admin: true })
          if (adminUser) {
            referrerId = adminUser._id
            console.log("[UserRegister] Using admin user as referrer:", referrerId)
          } else {
            console.log("[UserRegister] ⚠️ No admin user found, referral will not be tracked")
          }
        } else {
          referrerId = refCode.created_by
          console.log("[UserRegister] Referrer set to code creator:", referrerId)
        }
        
        // Increment used count
        await referralCodes.updateOne(
          { _id: refCode._id },
          { $inc: { used_count: 1 } }
        )
        console.log("[UserRegister] Incremented used_count for admin code")
      } else {
        // Check if it's a user's personal referral code
        console.log("[UserRegister] Not found in referral_codes, checking user personal codes...")
        const referrer = await users.findOne({ referral_code: referralCode })
        if (referrer) {
          referrerId = referrer._id
          console.log("[UserRegister] ✅ Found user personal referral code, referrer:", referrerId)
        } else {
          console.log("[UserRegister] ❌ Invalid referral code:", referralCode)
          return NextResponse.json(
            { error: 'Invalid referral code. Please check and try again.' },
            { status: 400 }
          )
        }
      }
    } else {
      console.log("[UserRegister] ❌ No referral code provided")
      return NextResponse.json(
        { error: 'Referral code is required for registration.' },
        { status: 400 }
      )
    }

    // Generate unique referral code
    const newReferralCode = `ref_${telegramId}_${Date.now()}`
    console.log("[UserRegister] Generated referral code:", newReferralCode)

    // Check if user is admin based on Telegram ID
    const adminTelegramId = process.env.ADMIN_TELEGRAM_ID ? parseInt(process.env.ADMIN_TELEGRAM_ID) : null
    const isAdmin = adminTelegramId ? telegramId === adminTelegramId : false
    console.log("[UserRegister] Admin check:", { telegramId, adminTelegramId, isAdmin })

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
      is_admin: isAdmin,
      created_at: new Date(),
      updated_at: new Date()
    }

    const insertResult = await users.insertOne(newUser)
    console.log("[UserRegister] User profile created:", userId, "Insert result:", insertResult.acknowledged)

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

    console.log("[UserRegister] ========================================")
    console.log("[UserRegister] Registration SUCCESSFUL for:", telegramId)
    console.log("[UserRegister] User ID:", userId)
    console.log("[UserRegister] Username:", newUser.telegram_username)
    console.log("[UserRegister] Is Admin:", newUser.is_admin)
    console.log("[UserRegister] Balance:", newUser.balance)
    console.log("[UserRegister] ========================================")
    
    return NextResponse.json({ 
      success: true,
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
