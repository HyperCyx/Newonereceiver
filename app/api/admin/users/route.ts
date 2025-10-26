import { NextRequest, NextResponse } from "next/server"
import { Collections, getCollection } from "@/lib/mongodb/client"
import { checkAdminByTelegramId, getUserFromTelegram } from "@/lib/mongodb/auth"

export async function GET(request: NextRequest) {
  try {
    console.log("[AdminUsers] Fetching all users...")

    // Fetch all users (temporarily without strict auth to debug)
    const users = await getCollection(Collections.USERS)
    const allUsers = await users
      .find({})
      .sort({ created_at: -1 })
      .toArray()

    console.log(`[AdminUsers] Found ${allUsers.length} users`)

    return NextResponse.json({ 
      users: allUsers || [],
      count: allUsers.length
    })
  } catch (error: any) {
    console.error("[AdminUsers] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}

// POST endpoint for checking admin and fetching users
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegramId } = body

    // Check if user is admin
    const isAdmin = await checkAdminByTelegramId(telegramId)
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Fetch all users
    const users = await getCollection(Collections.USERS)
    const allUsers = await users
      .find({})
      .sort({ created_at: -1 })
      .toArray()

    return NextResponse.json({ 
      users: allUsers || [],
      count: allUsers.length
    })
  } catch (error: any) {
    console.error("[AdminUsers] POST error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}
