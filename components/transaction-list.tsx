"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"

interface Transaction {
  id: string
  phone: string
  amount: string
  currency: string
  status: string[]
  date: string
  fullDate: string
  percentage?: string
  createdAt?: Date
  autoApproveMinutes?: number
}

const getStatusColor = (status: string) => {
  if (status === "ACCEPTED" || status === "SUCCESS" || status === "FREE") {
    return "bg-green-100 text-green-700"
  }
  if (status === "REJECTED" || status === "LIMITED" || status === "LOGIN FAILED" || status === "2FA FAILED") {
    return "bg-red-100 text-red-700"
  }
  return "bg-gray-100 text-gray-700"
}

interface TransactionListProps {
  tab: "pending" | "accepted" | "rejected"
  searchQuery: string
  onLoginClick?: () => void
}

export default function TransactionList({ tab, searchQuery, onLoginClick }: TransactionListProps) {
  const { t } = useLanguage()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [telegramUserId, setTelegramUserId] = useState<number | null>(null)
  const [, setTick] = useState(0)
  const [loginButtonEnabled, setLoginButtonEnabled] = useState<boolean | null>(null)

  // Fetch login button setting
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.settings) {
            const enabled = data.settings.login_button_enabled === 'true' || data.settings.login_button_enabled === true
            setLoginButtonEnabled(enabled)
            console.log('[TransactionList] Login button enabled:', enabled)
          }
        }
      } catch (error) {
        console.error('[TransactionList] Error fetching settings:', error)
      }
    }
    fetchSettings()
  }, [])

  // Update timer every second for live countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1)
    }, 1000) // Update every second for live timer
    return () => clearInterval(interval)
  }, [])

  // Get Telegram user ID
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tg = (window as any).Telegram?.WebApp
      if (tg && tg.initDataUnsafe?.user) {
        setTelegramUserId(tg.initDataUnsafe.user.id)
        console.log('[TransactionList] Telegram user ID:', tg.initDataUnsafe.user.id)
      }
    }
  }, [])

  // Auto-refresh every 5 seconds to check for updates and auto-approvals
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (telegramUserId) {
        console.log('[TransactionList] Auto-refreshing accounts for tab:', tab)
        fetchTransactions(false) // Don't show loading spinner on auto-refresh
      }
    }, 5000) // Refresh every 5 seconds for all tabs
    
    return () => clearInterval(refreshInterval)
  }, [telegramUserId, tab])

  const fetchTransactions = async (showLoading = true) => {
    if (!telegramUserId) {
      console.log('[TransactionList] No Telegram user ID yet, waiting...')
      return
    }

    if (showLoading) {
      setLoading(true)
    }
      try {
        // First get user ID from telegram ID
        const userResponse = await fetch('/api/user/me', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegramId: telegramUserId })
        })

        if (!userResponse.ok) {
          console.log('[TransactionList] User not found')
          setTransactions([])
          setLoading(false)
          return
        }

        const userData = await userResponse.json()
        const userId = userData.user._id
        console.log('[TransactionList] User ID:', userId)

        // Check for auto-approvals if viewing pending tab
        if (tab === 'pending') {
          try {
            console.log('[TransactionList] Checking for auto-approvals...')
            await fetch('/api/accounts/check-auto-approve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: userId })
            })
          } catch (error) {
            console.error('[TransactionList] Error checking auto-approvals:', error)
          }
        }

        // Map tab to status for accounts table
        const statusMap = {
          accepted: 'accepted',
          rejected: 'rejected',
          pending: 'pending'
        }
        
        const response = await fetch('/api/accounts/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            status: statusMap[tab],
            userId: userId  // Filter by user ID
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          
          if (data.success && data.accounts) {
            console.log('[TransactionList] Raw accounts data:', data.accounts)
            
            const formattedTransactions: Transaction[] = data.accounts.map((acc: any) => ({
              id: acc._id,
              phone: acc.phone_number || '',
              amount: Number(acc.amount || 0).toFixed(2),
              currency: 'USDT',
              status: acc.status === 'accepted' ? ['ACCEPTED', 'SUCCESS'] : 
                     acc.status === 'rejected' ? ['REJECTED', 'FAILED'] : ['PENDING'],
              date: new Date(acc.created_at).toLocaleDateString('en-US', { 
                month: '2-digit', 
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              }),
              fullDate: new Date(acc.created_at).toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
              }),
              createdAt: new Date(acc.created_at),
              autoApproveMinutes: acc.auto_approve_minutes || 1440
            }))
            
            // Detailed logging for debugging
            console.log('[TransactionList] Formatted transactions:', 
              formattedTransactions.map(t => ({
                phone: t.phone,
                amount: t.amount,
                autoApproveMinutes: t.autoApproveMinutes,
                autoApproveHours: (t.autoApproveMinutes || 0) / 60,
                status: t.status
              }))
            )
            console.log('[TransactionList] Loaded', formattedTransactions.length, 'transactions for tab:', tab)
            setTransactions(formattedTransactions)
          } else {
            console.log('[TransactionList] No transactions found')
            setTransactions([])
          }
        } else {
          console.error('[TransactionList] Failed to fetch transactions:', response.status)
          setTransactions([])
        }
      } catch (error) {
        console.error('[TransactionList] Error fetching transactions:', error)
        setTransactions([])
      } finally {
        if (showLoading) {
          setLoading(false)
        }
      }
  }

  useEffect(() => {
    fetchTransactions()
  }, [tab, telegramUserId])

  const filteredTransactions = transactions.filter((t) => 
    t.phone.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getTimeRemaining = (transaction: Transaction) => {
    if (!transaction.createdAt || transaction.status[0] !== 'PENDING') return null
    
    const now = new Date()
    const createdAt = new Date(transaction.createdAt)
    
    // Calculate time in seconds for precise countdown
    const secondsPassed = (now.getTime() - createdAt.getTime()) / 1000
    const totalSeconds = (transaction.autoApproveMinutes || 1440) * 60
    const secondsRemaining = totalSeconds - secondsPassed
    
    if (secondsRemaining <= 0) {
      return 'Auto-approving...'
    }
    
    // Convert to hours, minutes, seconds
    const hoursRemaining = Math.floor(secondsRemaining / 3600)
    const minsRemaining = Math.floor((secondsRemaining % 3600) / 60)
    const secsRemaining = Math.floor(secondsRemaining % 60)
    
    // Format with leading zeros for seconds
    const formattedSecs = secsRemaining.toString().padStart(2, '0')
    
    if (hoursRemaining > 0) {
      return `${hoursRemaining}h ${minsRemaining}m ${formattedSecs}s`
    } else if (minsRemaining > 0) {
      return `${minsRemaining}m ${formattedSecs}s`
    } else {
      return `${secsRemaining}s`
    }
  }

  return (
    <div className="flex-1 flex flex-col relative">
      {loading ? (
        <div className="flex-1 flex items-center justify-center pb-20">
          <p className="text-gray-400">Loading...</p>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center pb-20">
          <p className="text-gray-400">No transactions found</p>
        </div>
      ) : (
        <div className="flex-1 pb-20" style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {filteredTransactions.map((transaction) => (
            <div 
              key={transaction.id} 
              className="border-b border-gray-100 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 cursor-pointer"
              onClick={() => setSelectedTransaction(transaction)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-medium text-[15px] text-gray-900">{transaction.phone}</p>
                  <p className="text-[13px] text-gray-400 mt-0.5">
                    {transaction.amount} {transaction.currency}
                    {transaction.percentage && <span className="text-red-500 ml-2">{transaction.percentage}</span>}
                  </p>
                  {transaction.status[0] === 'PENDING' && getTimeRemaining(transaction) && (
                    <p className="text-[12px] text-blue-600 mt-1 font-medium">
                      ⏱️ {getTimeRemaining(transaction)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <button className="text-gray-400 text-base mb-1">↗</button>
                  <p className="text-[13px] text-gray-400">{transaction.date}</p>
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {transaction.status.map((status, idx) => (
                  <span key={idx} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(status)}`}>
                    {status}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {loginButtonEnabled === true && (
        <div className="fixed bottom-0 left-0 right-0 px-4 py-3 border-t border-gray-100 bg-white z-10">
          <button
            onClick={onLoginClick}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white text-[15px] font-medium py-3 rounded-full transition-colors"
          >
            {t('transaction.login')}
          </button>
        </div>
      )}

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedTransaction(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-purple-500 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold">{t('transaction.details')}</h3>
                <button 
                  onClick={() => setSelectedTransaction(null)}
                  className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                >
                  <X size={24} className="text-white" />
                </button>
              </div>
              <p className="text-sm text-blue-100">{t('transaction.viewFullDetails')}</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Status Badges */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-xl border border-blue-100">
                <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">{t('status')}</p>
                <div className="flex gap-2 flex-wrap">
                  {selectedTransaction.status.map((status, idx) => (
                    <span 
                      key={idx} 
                      className={`px-3 py-1.5 rounded-full text-xs font-bold ${getStatusColor(status)} shadow-sm`}
                    >
                      {status}
                    </span>
                  ))}
                </div>
              </div>

              {/* Phone Number */}
              <div className="bg-white p-4 rounded-xl border-2 border-gray-200 hover:border-blue-300 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="material-icons text-blue-600">phone</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-0.5">{t('transaction.phoneNumber')}</p>
                    <p className="text-lg font-bold text-gray-900">{selectedTransaction.phone}</p>
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div className="bg-white p-4 rounded-xl border-2 border-gray-200 hover:border-green-300 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="material-icons text-green-600">payments</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-0.5">{t('admin.amount')}</p>
                    <p className="text-lg font-bold text-green-600">
                      {selectedTransaction.amount} {selectedTransaction.currency}
                    </p>
                  </div>
                </div>
              </div>

              {/* Percentage (if available) */}
              {selectedTransaction.percentage && (
                <div className="bg-white p-4 rounded-xl border-2 border-gray-200 hover:border-red-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="material-icons text-red-600">percent</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-0.5">{t('transaction.percentage')}</p>
                      <p className="text-lg font-bold text-red-600">{selectedTransaction.percentage}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Date & Time */}
              <div className="bg-white p-4 rounded-xl border-2 border-gray-200 hover:border-purple-300 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="material-icons text-purple-600">event</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-0.5">{t('date')}</p>
                    <p className="text-base font-bold text-gray-900">{selectedTransaction.fullDate}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{selectedTransaction.date}</p>
                  </div>
                </div>
              </div>

              {/* Auto-Approve Timer (if pending) */}
              {selectedTransaction.status[0] === 'PENDING' && selectedTransaction.autoApproveMinutes && getTimeRemaining(selectedTransaction) && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border-2 border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="material-icons text-white">timer</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 mb-0.5">{t('transaction.autoApprove')}</p>
                      <p className="text-lg font-bold text-blue-600">
                        ⏱️ {getTimeRemaining(selectedTransaction)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {t('transaction.willAutoApprove')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Transaction ID */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="material-icons text-gray-600">tag</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-0.5">{t('transaction.id')}</p>
                    <p className="text-sm font-mono text-gray-700 break-all">{selectedTransaction.id}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-gray-50 p-4 rounded-b-2xl border-t border-gray-200">
              <button
                onClick={() => setSelectedTransaction(null)}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3 rounded-xl transition-all shadow-lg hover:shadow-xl"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
