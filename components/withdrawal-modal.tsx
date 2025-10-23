"use client"

import type React from "react"

import { useState } from "react"
import { X } from "lucide-react"

interface WithdrawalModalProps {
  isOpen: boolean
  onClose: () => void
  balance: string
}

export default function WithdrawalModal({ isOpen, onClose, balance }: WithdrawalModalProps) {
  const [amount, setAmount] = useState("")
  const [walletAddress, setWalletAddress] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    setTimeout(() => {
      setSuccessMessage(`Withdrawal of ${amount} USDT initiated to ${walletAddress}`)
      setAmount("")
      setWalletAddress("")
      setIsSubmitting(false)

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage("")
        onClose()
      }, 3000)
    }, 1000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
      <div className="w-full bg-white rounded-t-2xl p-6 animate-in slide-in-from-bottom">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">Withdraw Money</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-100 border border-green-300 rounded-lg">
            <p className="text-green-700 text-sm font-medium">{successMessage}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Balance Display */}
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <p className="text-sm text-gray-600 mb-1">Available Balance</p>
            <p className="text-2xl font-bold text-blue-600">{balance} USDT</p>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Withdrawal Amount (USDT)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full px-4 py-3 border-2 border-blue-400 rounded-lg focus:outline-none focus:border-blue-600 transition-colors"
              required
              step="0.01"
              min="0"
            />
          </div>

          {/* Wallet Address Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Wallet Address</label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="Enter wallet address"
              className="w-full px-4 py-3 border-2 border-blue-400 rounded-lg focus:outline-none focus:border-blue-600 transition-colors"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !amount || !walletAddress}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-3 rounded-full transition-colors mt-6"
          >
            {isSubmitting ? "Processing..." : "Withdraw"}
          </button>

          {/* Cancel Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-full transition-colors"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  )
}
