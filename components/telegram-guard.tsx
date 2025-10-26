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

  // Show loading initially
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 border-4 border-gray-700 border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  // If not in Telegram, show black screen with message
  if (!isTelegram) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="mb-8">
            <svg className="w-24 h-24 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h1 className="text-3xl font-bold mb-3">Access Restricted</h1>
            <p className="text-gray-400 text-lg mb-6">
              This application can only be accessed through Telegram Mini App.
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-white">How to Access:</h2>
            <ol className="text-left space-y-3 text-gray-300">
              <li className="flex items-start">
                <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0 text-sm font-bold">1</span>
                <span>Open Telegram app on your device</span>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0 text-sm font-bold">2</span>
                <span>Search for our bot or use the provided link</span>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0 text-sm font-bold">3</span>
                <span>Click "Start" to launch the Mini App</span>
              </li>
            </ol>
          </div>

          <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-300">
              <strong>Note:</strong> For security and functionality reasons, this application requires Telegram's secure authentication and can only run within the Telegram ecosystem.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // If in Telegram, render the app
  return <>{children}</>
}
