"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { toast } from "@/hooks/use-toast"

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
  const [minWithdrawalAmount, setMinWithdrawalAmount] = useState(5.00)

  // Fetch minimum withdrawal amount from settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings')
        if (response.ok) {
          const result = await response.json()
          if (result.settings && result.settings.min_withdrawal_amount) {
            setMinWithdrawalAmount(parseFloat(result.settings.min_withdrawal_amount))
          }
        }
      } catch (error) {
        console.error('Error fetching settings:', error)
      }
    }
    fetchSettings()
  }, [])

  // Auto-fill amount with full balance when modal opens
  useEffect(() => {
    console.log('[WithdrawalModal] Modal state changed:', { isOpen, balance })
    if (isOpen) {
      console.log('[WithdrawalModal] Setting amount to balance:', balance)
      setAmount(balance)
      setWalletAddress("")
    } else {
      setAmount("")
      setWalletAddress("")
    }
  }, [isOpen, balance])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const withdrawalAmount = parseFloat(amount)
    const currentBalance = parseFloat(balance)
    
    console.log('[WithdrawalModal] Validating withdrawal:', { 
      amount, 
      withdrawalAmount, 
      balance, 
      currentBalance, 
      minWithdrawalAmount 
    })
    
    // Validate withdrawal amount
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid withdrawal amount",
        variant: "destructive",
        duration: 2000,
      })
      return
    }
    
    if (withdrawalAmount < minWithdrawalAmount) {
      toast({
        title: "Low Balance",
        description: `Minimum withdrawal: ${minWithdrawalAmount.toFixed(2)} USDT`,
        variant: "destructive",
        duration: 2000,
      })
      return
    }
    
    if (withdrawalAmount > currentBalance) {
      toast({
        title: "Insufficient Balance",
        description: `Your balance is ${currentBalance.toFixed(2)} USDT`,
        variant: "destructive",
        duration: 2000,
      })
      return
    }
    
    setIsSubmitting(true)

    try {
      // Get Telegram user ID
      const tg = (window as any).Telegram?.WebApp
      const telegramUser = tg?.initDataUnsafe?.user
      
      if (!telegramUser) {
        toast({
          title: "Error",
          description: "Unable to identify user",
          variant: "destructive",
          duration: 2000,
        })
        setIsSubmitting(false)
        return
      }

      const response = await fetch('/api/withdrawal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          telegramId: telegramUser.id,
          amount: withdrawalAmount, 
          walletAddress,
          currency: 'USDT'
        })
      })

      console.log('[WithdrawalModal] API response status:', response.status)
      const result = await response.json()
      console.log('[WithdrawalModal] API response data:', result)
      
      if (response.ok && result.success) {
        console.log('[WithdrawalModal] Withdrawal created successfully:', result.withdrawal)
        toast({
          title: "Withdrawal Submitted",
          description: `${withdrawalAmount.toFixed(2)} USDT withdrawal pending`,
          duration: 2000,
        })
        
        setAmount("")
        setWalletAddress("")
        setIsSubmitting(false)
        
        // Close modal and refresh page after short delay
        setTimeout(() => {
          onClose()
          console.log('[WithdrawalModal] Reloading page to show new withdrawal')
          window.location.reload()
        }, 1000)
      } else {
        console.error('[WithdrawalModal] Withdrawal failed:', result)
        toast({
          title: "Withdrawal Failed",
          description: result.error || "Please try again",
          variant: "destructive",
          duration: 2000,
        })
        setIsSubmitting(false)
      }
      
    } catch (error) {
      console.error('Withdrawal error:', error)
      toast({
        title: "Withdrawal Failed",
        description: "Network error. Please try again",
        variant: "destructive",
        duration: 2000,
      })
      setIsSubmitting(false)
    }
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
              className="w-full px-4 py-3 border-2 border-blue-400 rounded-lg focus:outline-none focus:border-blue-600 transition-colors text-base"
              required
              step="0.01"
              min="0"
              inputMode="decimal"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum withdrawal: {minWithdrawalAmount.toFixed(2)} USDT</p>
          </div>

          {/* Wallet Address Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Wallet Address</label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="Enter wallet address"
              className="w-full px-4 py-3 border-2 border-blue-400 rounded-lg focus:outline-none focus:border-blue-600 transition-colors text-base"
              required
              autoComplete="off"
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
