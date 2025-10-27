"use client"

import { useState, useEffect, ReactNode } from "react"

interface TelegramGuardProps {
  children: ReactNode
}

export default function TelegramGuard({ children }: TelegramGuardProps) {
  const [isTelegram, setIsTelegram] = useState<boolean | null>(null)
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [needsReferral, setNeedsReferral] = useState(false)
  const [referralCode, setReferralCode] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const checkAccess = async () => {
      if (typeof window !== 'undefined') {
        // Check if we're in admin mode - bypass Telegram checks
        const urlParams = new URLSearchParams(window.location.search)
        const isAdminMode = urlParams.get('admin') === 'true'
        
        if (isAdminMode) {
          console.log('[TelegramGuard] Admin mode detected, bypassing Telegram checks')
          setIsTelegram(true)
          setIsRegistered(true)
          setIsLoading(false)
          return
        }
        
        const tg = (window as any).Telegram?.WebApp
        
        // Quick check for Telegram WebApp (reduced delay for faster loading)
        setTimeout(async () => {
          if (tg && tg.initData && tg.initDataUnsafe?.user) {
            console.log('[TelegramGuard] Telegram WebApp detected')
            setIsTelegram(true)
            tg.ready()
            tg.expand()
            
            const user = tg.initDataUnsafe.user
            
            // Get referral code from Telegram start_param (bot deep link) or URL parameter
            const telegramStartParam = tg.initDataUnsafe.start_param
            const urlRefParam = urlParams.get('start') || urlParams.get('ref')
            const refCode = telegramStartParam || urlRefParam
            
            if (refCode) {
              console.log('[TelegramGuard] Referral code detected:', refCode)
              setReferralCode(refCode)
            }
            
            try {
              // Check if user exists
              const response = await fetch('/api/user/me', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telegramId: user.id })
              })
              
              if (response.ok) {
                const result = await response.json()
                if (result.success && result.user) {
                  console.log('[TelegramGuard] User already registered:', result.user)
                  setIsRegistered(true)
                  // Keep loading visible for 500ms more to allow MenuView to load data
                  setTimeout(() => setIsLoading(false), 500)
                  return
                }
              }
              
              // User not found - need to register
              console.log('[TelegramGuard] User not registered')
              
              if (refCode) {
                // Auto-register with referral code
                console.log('[TelegramGuard] Auto-registering with referral code:', refCode)
                await registerUserWithReferral(user, refCode)
              } else {
                // No referral code - show input form
                console.log('[TelegramGuard] No referral code, showing input form')
                setNeedsReferral(true)
                setIsRegistered(false)
                setIsLoading(false)
              }
            } catch (err) {
              console.error('[TelegramGuard] Error checking registration:', err)
              setErrorMessage('Connection error. Please try again.')
              setIsLoading(false)
            }
          } else {
            console.log('[TelegramGuard] Not running in Telegram')
            setIsTelegram(false)
            setIsRegistered(false)
            setIsLoading(false)
          }
        }, 100)
      }
    }

    checkAccess()
  }, [])

  // Function to register user with referral code
  const registerUserWithReferral = async (telegramUser: any, refCode: string) => {
    try {
      console.log('[TelegramGuard] Registering user:', {
        telegramId: telegramUser.id,
        username: telegramUser.username,
        referralCode: refCode
      })
      
      const response = await fetch('/api/user/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: telegramUser.id,
          username: telegramUser.username || `user_${telegramUser.id}`,
          firstName: telegramUser.first_name || 'User',
          lastName: telegramUser.last_name || '',
          phoneNumber: null,
          referralCode: refCode
        })
      })

      const result = await response.json()
      
      if (response.ok && result.success && result.user) {
        console.log('[TelegramGuard] User registered successfully:', result.user)
        setIsRegistered(true)
        setNeedsReferral(false)
        setErrorMessage('')
        setIsLoading(false)
      } else {
        console.error('[TelegramGuard] Registration failed:', result.error)
        setErrorMessage(result.error || 'Registration failed. Invalid referral code.')
        setNeedsReferral(true)
        setIsRegistered(false)
        setIsLoading(false)
      }
    } catch (err) {
      console.error('[TelegramGuard] Registration error:', err)
      setErrorMessage('Registration failed. Please try again.')
      setNeedsReferral(true)
      setIsRegistered(false)
      setIsLoading(false)
    }
  }

  // Handle manual referral code submission
  const handleReferralSubmit = async (code: string) => {
    if (!code.trim()) {
      setErrorMessage('Please enter a referral code')
      return
    }

    const tg = (window as any).Telegram?.WebApp
    const user = tg?.initDataUnsafe?.user
    
    if (!user) {
      setErrorMessage('Telegram user not found')
      return
    }

    setIsLoading(true)
    setErrorMessage('')
    await registerUserWithReferral(user, code.trim())
  }

  // Show single loading screen for entire app initialization
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

  // If not in Telegram, show instructions
  if (!isTelegram) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="mb-8">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-8">Open in Telegram</h2>
          
          <div className="space-y-6 mb-8">
            <div className="flex items-start text-left">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg mr-4 shadow-md">
                1
              </div>
              <div className="flex-1 pt-1">
                <p className="text-gray-700 text-lg">Open Telegram app</p>
              </div>
            </div>
            
            <div className="flex items-start text-left">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg mr-4 shadow-md">
                2
              </div>
              <div className="flex-1 pt-1">
                <p className="text-gray-700 text-lg">Search for the bot</p>
              </div>
            </div>
            
            <div className="flex items-start text-left">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg mr-4 shadow-md">
                3
              </div>
              <div className="flex-1 pt-1">
                <p className="text-gray-700 text-lg">Click "Start" to launch</p>
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
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-3xl">🔗</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-4">Referral Code Required</h2>
          <p className="text-gray-600 mb-6">
            Enter your referral code to create an account
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

          {errorMessage && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">
                ❌ {errorMessage}
              </p>
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Need a referral code?</h3>
            <p className="text-sm text-blue-700">
              Get a referral link from an existing user or administrator.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // User is registered - render the app
  return <>{children}</>
}
