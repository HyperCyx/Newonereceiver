"use client"

import { useEffect, useState } from "react"
import { ChevronLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import WithdrawalModal from "./withdrawal-modal"
import { toast } from "@/hooks/use-toast"

interface WithdrawalHistoryProps {
  onNavigate?: (view: string, data?: any) => void
}

interface Withdrawal {
  id: string
  amount: string
  currency: string
  status: string
  date: string
  confirmed_at?: string
  paid_at?: string
}

export default function WithdrawalHistory({ onNavigate }: WithdrawalHistoryProps) {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState("0.00")
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false)
  const [minWithdrawalAmount, setMinWithdrawalAmount] = useState(5.00)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    // Wait for Telegram WebApp to be ready
    const initData = async () => {
      const tg = (window as any).Telegram?.WebApp
      if (tg) {
        tg.ready()
      }
      await fetchWithdrawals()
      await fetchSettings()
    }
    initData()
  }, [])

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

  const fetchWithdrawals = async () => {
    try {
      const supabase = createClient()
      
      // Get current user's Telegram ID
      const tg = (window as any).Telegram?.WebApp
      const telegramUser = tg?.initDataUnsafe?.user
      
      if (!telegramUser?.id) {
        console.log('[WithdrawalHistory] No Telegram user data available')
        setBalance("0.00")
        setLoading(false)
        return
      }

      console.log('[WithdrawalHistory] Fetching data for telegram_id:', telegramUser.id)

      // Register or get user
      const registerResponse = await fetch('/api/user/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: telegramUser.id,
          username: telegramUser.username || '',
          firstName: telegramUser.first_name || '',
          lastName: telegramUser.last_name || '',
        })
      })
      
      if (!registerResponse.ok) {
        console.error('[WithdrawalHistory] Registration failed')
        setBalance("0.00")
        setLoading(false)
        return
      }
      
      const userData = await registerResponse.json()
      console.log('[WithdrawalHistory] User data from registration:', userData)
      
      // Wait for database consistency
      await new Promise(resolve => setTimeout(resolve, 500))

      // Get user with all columns
      const { data: dbUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegramUser.id)
        .maybeSingle()

      if (!dbUser) {
        console.error('[WithdrawalHistory] User not found:', userError)
        setBalance("0.00")
        setLoading(false)
        return
      }

      console.log('[WithdrawalHistory] User found:', dbUser)
      setUserId(dbUser.id)

      // Set balance
      const userBalance = Number(dbUser.balance || 0)
      setBalance(userBalance.toFixed(2))
      console.log('[WithdrawalHistory] Balance set to:', userBalance.toFixed(2))

      // Fetch withdrawals
      const { data: withdrawalData } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', dbUser.id)
        .order('created_at', { ascending: false })

      if (withdrawalData) {
        const formattedWithdrawals: Withdrawal[] = withdrawalData.map(w => ({
          id: w.id,
          amount: `${Number(w.amount).toFixed(2)} ${w.currency || 'USDT'}`,
          currency: w.currency || 'USDT',
          status: w.status,
          date: new Date(w.created_at).toLocaleDateString('en-US', { 
            month: '2-digit', 
            day: '2-digit'
          }),
          confirmed_at: w.confirmed_at,
          paid_at: w.paid_at
        }))
        setWithdrawals(formattedWithdrawals)
      }
    } catch (error) {
      console.error('[WithdrawalHistory] Error:', error)
      setBalance("0.00")
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadges = (withdrawal: Withdrawal) => {
    const badges = []
    
    if (withdrawal.status === 'confirmed' || withdrawal.status === 'completed') {
      badges.push({ text: 'CONFIRMED', color: 'green' })
    } else if (withdrawal.status === 'pending') {
      badges.push({ text: 'PENDING', color: 'yellow' })
    } else if (withdrawal.status === 'rejected') {
      badges.push({ text: 'REJECTED', color: 'red' })
    }
    
    if (withdrawal.paid_at) {
      badges.push({ text: 'PAID', color: 'green' })
    }
    
    return badges
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Withdrawal History List */}
      <div className="flex-1 overflow-y-auto pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-400 text-sm">Loading...</p>
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-400 text-sm">No withdrawals yet</p>
          </div>
        ) : (
          withdrawals.map((withdrawal) => {
            const badges = getStatusBadges(withdrawal)
            return (
              <div
                key={withdrawal.id}
                onClick={() => onNavigate?.("withdrawal-details", withdrawal.id)}
                className="border-b border-gray-100 px-4 py-3 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-[16px] font-medium text-gray-900">{withdrawal.amount}</p>
                    <p className="text-[13px] text-gray-400 mt-0.5">{withdrawal.date}</p>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600 transition-colors pt-0.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                <div className="flex gap-1.5">
                  {badges.map((badge, idx) => (
                    <span
                      key={idx}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        badge.color === 'green'
                          ? 'bg-green-100 text-green-700'
                          : badge.color === 'yellow'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {badge.text}
                    </span>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-100 p-4 bg-white z-10">
        <button 
          onClick={async () => {
            console.log('[WithdrawalHistory] Button clicked. Current balance:', balance)
            // Refresh balance before opening modal
            await fetchWithdrawals()
            console.log('[WithdrawalHistory] After refresh, balance:', balance)
            setIsWithdrawalOpen(true)
          }}
          className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-[15px] font-medium py-3 rounded-full transition-colors"
        >
          Withdraw Money ({balance} USDT)
        </button>
      </div>

      <WithdrawalModal isOpen={isWithdrawalOpen} onClose={() => setIsWithdrawalOpen(false)} balance={balance} />
    </div>
  )
}
