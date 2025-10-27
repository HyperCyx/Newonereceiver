"use client"

import { useEffect, useState } from "react"
import ReferralSection from "./referral-section"
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
  const [userName, setUserName] = useState("Guest")
  const [userId, setUserId] = useState("")
  const [balance, setBalance] = useState("0.00")
  const [accountCount, setAccountCount] = useState(0)
  const [showReferral, setShowReferral] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const { saveUserWithReferral } = useReferral()

  useEffect(() => {
    let isMounted = true
    
    const fetchUserData = async () => {
      if (isLoading) return
      
      if (typeof window !== "undefined") {
        const tg = (window as any).Telegram?.WebApp
        if (tg) {
          tg.ready()
          const user = tg.initDataUnsafe?.user
          if (user && isMounted) {
            setIsLoading(true)
            setTelegramUser(user)
            const displayName = `${user.first_name} ${user.last_name || ""}`.trim()
            setUserName(displayName)
            setUserId(`ID: ${user.id}`)
            
            try {
              // Fetch user data via API
              console.log('[MenuView] Fetching user data for Telegram ID:', user.id)
              const response = await fetch('/api/user/me', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telegramId: user.id })
              })
              
              let dbUser = null
              
              if (response.ok) {
                const result = await response.json()
                dbUser = result.user
                console.log('[MenuView] User found in database:', dbUser)
              } else {
                // User doesn't exist, create them
                console.log('[MenuView] User not found in database, creating new user...')
                
                const urlParams = new URLSearchParams(window.location.search)
                const referralCode = urlParams.get('ref') || urlParams.get('start')
                
                try {
                  const registerResponse = await fetch('/api/user/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      telegramId: user.id,
                      username: user.username || `user_${user.id}`,
                      firstName: user.first_name || 'User',
                      lastName: user.last_name || '',
                      phoneNumber: null,
                      referralCode: referralCode
                    })
                  })
                  
                  if (!registerResponse.ok) {
                    const errorText = await registerResponse.text()
                    console.error('[MenuView] Registration failed:', errorText)
                    throw new Error('Failed to register user: ' + errorText)
                  }
                  
                  const result = await registerResponse.json()
                  
                  if (result.user) {
                    dbUser = result.user
                    console.log('[MenuView] User registered successfully:', dbUser._id)
                  } else {
                    console.error('[MenuView] Registration returned no user:', result)
                    throw new Error(result.error || 'Failed to create user account')
                  }
                } catch (registerError: any) {
                  console.error('[MenuView] Registration error:', registerError)
                  if (isMounted) {
                    setError('Failed to create account. Please try again.')
                    setIsLoading(false)
                  }
                  return // Exit early on registration error
                }
              }
              
              if (dbUser && isMounted) {
                const adminStatus = dbUser.is_admin === true
                console.log('[MenuView] ==================')
                console.log('[MenuView] User data received:')
                console.log('[MenuView]   telegram_id:', dbUser.telegram_id)
                console.log('[MenuView]   is_admin raw:', dbUser.is_admin)
                console.log('[MenuView]   is_admin type:', typeof dbUser.is_admin)
                console.log('[MenuView]   is_admin === true:', dbUser.is_admin === true)
                console.log('[MenuView]   adminStatus:', adminStatus)
                console.log('[MenuView]   balance:', dbUser.balance)
                console.log('[MenuView] ==================')
                
                setIsAdmin(adminStatus)
                console.log('[MenuView] SET isAdmin to:', adminStatus)
                
                const balanceValue = Number(dbUser.balance || 0)
                console.log('[MenuView] Balance value:', dbUser.balance, '-> Formatted:', balanceValue.toFixed(2))
                setBalance(balanceValue.toFixed(2))
                
                await saveUserWithReferral(user.id.toString(), undefined, {
                  ...user,
                  referralCode: dbUser.referral_code
                })
              }
              
              // Get accounts count via API
              const accountsResponse = await fetch('/api/accounts/count', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'pending' })
              })
              
              if (accountsResponse.ok) {
                const accountsResult = await accountsResponse.json()
                if (isMounted) {
                  setAccountCount(accountsResult.count || 0)
                }
              }
            } catch (error: any) {
              console.error('[MenuView] Critical error:', error)
              if (isMounted) {
                setError('Failed to load user data. Please refresh the app.')
                setIsLoading(false)
              }
            } finally {
              if (isMounted) {
                setIsLoading(false)
              }
            }
          } else {
            console.log('[MenuView] No Telegram user found')
            if (isMounted) {
              setError('Unable to get Telegram user information')
              setIsLoading(false)
            }
          }
        } else {
          console.log('[MenuView] Telegram WebApp not available')
          if (isMounted) {
            setError('Please open this app in Telegram')
            setIsLoading(false)
          }
        }
      }
    }
    
    fetchUserData()
    
    return () => {
      isMounted = false
    }
  }, [])

  const menuItems: MenuItem[] = [
    {
      icon: "👤",
      title: userName,
      subtitle: userId,
      color: "bg-blue-400",
    },
    {
      icon: "💰",
      title: "Withdraw Money",
      subtitle: balance + " USDT",
      color: "bg-emerald-500",
      action: "withdraw",
    },
    {
      icon: "📦",
      title: "Send Accounts",
      subtitle: accountCount.toString(),
      badge: accountCount > 0 ? "AVAILABLE" : undefined,
      color: "bg-sky-500",
      action: "send",
    },
    {
      icon: "📋",
      title: "Orders",
      subtitle: "0",
      color: "bg-rose-500",
      action: "orders",
    },
    {
      icon: "📢",
      title: "Channel",
      subtitle: "Check our channel for latest updates",
      color: "bg-amber-500",
      action: "channel",
    },
    ...(isAdmin
      ? [
          {
            icon: "⚙️",
            title: "Admin Dashboard",
            subtitle: "Manage system settings",
            color: "bg-gradient-to-r from-purple-500 to-pink-500",
            action: "admin-dashboard",
          },
          {
            icon: "🔗",
            title: "Referral Program",
            subtitle: "Manage referral links",
            color: "bg-violet-500",
            action: "referral",
          },
        ]
      : []),
  ]

  // Debug log when menu renders
  console.log('[MenuView] ==================')
  console.log('[MenuView] RENDERING MENU')
  console.log('[MenuView]   isAdmin state:', isAdmin)
  console.log('[MenuView]   isAdmin type:', typeof isAdmin)
  console.log('[MenuView]   menuItems count:', menuItems.length)
  console.log('[MenuView]   Admin items included:', isAdmin ? 'YES' : 'NO')
  if (isAdmin) {
    console.log('[MenuView]   Admin menu items:', menuItems.filter(i => i.title.includes('Admin') || i.title.includes('Referral')))
  }
  console.log('[MenuView] ==================')

  const handleMenuItemClick = (action?: string) => {
    if (action === "send") {
      onNavigate?.("dashboard")
    } else if (action === "withdraw") {
      onNavigate?.("withdrawal")
    } else if (action === "admin-dashboard") {
      onNavigate?.("admin-login")
    } else if (action === "referral") {
      setShowReferral(true)
    }
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your account...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center p-8 max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Oops!</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setError("")
              setIsLoading(true)
              window.location.reload()
            }}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex-1 flex flex-col bg-white">
        <div className="flex-1 overflow-y-auto">
          {menuItems.map((item, idx) => (
            <div
              key={idx}
              onClick={() => handleMenuItemClick(item.action)}
              className="border-b border-gray-100 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors active:bg-gray-100"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`${item.color} w-11 h-11 rounded-full flex items-center justify-center text-base flex-shrink-0`}
                >
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <h3 className="font-medium text-gray-900 text-[15px]">{item.title}</h3>
                    {item.badge && (
                      <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-gray-400">{item.subtitle}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 px-4 py-3 text-center text-gray-400 text-xs">v0.11.0</div>
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
    </>
  )
}
