"use client"

import { useState } from "react"
import { ChevronLeft, Menu } from "lucide-react"

interface AdminLoginProps {
  onLogin: (password: string) => void
  onBack: () => void
}

export default function AdminLogin({ onLogin, onBack }: AdminLoginProps) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleLogin = () => {
    if (password === "admin123") {
      onLogin(password)
      setPassword("")
      setError("")
    } else {
      setError("Invalid password")
      setPassword("")
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button onClick={onBack} className="text-gray-600">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">Admin Access</h1>
        <button className="text-gray-600">
          <Menu size={24} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Admin Dashboard</h2>
          <p className="text-gray-500 text-center mb-8">Enter admin password to access</p>

          <div className="mb-6">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-3 border-2 border-blue-500 rounded-lg focus:outline-none focus:border-blue-600"
              onKeyPress={(e) => e.key === "Enter" && handleLogin()}
            />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>

          <button
            onClick={handleLogin}
            className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
          >
            Login
          </button>

          <p className="text-gray-400 text-xs text-center mt-4">Demo password: admin123</p>
        </div>
      </div>
    </div>
  )
}
