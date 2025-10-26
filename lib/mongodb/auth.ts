import { cookies } from 'next/headers'
import { Collections, getCollection } from './client'

export interface AuthUser {
  _id: string
  telegram_id: number
  telegram_username: string
  first_name?: string
  last_name?: string
  is_admin: boolean
}

// Simple session management without Supabase Auth
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session_token')?.value

    if (!sessionToken) {
      return null
    }

    // Decode the session token (in production, use proper JWT verification)
    const userId = sessionToken

    const users = await getCollection(Collections.USERS)
    const user = await users.findOne({ _id: userId }) as any

    if (!user) {
      return null
    }

    return {
      _id: user._id,
      telegram_id: user.telegram_id,
      telegram_username: user.telegram_username,
      first_name: user.first_name,
      last_name: user.last_name,
      is_admin: user.is_admin || false,
    }
  } catch (error) {
    console.error('[Auth] Error getting user:', error)
    return null
  }
}

export async function setAuthSession(userId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set('session_token', userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
}

export async function clearAuthSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('session_token')
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth()
  if (!user.is_admin) {
    throw new Error('Forbidden - Admin access required')
  }
  return user
}
