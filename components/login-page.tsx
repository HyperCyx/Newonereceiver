"use client"

import type React from "react"

import { useState } from "react"

interface LoginPageProps {
  onLogin: () => void
  onBack: () => void
}

export default function LoginPage({ onLogin, onBack }: LoginPageProps) {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otp, setOtp] = useState("")
  const [step, setStep] = useState<"phone" | "otp">("phone")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleContinue = async () => {
    if (!phoneNumber.trim()) {
      setError("Please enter a phone number")
      return
    }

    setLoading(true)
    setError("")

    // Simulate sending OTP via Telegram
    setTimeout(() => {
      setStep("otp")
      setLoading(false)
    }, 1000)
  }

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError("Please enter a 6-digit OTP")
      return
    }

    setLoading(true)
    setError("")

    // Simulate OTP verification
    setTimeout(() => {
      setLoading(false)
      onLogin()
    }, 1000)
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
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        {step === "phone" ? (
          <>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Login Account</h2>
            <p className="text-gray-400 text-center mb-8">Please enter your account phone number</p>

            {/* Phone Input */}
            <div className="w-full max-w-md mb-8">
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Phone number"
                className="w-full px-4 py-3 border-2 border-blue-500 rounded-lg text-lg focus:outline-none"
              />
            </div>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            {/* Continue Button */}
            <button
              onClick={handleContinue}
              disabled={loading}
              className="w-full max-w-md bg-blue-500 text-white py-3 rounded-lg font-semibold text-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? "Sending OTP..." : "Continue"}
            </button>
          </>
        ) : (
          <>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Verify OTP</h2>
            <p className="text-gray-400 text-center mb-2">Enter the OTP sent to</p>
            <p className="text-gray-600 text-center mb-8 font-semibold">{phoneNumber}</p>

            {/* OTP Input */}
            <div className="w-full max-w-md mb-8">
              <div className="flex gap-2 justify-center">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otp[index] || ""}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-12 h-12 border-2 border-blue-500 rounded-lg text-center text-xl font-bold focus:outline-none focus:border-blue-600"
                  />
                ))}
              </div>
            </div>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            {/* Verify Button */}
            <button
              onClick={handleVerifyOtp}
              disabled={loading || otp.length !== 6}
              className="w-full max-w-md bg-blue-500 text-white py-3 rounded-lg font-semibold text-lg hover:bg-blue-600 disabled:opacity-50"
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
              className="text-blue-500 text-sm hover:underline mt-4"
            >
              Change phone number
            </button>
          </>
        )}
      </div>
    </div>
  )
}
