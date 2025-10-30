"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/i18n/language-context"

interface WithdrawalModalProps {
  isOpen: boolean
  onClose: () => void
  balance: string
}

export default function WithdrawalModal({ isOpen, onClose, balance }: WithdrawalModalProps) {
  const { t } = useLanguage()
  const [amount, setAmount] = useState("")
  const [walletAddress, setWalletAddress] = useState("")
  const [network, setNetwork] = useState<"TRC20" | "Polygon" | "">("")
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
      setNetwork("")
    } else {
      setAmount("")
      setWalletAddress("")
      setNetwork("")
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

      // Check for pending withdrawals
      const checkResponse = await fetch('/api/withdrawal/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: telegramUser.id })
      })

      if (checkResponse.ok) {
        const checkResult = await checkResponse.json()
        if (checkResult.success && checkResult.withdrawals) {
          const pendingWithdrawal = checkResult.withdrawals.find((w: any) => w.status === 'pending')
          if (pendingWithdrawal) {
      toast({
        title: t('withdrawal.pendingExists'),
        description: t('withdrawal.waitForCurrent'),
        variant: "destructive",
        duration: 3000,
      })
      setIsSubmitting(false)
      return
          }
        }
      }

      const response = await fetch('/api/withdrawal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          telegramId: telegramUser.id,
          amount: withdrawalAmount, 
          walletAddress,
          network,
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
        setNetwork("")
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
          title: t('withdrawal.failed'),
          description: result.error || t('withdrawal.tryAgain'),
          variant: "destructive",
          duration: 2000,
        })
        setIsSubmitting(false)
      }
      
    } catch (error) {
      console.error('Withdrawal error:', error)
      toast({
        title: t('withdrawal.failed'),
        description: t('withdrawal.networkError'),
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
          <h2 className="text-xl font-bold text-gray-800">{t('withdrawal.title')}</h2>
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
            <p className="text-sm text-gray-600 mb-1">{t('menu.balance')}</p>
            <p className="text-2xl font-bold text-blue-600">{balance} {t('menu.usdt')}</p>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('withdrawal.amount')}</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t('withdrawal.enterAmount')}
              className="w-full px-4 py-3 border-2 border-blue-400 rounded-lg focus:outline-none focus:border-blue-600 transition-colors text-base"
              required
              step="0.01"
              min="0"
              inputMode="decimal"
            />
            <p className="text-xs text-gray-500 mt-1">{t('withdrawal.minimum')}: {minWithdrawalAmount.toFixed(2)} {t('menu.usdt')}</p>
          </div>

          {/* Network Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">{t('withdrawal.selectNetwork')}</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setNetwork("TRC20")}
                className={`p-4 rounded-xl border-2 transition-all ${
                  network === "TRC20"
                    ? "border-blue-500 bg-blue-50 shadow-md"
                    : "border-gray-300 hover:border-blue-300 bg-white"
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    network === "TRC20" ? "bg-blue-500" : "bg-gray-200"
                  }`}>
                    <span className={`text-xl font-bold ${
                      network === "TRC20" ? "text-white" : "text-gray-600"
                    }`}>T</span>
                  </div>
                  <div className="text-center">
                    <p className={`font-semibold ${
                      network === "TRC20" ? "text-blue-600" : "text-gray-700"
                    }`}>TRC20</p>
                    <p className="text-xs text-gray-500">{t('withdrawal.tronNetwork')}</p>
                  </div>
                  {network === "TRC20" && (
                    <div className="absolute top-2 right-2">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="material-icons text-white text-sm">check</span>
                      </div>
                    </div>
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setNetwork("Polygon")}
                className={`p-4 rounded-xl border-2 transition-all relative ${
                  network === "Polygon"
                    ? "border-purple-500 bg-purple-50 shadow-md"
                    : "border-gray-300 hover:border-purple-300 bg-white"
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    network === "Polygon" ? "bg-purple-500" : "bg-gray-200"
                  }`}>
                    <span className={`text-xl font-bold ${
                      network === "Polygon" ? "text-white" : "text-gray-600"
                    }`}>P</span>
                  </div>
                  <div className="text-center">
                    <p className={`font-semibold ${
                      network === "Polygon" ? "text-purple-600" : "text-gray-700"
                    }`}>Polygon</p>
                    <p className="text-xs text-gray-500">{t('withdrawal.polygonNetwork')}</p>
                  </div>
                  {network === "Polygon" && (
                    <div className="absolute top-2 right-2">
                      <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                        <span className="material-icons text-white text-sm">check</span>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Wallet Address Input - Only show after network selection */}
          {network && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('withdrawal.walletAddress')} ({network})
              </label>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder={t('withdrawal.enterAddress', { network })}
                className="w-full px-4 py-3 border-2 border-blue-400 rounded-lg focus:outline-none focus:border-blue-600 transition-colors text-base"
                required
                autoComplete="off"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('withdrawal.makeValid', { network })}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !amount || !network || !walletAddress}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-3 rounded-full transition-colors mt-6"
          >
            {isSubmitting ? t('withdrawal.processing') : t('withdrawal.withdraw')}
          </button>

          {/* Cancel Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-full transition-colors"
          >
            {t('cancel')}
          </button>
        </form>
      </div>
    </div>
  )
}
