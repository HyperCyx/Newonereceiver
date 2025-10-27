"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"

interface ReferralUser {
  telegramId: string
  username?: string
  firstName?: string
  lastName?: string
  phoneNumber?: string
  referrerId?: string
  referralCode: string
  joinedAt: string
  referralCount: number
}

interface ReferralContextType {
  currentUser: ReferralUser | null
  referralCode: string
  referralLink: string
  referrals: ReferralUser[]
  saveUserWithReferral: (telegramId: string, referrerId?: string, userData?: any) => void
  getReferralLink: () => string
  getReferralStats: () => { totalReferrals: number; activeReferrals: number }
}

const ReferralContext = createContext<ReferralContextType | undefined>(undefined)

export function ReferralProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<ReferralUser | null>(null)
  const [referrals, setReferrals] = useState<ReferralUser[]>([])

  // Initialize referral system
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Load from localStorage
      const savedUser = localStorage.getItem("referral_user")
      const savedReferrals = localStorage.getItem("referral_list")

      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser))
      }
      if (savedReferrals) {
        setReferrals(JSON.parse(savedReferrals))
      }

      // Check for referral code in URL
      const params = new URLSearchParams(window.location.search)
      const refCode = params.get("ref")

      if (refCode && !savedUser) {
        // User is joining via referral link
        const referrer = JSON.parse(localStorage.getItem("referral_users") || "[]").find(
          (u: ReferralUser) => u.referralCode === refCode,
        )

        if (referrer) {
          const tg = (window as any).Telegram?.WebApp
          if (tg) {
            const user = tg.initDataUnsafe?.user
            if (user) {
              const newUser: ReferralUser = {
                telegramId: user.id.toString(),
                username: user.username,
                firstName: user.first_name,
                lastName: user.last_name,
                phoneNumber: user.phone_number,
                referrerId: referrer.telegramId,
                referralCode: generateReferralCode(user.id.toString()),
                joinedAt: new Date().toISOString(),
                referralCount: 0,
              }

              // Save new user
              localStorage.setItem("referral_user", JSON.stringify(newUser))
              setCurrentUser(newUser)

              // Update referrer's referral count
              const updatedReferrer = { ...referrer, referralCount: (referrer.referralCount || 0) + 1 }
              const updatedUsers = JSON.parse(localStorage.getItem("referral_users") || "[]").map((u: ReferralUser) =>
                u.telegramId === referrer.telegramId ? updatedReferrer : u,
              )
              localStorage.setItem("referral_users", JSON.stringify(updatedUsers))
            }
          }
        }
      }
    }
  }, [])

  const generateReferralCode = (telegramId: string): string => {
    return `REF_${telegramId}_${Date.now().toString(36).toUpperCase()}`
  }

  const saveUserWithReferral = (telegramId: string, referrerId?: string, userData?: any) => {
    const referralCode = userData?.referralCode || generateReferralCode(telegramId)

    const newUser: ReferralUser = {
      telegramId,
      username: userData?.username,
      firstName: userData?.first_name,
      lastName: userData?.last_name,
      phoneNumber: userData?.phone_number,
      referrerId,
      referralCode,
      joinedAt: new Date().toISOString(),
      referralCount: 0,
    }

    // Save current user to localStorage for quick access
    localStorage.setItem("referral_user", JSON.stringify(newUser))
    setCurrentUser(newUser)
  }

  const getReferralLink = (): string => {
    if (!currentUser) return ""
    // Use bot link for referrals
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'WhatsAppNumberRedBot'
    return `https://t.me/${botUsername}?start=${currentUser.referralCode}`
  }

  const getReferralStats = () => {
    const allUsers = JSON.parse(localStorage.getItem("referral_users") || "[]")
    const myReferrals = allUsers.filter((u: ReferralUser) => u.referrerId === currentUser?.telegramId)

    return {
      totalReferrals: myReferrals.length,
      activeReferrals: myReferrals.filter((u: ReferralUser) => {
        const joinDate = new Date(u.joinedAt)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        return joinDate > thirtyDaysAgo
      }).length,
    }
  }

  return (
    <ReferralContext.Provider
      value={{
        currentUser,
        referralCode: currentUser?.referralCode || "",
        referralLink: getReferralLink(),
        referrals,
        saveUserWithReferral,
        getReferralLink,
        getReferralStats,
      }}
    >
      {children}
    </ReferralContext.Provider>
  )
}

export function useReferral() {
  const context = useContext(ReferralContext)
  if (!context) {
    throw new Error("useReferral must be used within ReferralProvider")
  }
  return context
}
