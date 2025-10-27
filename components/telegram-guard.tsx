"use client"

import { useState, useEffect, ReactNode } from "react"

interface TelegramGuardProps {
  children: ReactNode
}

export default function TelegramGuard({ children }: TelegramGuardProps) {
  const [isTelegram, setIsTelegram] = useState<boolean | null>(null)
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userType, setUserType] = useState<'guest' | 'user' | 'admin' | null>(null)
  const [loadingMessage, setLoadingMessage] = useState('Initializing...')
  const [needsReferral, setNeedsReferral] = useState(false)
  const [referralCode, setReferralCode] = useState('')

  useEffect(() => {
    // Check if we're in Telegram Mini App and user is registered
    const checkAccess = async () => {
      if (typeof window !== 'undefined') {
        // Check if we're in admin mode - bypass Telegram checks
        const urlParams = new URLSearchParams(window.location.search)
        const isAdminMode = urlParams.get('admin') === 'true'
        const referralParam = urlParams.get('start') || urlParams.get('ref')
        
        if (referralParam) {
          console.log('[TelegramGuard] Referral code detected:', referralParam)
          setReferralCode(referralParam)
        }
        
        if (isAdminMode) {
          console.log('[TelegramGuard] Admin mode detected, bypassing Telegram checks')
          setLoadingMessage('Loading admin dashboard...')
          setUserType('admin')
          setIsTelegram(true)
          setIsRegistered(true)
          setIsLoading(false)
          return
        }
        
        const tg = (window as any).Telegram?.WebApp
        
        // Wait a bit for Telegram WebApp to initialize
        setTimeout(async () => {
          if (tg && tg.initData && tg.initDataUnsafe?.user) {
            console.log('[TelegramGuard] Telegram WebApp detected')
            setIsTelegram(true)
            tg.ready()
            tg.expand()
            
            // Check if user is registered
            const user = tg.initDataUnsafe.user
            setLoadingMessage('Checking user account...')
            
            try {
              const response = await fetch('/api/user/me', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telegramId: user.id })
              })
              
              if (response.ok) {
                const result = await response.json()
                if (result.success && result.user) {
                  console.log('[TelegramGuard] User is registered:', result.user)
                  setUserType(result.user.is_admin ? 'admin' : 'user')
                  setLoadingMessage(result.user.is_admin ? 'Loading admin interface...' : 'Loading user dashboard...')
                  setIsRegistered(true)
                } else {
                  // User not found - need to register
                  console.log('[TelegramGuard] User not registered yet')
                  setUserType('guest')
                  
                  if (referralCode) {
                    // Auto-register with referral code
                    setLoadingMessage('Creating account with referral...')
                    await registerUserWithReferral(user, referralCode)
                  } else {
                    // Need referral code
                    setLoadingMessage('Account registration required')
                    setNeedsReferral(true)
                    setIsRegistered(false)
                  }
                }
              } else if (response.status === 404) {
                // User not found - need to register
                console.log('[TelegramGuard] User not found in database')
                setUserType('guest')
                
                if (referralCode) {
                  // Auto-register with referral code
                  setLoadingMessage('Creating account with referral...')
                  await registerUserWithReferral(user, referralCode)
                } else {
                  // Need referral code
                  setLoadingMessage('Account registration required')
                  setNeedsReferral(true)
                  setIsRegistered(false)
                }
              } else {
                console.error('[TelegramGuard] API error:', response.status)
                setLoadingMessage('Error checking account')
                setIsRegistered(false)
              }
            } catch (err) {
              console.error('[TelegramGuard] Error checking registration:', err)
              setLoadingMessage('Connection error')
              setIsRegistered(false)
            }
          } else {
            console.log('[TelegramGuard] Not running in Telegram')
            setIsTelegram(false)
            setIsRegistered(false)
          }
          setIsLoading(false)
        }, 500)
      }
    }

    checkAccess()
  }, [])

  // Function to register user with referral code
  const registerUserWithReferral = async (telegramUser: any, refCode: string) => {
    try {
      console.log('[TelegramGuard] Registering user with referral:', refCode)
      const response = await fetch('/api/user/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: telegramUser.id,
          username: telegramUser.username,
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name,
          referralCode: refCode
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.user) {
          console.log('[TelegramGuard] User registered successfully:', result.user)
          setUserType(result.user.is_admin ? 'admin' : 'user')
          setLoadingMessage(result.user.is_admin ? 'Loading admin interface...' : 'Welcome! Loading dashboard...')
          setIsRegistered(true)
          setNeedsReferral(false)
        } else {
          console.error('[TelegramGuard] Registration failed:', result.error)
          setLoadingMessage('Registration failed')
          setNeedsReferral(true)
          setIsRegistered(false)
        }
      } else {
        console.error('[TelegramGuard] Registration API error:', response.status)
        setLoadingMessage('Registration failed')
        setNeedsReferral(true)
        setIsRegistered(false)
      }
    } catch (err) {
      console.error('[TelegramGuard] Registration error:', err)
      setLoadingMessage('Registration failed')
      setNeedsReferral(true)
      setIsRegistered(false)
    }
  }

  // Handle manual referral code submission
  const handleReferralSubmit = async (code: string) => {
    if (!code.trim()) return

    const tg = (window as any).Telegram?.WebApp
    const user = tg?.initDataUnsafe?.user
    
    if (!user) {
      setLoadingMessage('Telegram user not found')
      return
    }

    setIsLoading(true)
    setLoadingMessage('Creating account...')
    await registerUserWithReferral(user, code.trim())
    setIsLoading(false)
  }

  // Show simple loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // If not in Telegram, show clean instructions
  if (!isTelegram) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          {/* Telegram Logo/Icon */}
          <div className="mb-8">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
              </svg>
            </div>
          </div>

          {/* Instructions */}
          <h2 className="text-2xl font-bold text-gray-800 mb-8">How to Access:</h2>
          
          <div className="space-y-6 mb-8">
            <div className="flex items-start text-left">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg mr-4 shadow-md">
                1
              </div>
              <div className="flex-1 pt-1">
                <p className="text-gray-700 text-lg">Open Telegram app on your device</p>
              </div>
            </div>
            
            <div className="flex items-start text-left">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg mr-4 shadow-md">
                2
              </div>
              <div className="flex-1 pt-1">
                <p className="text-gray-700 text-lg">Search for our bot or use the provided link</p>
              </div>
            </div>
            
            <div className="flex items-start text-left">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg mr-4 shadow-md">
                3
              </div>
              <div className="flex-1 pt-1">
                <p className="text-gray-700 text-lg">Click "Start" to launch the Mini App</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show referral code input if needed
  if (needsReferral && !isRegistered) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-3xl">🔗</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-4">Account Registration Required</h2>
          <p className="text-gray-600 mb-6">
            You need a valid referral code to create an account. Please enter your referral code below.
          </p>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter referral code"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-center font-mono text-lg focus:outline-none focus:border-blue-500 transition-colors"
            />
            
            <button
              onClick={() => handleReferralSubmit(referralCode)}
              disabled={!referralCode.trim()}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              Create Account
            </button>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Don't have a referral code?</h3>
            <p className="text-sm text-blue-700">
              Contact an existing user or administrator to get a referral code. 
              All new accounts require a valid referral for registration.
            </p>
          </div>

          {loadingMessage.includes('failed') && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">
                ❌ {loadingMessage}. Please check your referral code and try again.
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // If in Telegram, render the app
  return <>{children}</>
}
