import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request) {
  try {
    // Create Supabase client with service role to bypass RLS
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

    console.log("[AdminUsers] Fetching all users...")

    // Fetch all users with all available fields
    const { data: users, error, count } = await supabase
      .from('users')
      .select('id, telegram_id, telegram_username, first_name, last_name, phone_number, balance, is_admin, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (error) {
      console.error("[AdminUsers] Error fetching users:", error)
      return NextResponse.json(
        { error: "Failed to fetch users", details: error },
        { status: 500 }
      )
    }

    console.log(`[AdminUsers] Found ${users?.length || 0} users`)

    return NextResponse.json({ 
      users: users || [],
      count: count || 0
    })
  } catch (error) {
    console.error("[AdminUsers] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}
