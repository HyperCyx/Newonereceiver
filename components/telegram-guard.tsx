"use client"

import { useState, useEffect, ReactNode } from "react"

interface TelegramGuardProps {
  children: ReactNode
}

export default function TelegramGuard({ children }: TelegramGuardProps) {
  const [isTelegram, setIsTelegram] = useState<boolean | null>(null)
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if we're in Telegram Mini App and user is registered
    const checkAccess = async () => {
      if (typeof window !== 'undefined') {
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
            try {
              const response = await fetch('/api/user/me', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telegramId: user.id })
              })
              
              if (response.ok) {
                const result = await response.json()
                if (result.success && result.user) {
                  console.log('[TelegramGuard] User is registered')
                  setIsRegistered(true)
                } else {
                  // User not found, will be registered automatically
                  console.log('[TelegramGuard] User not registered yet')
                  setIsRegistered(true) // Allow access, registration happens in components
                }
              } else {
                // Allow access, registration will happen automatically
                setIsRegistered(true)
              }
            } catch (err) {
              console.error('[TelegramGuard] Error checking registration:', err)
              setIsRegistered(true) // Allow access anyway
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

  // Show simple loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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

  // If in Telegram, render the app
  return <>{children}</>
}
