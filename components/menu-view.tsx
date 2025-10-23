"use client"

import { useEffect, useState } from "react"
import WithdrawalModal from "./withdrawal-modal"
import ReferralSection from "./referral-section" // Import the ReferralSection component
import { useReferral } from "@/lib/referral-context"

interface MenuViewProps {
  onNavigate?: (view: "menu" | "dashboard" | "withdrawal" | "admin-login") => void
}

interface MenuItem {
  icon: string
  title: string
  subtitle: string
  badge?: string
  color: string
  action?: string
}

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
}

export default function MenuView({ onNavigate }: MenuViewProps) {
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null)
  const [userName, setUserName] = useState("(つ◉◡◉)つ Hyper Red")
  const [userId, setUserId] = useState("1211362365")
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false)
  const [balance, setBalance] = useState("0.00")
  const [showReferral, setShowReferral] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const { saveUserWithReferral } = useReferral()

  useEffect(() => {
    if (typeof window !== "undefined") {
      const tg = (window as any).Telegram?.WebApp
      if (tg) {
        tg.ready()
        const user = tg.initDataUnsafe?.user
        if (user) {
          setTelegramUser(user)
          const displayName = user.username ? `@${user.username}` : `${user.first_name} ${user.last_name || ""}`
          setUserName(displayName)
          setUserId(user.id.toString())
          saveUserWithReferral(user.id.toString(), undefined, user)

          const adminIds = ["123456789", "987654321"] // Replace with actual admin IDs
          setIsAdmin(adminIds.includes(user.id.toString()))
        }
      }
    }
  }, [saveUserWithReferral])

  const menuItems: MenuItem[] = [
    {
      icon: "👤",
      title: userName,
      subtitle: userId,
      color: "bg-blue-500",
    },
    {
      icon: "💰",
      title: "Withdraw Money",
      subtitle: balance + " USDT",
      color: "bg-green-500",
      action: "withdraw",
    },
    {
      icon: "📦",
      title: "Send Accounts",
      subtitle: "111",
      badge: "AVAILABLE",
      color: "bg-blue-500",
      action: "send",
    },
    {
      icon: "📋",
      title: "Orders",
      subtitle: "0",
      color: "bg-red-500",
      action: "orders",
    },
    {
      icon: "📢",
      title: "Channel",
      subtitle: "Check our channel for latest updates",
      color: "bg-orange-500",
      action: "channel",
    },
    ...(isAdmin
      ? [
          {
            icon: "🔗",
            title: "Referral Program",
            subtitle: "Manage referral links",
            color: "bg-purple-500",
            action: "referral",
          },
        ]
      : []),
    {
      icon: "⚙️",
      title: "Admin Dashboard",
      subtitle: "Manage system",
      color: "bg-indigo-500",
      action: "admin",
    },
  ]

  const handleMenuItemClick = (action?: string) => {
    if (action === "send") {
      onNavigate?.("dashboard")
    } else if (action === "withdraw") {
      onNavigate?.("withdrawal")
    } else if (action === "admin") {
      onNavigate?.("admin-login")
    } else if (action === "referral") {
      setShowReferral(true)
    }
  }

  return (
    <>
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {menuItems.map((item, idx) => (
            <div
              key={idx}
              onClick={() => handleMenuItemClick(item.action)}
              className="border-b border-gray-200 px-4 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`${item.color} w-16 h-16 rounded-full flex items-center justify-center text-2xl flex-shrink-0`}
                >
                  {item.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-800">{item.title}</h3>
                    {item.badge && (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">{item.subtitle}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 px-4 py-4 text-center text-gray-400 text-sm">v0.11.0</div>
      </div>

      {showReferral && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
          <div className="bg-white w-full rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Referral Program</h2>
              <button onClick={() => setShowReferral(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                ×
              </button>
            </div>
            <ReferralSection />
          </div>
        </div>
      )}

      <WithdrawalModal isOpen={isWithdrawalOpen} onClose={() => setIsWithdrawalOpen(false)} balance={balance} />
    </>
  )
}
