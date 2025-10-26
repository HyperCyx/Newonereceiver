import { NextResponse } from "next/server"
import { Collections, getCollection } from "@/lib/mongodb/client"
import { requireAdmin } from "@/lib/mongodb/auth"

export async function GET(request: Request) {
  try {
    // Check if user is admin
    await requireAdmin()

    console.log("[AdminUsers] Fetching all users...")

    // Fetch all users
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
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}
