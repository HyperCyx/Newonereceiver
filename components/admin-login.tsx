"use client"

import { useState, useEffect } from "react"
import { ChevronLeft } from "lucide-react"

interface AdminLoginProps {
  onLogin: () => void
  onBack: () => void
}

export default function AdminLogin({ onLogin, onBack }: AdminLoginProps) {
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    checkAdminAccess()
  }, [])

  const checkAdminAccess = async () => {
    try {
      if (typeof window !== 'undefined') {
        const tg = (window as any).Telegram?.WebApp
        const user = tg?.initDataUnsafe?.user

        if (!user) {
          setError("Please open this app through Telegram")
          setLoading(false)
          return
        }

        console.log('[AdminLogin] Checking admin access for:', user.id)

        // Check if user is admin
        const response = await fetch('/api/admin/check-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegramId: user.id })
        })

        if (response.ok) {
          const result = await response.json()
          console.log('[AdminLogin] Admin check result:', result)

          if (result.isAdmin) {
            setIsAuthorized(true)
            // Auto login if authorized
            setTimeout(() => {
              onLogin()
            }, 1000)
          } else {
            setError(`Access Denied. This account is not authorized.\n\nYour Telegram ID: ${user.id}\nAuthorized Admin ID: 1211362365`)
          }
        } else {
          setError("Failed to verify admin access")
        }
      }
    } catch (err) {
      console.error('[AdminLogin] Error:', err)
      setError("An error occurred while checking access")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Verifying Access</h2>
            <p className="text-gray-600 text-center">Checking admin credentials...</p>
          </div>
        </div>
      </div>
    )
  }

  if (isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Granted!</h2>
            <p className="text-gray-600 text-center">Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-6 transition-colors"
        >
          <ChevronLeft size={20} className="mr-1" />
          Back
        </button>

        {/* Error State */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600 text-center whitespace-pre-line mb-6">{error}</p>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 w-full">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Only authorized administrators can access the admin dashboard. Please contact the system administrator if you believe this is an error.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onBack}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold py-3 px-6 rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all shadow-lg"
          >
            Return to Menu
          </button>
        </div>
      </div>
    </div>
  )
}
