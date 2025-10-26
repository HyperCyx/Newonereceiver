"use client"

import { useState, useEffect } from "react"
import {
  ChevronLeft,
  Menu,
  BarChart3,
  Users,
  TrendingUp,
  Wallet,
  PieChart,
  LineChart,
  Link2,
  Check,
  X,
  DollarSign,
} from "lucide-react"

interface AdminDashboardProps {
  onNavigate: (view: string) => void
}

interface DashboardStats {
  totalUsers: number
  totalTransactions: number
  totalWithdrawals: number
  totalRevenue: number
  activeUsers: number
  pendingWithdrawals: number
}

interface Transaction {
  id: string
  userId: string
  userName?: string
  amount: string
  status: "completed" | "pending" | "failed"
  date: string
}

interface Withdrawal {
  id: string
  userId: string
  userName?: string
  amount: string
  walletAddress?: string
  status: "confirmed" | "pending" | "rejected"
  date: string
}

interface PaymentRequest {
  id: string
  userId: string
  userName: string
  amount: string
  walletAddress: string
  status: "pending" | "approved" | "rejected"
  requestDate: string
  processedDate?: string
}

interface User {
  id: string
  telegram_id: number
  telegram_username: string
  first_name?: string
  last_name?: string
  phone_number?: string
  balance: number
  is_admin: boolean
  created_at: string
}

interface ReferralCode {
  id: string
  code: string
  name?: string
  is_active: boolean
  created_by?: string
  max_uses?: number
  used_count: number
  created_at: string
  expires_at?: string
}

interface Country {
  id: string
  country_code: string
  country_name: string
  max_capacity: number
  used_capacity: number
  prize_amount: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "transactions" | "analytics" | "referrals" | "payments" | "countries" | "settings"
  >("overview")

  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalTransactions: 0,
    totalWithdrawals: 0,
    totalRevenue: 0,
    activeUsers: 0,
    pendingWithdrawals: 0,
  })

  const [users, setUsers] = useState<User[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([])
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [minWithdrawalAmount, setMinWithdrawalAmount] = useState("5.00")
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [settingsError, setSettingsError] = useState("")
  const [adminTelegramId, setAdminTelegramId] = useState<number | null>(null)
  const [editingCountry, setEditingCountry] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{capacity: number, prize: number}>()

  // Get Telegram ID on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tg = (window as any).Telegram?.WebApp
      if (tg && tg.initDataUnsafe?.user) {
        setAdminTelegramId(tg.initDataUnsafe.user.id)
      }
    }
  }, [])

  // Computed analytics data
  const dailyRevenue = (() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      return date
    })

    return last7Days.map((date, idx) => {
      const dayTransactions = transactions.filter(t => {
        const txDate = new Date(t.date)
        return txDate.toDateString() === date.toDateString() && t.status === 'completed'
      })
      const revenue = dayTransactions.reduce((sum, t) => sum + Number(t.amount), 0)
      return {
        day: days[date.getDay() === 0 ? 6 : date.getDay() - 1],
        revenue: Math.round(revenue)
      }
    })
  })()

  const transactionStats = (() => {
    const total = transactions.length || 1
    const completed = transactions.filter(t => t.status === 'completed').length
    const pending = transactions.filter(t => t.status === 'pending').length
    const failed = transactions.filter(t => t.status === 'failed').length

    return [
      { status: 'Completed', count: completed, percentage: Math.round((completed / total) * 100) },
      { status: 'Pending', count: pending, percentage: Math.round((pending / total) * 100) },
      { status: 'Failed', count: failed, percentage: Math.round((failed / total) * 100) }
    ]
  })()

  const withdrawalStats = (() => {
    const total = withdrawals.length || 1
    const confirmed = withdrawals.filter(w => w.status === 'confirmed').length
    const pending = withdrawals.filter(w => w.status === 'pending').length
    const rejected = withdrawals.filter(w => w.status === 'rejected').length

    return [
      { status: 'Confirmed', count: confirmed, percentage: Math.round((confirmed / total) * 100) },
      { status: 'Pending', count: pending, percentage: Math.round((pending / total) * 100) },
      { status: 'Rejected', count: rejected, percentage: Math.round((rejected / total) * 100) }
    ]
  })()

  const topUsers = (() => {
    const userRevenue: { [key: string]: { name: string; revenue: number; transactions: number } } = {}
    
    transactions.forEach(tx => {
      if (tx.status === 'completed') {
        if (!userRevenue[tx.userId]) {
          userRevenue[tx.userId] = {
            name: tx.userName || tx.userId.substring(0, 8) + '...',
            revenue: 0,
            transactions: 0
          }
        }
        userRevenue[tx.userId].revenue += Number(tx.amount)
        userRevenue[tx.userId].transactions += 1
      }
    })

    return Object.values(userRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
  })()

  useEffect(() => {
    fetchAllData()
    fetchSettings()
  }, [activeTab])

  // Get Telegram user ID
  const getTelegramId = () => {
    if (typeof window !== 'undefined') {
      const tg = (window as any).Telegram?.WebApp
      return tg?.initDataUnsafe?.user?.id
    }
    return null
  }

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const result = await response.json()
        if (result.settings && result.settings.min_withdrawal_amount) {
          setMinWithdrawalAmount(result.settings.min_withdrawal_amount)
        }
      }
    } catch (error) {
      console.error('[AdminDashboard] Error fetching settings:', error)
    }
  }

  const fetchAllData = async () => {
    setLoading(true)

    try {
      // Fetch users from API (bypasses RLS)
      if (activeTab === 'users' || activeTab === 'overview') {
        try {
          const response = await fetch('/api/admin/users')
          if (response.ok) {
            const result = await response.json()
            if (result.users) {
              setUsers(result.users)
              console.log('[AdminDashboard] Loaded', result.users.length, 'users')
            }
          } else {
            console.error('[AdminDashboard] Failed to fetch users:', response.status)
            setUsers([])
          }
        } catch (err) {
          console.error('[AdminDashboard] Error fetching users:', err)
          setUsers([])
        }
      }

      // Fetch stats from API
      const [usersResponse, withdrawalsResponse, transactionsResponse] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/withdrawals'),
        fetch('/api/transactions/list')
      ])

      const usersCount = await usersResponse.json()
      const withdrawalsResult = await withdrawalsResponse.json()
      const transactionsResult = await transactionsResponse.json()

      const pendingWithdrawals = withdrawalsResult.withdrawals?.filter((w: any) => w.status === 'pending').length || 0
      const totalRevenue = transactionsResult.transactions?.reduce((sum: number, t: any) => 
        t.status === 'completed' ? sum + Number(t.amount) : sum, 0) || 0

      setStats({
        totalUsers: usersCount.count || 0,
        totalTransactions: transactionsResult.transactions?.length || 0,
        totalWithdrawals: withdrawalsResult.withdrawals?.length || 0,
        totalRevenue,
        activeUsers: usersCount.count || 0,
        pendingWithdrawals
      })

      // Fetch transactions
      if (activeTab === 'transactions' || activeTab === 'overview' || activeTab === 'analytics') {
        try {
          const response = await fetch('/api/transactions/list')
          if (response.ok) {
            const result = await response.json()
            if (result.success && result.transactions) {
              const formattedTx: Transaction[] = result.transactions.map((tx: any) => ({
                id: tx._id,
                userId: tx.user_id,
                userName: tx.users?.telegram_username || 'Unknown',
                amount: Number(tx.amount).toFixed(2),
                status: tx.status as "completed" | "pending" | "failed",
                date: new Date(tx.created_at).toLocaleDateString()
              }))
              setTransactions(formattedTx)
            }
          }
        } catch (err) {
          console.error('[AdminDashboard] Error fetching transactions:', err)
          setTransactions([])
        }
      }

      // Fetch withdrawals with user info (only for analytics and overview)
      if (activeTab === 'overview' || activeTab === 'analytics') {
        try {
          const response = await fetch('/api/admin/withdrawals')
          if (response.ok) {
            const result = await response.json()
            if (result.withdrawals) {
              const formattedWd: Withdrawal[] = result.withdrawals.map((wd: any) => ({
                id: wd.id,
                userId: wd.user_id,
                userName: wd.users?.telegram_username || `${wd.users?.first_name || ''} ${wd.users?.last_name || ''}`.trim() || 'Unknown',
                amount: Number(wd.amount).toFixed(2),
                walletAddress: wd.wallet_address || 'N/A',
                status: wd.status as "confirmed" | "pending" | "rejected",
                date: new Date(wd.created_at).toLocaleDateString()
              }))
              setWithdrawals(formattedWd)
              console.log('[AdminDashboard] Loaded', formattedWd.length, 'withdrawals')
            }
          } else {
            console.error('[AdminDashboard] Failed to fetch withdrawals:', response.status)
            setWithdrawals([])
          }
        } catch (err) {
          console.error('[AdminDashboard] Error fetching withdrawals:', err)
          setWithdrawals([])
        }
      }

      // Fetch payment requests with user info
      if (activeTab === 'payments') {
        try {
          // Fetch withdrawals
          const wdResponse = await fetch('/api/admin/withdrawals')
          if (wdResponse.ok) {
            const wdResult = await wdResponse.json()
            if (wdResult.withdrawals) {
              const formattedWd: Withdrawal[] = wdResult.withdrawals.map((wd: any) => ({
                id: wd._id,
                userId: wd.user_id,
                userName: wd.users?.telegram_username || `${wd.users?.first_name || ''} ${wd.users?.last_name || ''}`.trim() || 'Unknown',
                amount: Number(wd.amount).toFixed(2),
                walletAddress: wd.wallet_address || 'N/A',
                status: wd.status as "confirmed" | "pending" | "rejected",
                date: new Date(wd.created_at).toLocaleDateString()
              }))
              setWithdrawals(formattedWd)
              console.log('[AdminDashboard] Loaded', formattedWd.length, 'withdrawals')
            }
          }

          // Fetch payment requests
          const response = await fetch('/api/admin/payments')
          if (response.ok) {
            const result = await response.json()
            if (result.payments) {
              const formattedPr: PaymentRequest[] = result.payments.map((pr: any) => ({
                id: pr._id,
                userId: pr.user_id,
                userName: pr.users?.telegram_username || `${pr.users?.first_name || ''} ${pr.users?.last_name || ''}`.trim() || 'Unknown',
                amount: Number(pr.amount).toFixed(2),
                walletAddress: pr.wallet_address,
                status: pr.status as "pending" | "approved" | "rejected",
                requestDate: new Date(pr.created_at).toLocaleDateString(),
                processedDate: pr.status !== 'pending' && pr.updated_at !== pr.created_at 
                  ? new Date(pr.updated_at).toLocaleDateString() 
                  : undefined
              }))
              setPaymentRequests(formattedPr)
              console.log('[AdminDashboard] Loaded', formattedPr.length, 'payment requests')
            }
          } else {
            console.error('[AdminDashboard] Failed to fetch payment requests:', response.status)
            setPaymentRequests([])
          }
        } catch (err) {
          console.error('[AdminDashboard] Error fetching payment requests:', err)
          setPaymentRequests([])
        }
      }

      // Fetch referral codes
      if (activeTab === 'referrals') {
        try {
          const response = await fetch('/api/referral-codes')
          if (response.ok) {
            const result = await response.json()
            if (result.success && result.codes) {
              setReferralCodes(result.codes)
            }
          }
        } catch (err) {
          console.error('[AdminDashboard] Error fetching referral codes:', err)
          setReferralCodes([])
        }
      }

      // Fetch countries
      if (activeTab === 'countries') {
        try {
          const response = await fetch('/api/admin/countries')
          if (response.ok) {
            const result = await response.json()
            if (result.success && result.countries) {
              setCountries(result.countries)
            }
          }
        } catch (err) {
          console.error('[AdminDashboard] Error fetching countries:', err)
          setCountries([])
        }
      }

    } catch (error) {
      console.error('Error fetching admin data:', error)
    }

    setLoading(false)
  }

  const handleApprovePayment = async (id: string) => {
    try {
      const response = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: id, action: 'approve' })
      })
      
      if (response.ok) {
        console.log('[AdminDashboard] Payment approved successfully')
        fetchAllData()
      } else {
        console.error('[AdminDashboard] Failed to approve payment')
      }
    } catch (error) {
      console.error('[AdminDashboard] Error approving payment:', error)
    }
  }

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    setSettingsError("")
    setSettingsSaved(false)
    
    try {
      // Validate input
      const minAmount = parseFloat(minWithdrawalAmount)
      if (isNaN(minAmount) || minAmount < 0) {
        console.error('[AdminDashboard] Invalid amount:', minWithdrawalAmount)
        setSettingsError("Please enter a valid amount")
        setSavingSettings(false)
        return
      }

      console.log('[AdminDashboard] Saving minimum withdrawal amount:', minAmount)

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settingKey: 'min_withdrawal_amount',
          settingValue: minAmount.toFixed(2),
          telegramId: adminTelegramId
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[AdminDashboard] API error:', errorText)
        setSettingsError("Failed to save settings")
        setSavingSettings(false)
        return
      }

      const result = await response.json()
      console.log('[AdminDashboard] Save response:', result)

      if (result.success) {
        // Show success indicator
        setSettingsSaved(true)
        setSettingsError("")
        // Refresh settings
        await fetchSettings()
        // Hide indicator after 3 seconds
        setTimeout(() => setSettingsSaved(false), 3000)
      } else {
        console.error('[AdminDashboard] Failed to save:', result.error)
        setSettingsError(result.error || "Failed to save settings")
      }
    } catch (error) {
      console.error('[AdminDashboard] Error:', error)
      setSettingsError("An error occurred while saving")
    } finally {
      setSavingSettings(false)
    }
  }

  const handleRejectPayment = async (id: string) => {
    try {
      const response = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: id, action: 'reject' })
      })
      
      if (response.ok) {
        console.log('[AdminDashboard] Payment rejected successfully')
        fetchAllData()
      } else {
        console.error('[AdminDashboard] Failed to reject payment')
      }
    } catch (error) {
      console.error('[AdminDashboard] Error rejecting payment:', error)
    }
  }

  const handleApproveWithdrawal = async (id: string) => {
    try {
      const response = await fetch('/api/admin/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalId: id, action: 'approve' })
      })
      
      if (response.ok) {
        console.log('[AdminDashboard] Withdrawal approved successfully')
        fetchAllData()
      } else {
        console.error('[AdminDashboard] Failed to approve withdrawal')
      }
    } catch (error) {
      console.error('[AdminDashboard] Error approving withdrawal:', error)
    }
  }

  const handleRejectWithdrawal = async (id: string) => {
    try {
      const response = await fetch('/api/admin/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalId: id, action: 'reject' })
      })
      
      if (response.ok) {
        console.log('[AdminDashboard] Withdrawal rejected successfully')
        fetchAllData()
      } else {
        console.error('[AdminDashboard] Failed to reject withdrawal')
      }
    } catch (error) {
      console.error('[AdminDashboard] Error rejecting withdrawal:', error)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 flex overflow-x-auto sticky top-0 z-10">
        {(["overview", "users", "transactions", "analytics", "referrals", "payments", "countries", "settings"] as const).map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-semibold text-sm whitespace-nowrap transition-colors ${
                activeTab === tab ? "text-blue-500 border-b-2 border-blue-500" : "text-gray-600 hover:text-gray-800"
              }`}
            >
              {tab === "payments" ? "Payment Requests" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ),
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "overview" && (
          <div className="p-4 space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Total Users</span>
                  <Users size={20} className="text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-gray-800">{stats.totalUsers}</p>
                <p className="text-xs text-green-600 mt-1">+12% this month</p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Active Users</span>
                  <TrendingUp size={20} className="text-green-500" />
                </div>
                <p className="text-2xl font-bold text-gray-800">{stats.activeUsers}</p>
                <p className="text-xs text-green-600 mt-1">Online now</p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Total Revenue</span>
                  <BarChart3 size={20} className="text-orange-500" />
                </div>
                <p className="text-2xl font-bold text-gray-800">${stats.totalRevenue.toFixed(2)}</p>
                <p className="text-xs text-green-600 mt-1">+8% this week</p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Pending Withdrawals</span>
                  <Wallet size={20} className="text-red-500" />
                </div>
                <p className="text-2xl font-bold text-gray-800">{stats.pendingWithdrawals}</p>
                <p className="text-xs text-red-600 mt-1">Needs attention</p>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Recent Transactions</h3>
              <div className="space-y-2">
                {loading ? (
                  <p className="text-center text-gray-400 py-4">Loading...</p>
                ) : transactions.length === 0 ? (
                  <p className="text-center text-gray-400 py-4">No transactions yet</p>
                ) : (
                  transactions.slice(0, 3).map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{tx.userName || tx.userId.substring(0, 20) + '...'}</p>
                      <p className="text-xs text-gray-500">{tx.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-800">${tx.amount}</p>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          tx.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : tx.status === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="p-4">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Telegram ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Username</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Balance</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Join Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr key="loading">
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                          Loading...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr key="no-users">
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user._id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-800 font-mono">{user.telegram_id}</td>
                          <td className="px-4 py-3 text-sm text-gray-800">
                            {user.first_name} {user.last_name || ''}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">@{user.telegram_username || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-600">
                            ${Number(user.balance || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                user.is_admin ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"
                              }`}
                            >
                              {user.is_admin ? 'Admin' : 'User'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "transactions" && (
          <div className="p-4">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">User ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr key="loading-transactions">
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                          Loading transactions...
                        </td>
                      </tr>
                    ) : transactions.length === 0 ? (
                      <tr key="no-transactions">
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                          No transactions found
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => (
                        <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-800">{tx.userName || tx.userId}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-800">${tx.amount}</td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              tx.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : tx.status === "pending"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{tx.date}</td>
                      </tr>
                    ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}


        {activeTab === "analytics" && (
          <div className="p-4 space-y-4">
            {/* Daily Revenue Chart */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <LineChart size={20} className="text-blue-500" />
                Daily Revenue (Last 7 Days)
              </h3>
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <p className="text-gray-400">Loading chart data...</p>
                </div>
              ) : (
                <div className="flex items-end justify-between h-40 gap-2">
                  {dailyRevenue.map((item, idx) => {
                    const maxRevenue = Math.max(...dailyRevenue.map(d => d.revenue), 1)
                    const heightPercent = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0
                    
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center">
                        <div className="w-full bg-blue-100 rounded-t relative group h-full flex items-end">
                          <div
                            className="bg-blue-500 rounded-t transition-all hover:bg-blue-600 cursor-pointer w-full"
                            style={{ height: `${heightPercent}%`, minHeight: item.revenue > 0 ? '4px' : '0' }}
                          >
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                              ${item.revenue}
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">{item.day}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Transaction Status Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <PieChart size={20} className="text-green-500" />
                  Transaction Status
                </h3>
                <div className="space-y-3">
                  {transactionStats.map((stat, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-700">{stat.status}</span>
                        <span className="text-sm font-semibold text-gray-800">{stat.count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            stat.status === "Completed"
                              ? "bg-green-500"
                              : stat.status === "Pending"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                          style={{ width: `${stat.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{stat.percentage}% of total</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Withdrawal Status Distribution */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <PieChart size={20} className="text-orange-500" />
                  Withdrawal Status
                </h3>
                <div className="space-y-3">
                  {withdrawalStats.map((stat, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-700">{stat.status}</span>
                        <span className="text-sm font-semibold text-gray-800">{stat.count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            stat.status === "Confirmed"
                              ? "bg-green-500"
                              : stat.status === "Pending"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                          style={{ width: `${stat.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{stat.percentage}% of total</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Users Report */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Users size={20} className="text-purple-500" />
                Top Users by Revenue
              </h3>
              <div className="space-y-3">
                {loading ? (
                  <p className="text-center text-gray-400 py-4">Loading top users...</p>
                ) : topUsers.length === 0 ? (
                  <p className="text-center text-gray-400 py-4">No user revenue data yet</p>
                ) : (
                  topUsers.map((user, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.transactions} transactions</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-green-600">${user.revenue.toFixed(2)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "referrals" && (
          <div className="p-4 space-y-4">
            {/* Create Referral Code Section */}
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg p-4 md:p-6 text-white">
              <h3 className="font-bold text-base md:text-lg mb-2">Create Master Referral Code</h3>
              <p className="text-xs md:text-sm text-purple-100 mb-3 md:mb-4">Generate a standalone referral code that can be used independently</p>
              <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                <input
                  type="text"
                  placeholder="Enter code name (optional)"
                  className="flex-1 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-sm md:text-base text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
                  id="referral-name-input"
                />
                <button
                  onClick={async () => {
                    const input = document.getElementById('referral-name-input') as HTMLInputElement
                    const codeName = input.value || 'MASTER'
                    
                    try {
                      const response = await fetch('/api/referral-codes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ codeName })
                      })
                      
                      const result = await response.json()
                      
                      if (!response.ok) {
                        alert('Error: ' + (result.error || 'Failed to create referral code'))
                        return
                      }
                      
                      if (result.success) {
                        alert(`Referral code created successfully!\n\nCode: ${result.code}\n\nLink: ${result.link}\n\nUsers MUST register using this link.`)
                        input.value = ''
                        fetchAllData()
                      }
                    } catch (err) {
                      console.error('Error:', err)
                      alert('Error creating referral code')
                    }
                  }}
                  className="px-4 md:px-6 py-2 md:py-2.5 bg-white text-purple-600 rounded-lg text-sm md:text-base font-semibold hover:bg-gray-100 transition-colors w-full sm:w-auto"
                >
                  Generate Code
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-4 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                  <Link2 size={20} className="text-purple-500" />
                  Referral Program Management
                </h3>
                <p className="text-sm text-gray-600">Manage all referral links and track referral performance</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-semibold text-gray-700">Code Name</th>
                      <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-semibold text-gray-700">Referral Code</th>
                      <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-semibold text-gray-700">Used Count</th>
                      <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-semibold text-gray-700">Max Uses</th>
                      <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-semibold text-gray-700">Created</th>
                      <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-semibold text-gray-700">Bot Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr key="loading-referrals">
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                          Loading referral codes...
                        </td>
                      </tr>
                    ) : referralCodes.length === 0 ? (
                      <tr key="no-referrals">
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                          No referral codes found. Create one above!
                        </td>
                      </tr>
                    ) : (
                      referralCodes.slice(0, 20).map((code) => (
                        <tr key={code._id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-800 font-medium">
                            {code.name || 'Unnamed'}
                          </td>
                          <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm">
                            <code className="bg-gray-100 px-1.5 md:px-2 py-0.5 md:py-1 rounded text-[10px] md:text-xs font-mono text-purple-600">
                              {code.code}
                            </code>
                          </td>
                          <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm">
                            <span className="bg-purple-100 text-purple-700 px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-sm font-semibold">
                              {code.used_count}
                            </span>
                          </td>
                          <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600">
                            {code.max_uses || '∞'}
                          </td>
                          <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm">
                            {code.is_active ? (
                              <span className="bg-green-100 text-green-700 px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-sm font-semibold">
                                Active
                              </span>
                            ) : (
                              <span className="bg-gray-100 text-gray-700 px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-sm font-semibold">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600">
                            {new Date(code.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm">
                            <button
                              onClick={() => {
                                const link = `https://t.me/${process.env.NEXT_PUBLIC_BOT_USERNAME || 'WhatsAppNumberRedBot'}?start=${code.code}`
                                navigator.clipboard.writeText(link)
                                alert('Bot link copied to clipboard!')
                              }}
                              className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                            >
                              <Link2 size={14} />
                              Copy
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Referral Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Total Referral Codes</span>
                  <Link2 size={20} className="text-purple-500" />
                </div>
                <p className="text-2xl font-bold text-gray-800">{referralCodes.length}</p>
                <p className="text-xs text-gray-500 mt-1">Active: {referralCodes.filter(c => c.is_active).length}</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Total Users Registered</span>
                  <Users size={20} className="text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-gray-800">
                  {referralCodes.reduce((sum, c) => sum + c.used_count, 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Via referral codes</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Avg. Usage Rate</span>
                  <TrendingUp size={20} className="text-green-500" />
                </div>
                <p className="text-2xl font-bold text-gray-800">
                  {referralCodes.length > 0 
                    ? (referralCodes.reduce((sum, c) => sum + c.used_count, 0) / referralCodes.length).toFixed(1)
                    : '0'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Users per code</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "payments" && (
          <div className="p-4">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-blue-50 px-4 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                  <Wallet size={20} className="text-green-500" />
                  Payment Requests Management
                </h3>
                <p className="text-sm text-gray-600">Review and process all withdrawal and payment requests from users</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">User</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Wallet Address</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr key="loading-requests">
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                          Loading requests...
                        </td>
                      </tr>
                    ) : [...withdrawals.map(w => ({...w, type: 'Withdrawal'})), ...paymentRequests.map(p => ({...p, type: 'Payment', date: p.requestDate}))].length === 0 ? (
                      <tr key="no-requests">
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                          No requests found
                        </td>
                      </tr>
                    ) : (
                      [...withdrawals.map(w => ({...w, type: 'Withdrawal'})), ...paymentRequests.map(p => ({...p, type: 'Payment', date: p.requestDate}))]
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((request: any) => (
                        <tr key={`${request.type}-${request.id}`} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-800">{request.userName || request.userId}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-800">${request.amount}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 font-mono text-xs">
                            {request.walletAddress && request.walletAddress !== 'N/A' ? (
                              <span title={request.walletAddress}>
                                {request.walletAddress.length > 20 
                                  ? `${request.walletAddress.substring(0, 10)}...${request.walletAddress.substring(request.walletAddress.length - 10)}`
                                  : request.walletAddress}
                              </span>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                (request.status === "confirmed" || request.status === "approved")
                                  ? "bg-green-100 text-green-700"
                                  : request.status === "pending"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                              }`}
                            >
                              {request.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{request.date}</td>
                          <td className="px-4 py-3 text-sm">
                            {request.status === 'pending' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => request.type === 'Withdrawal' ? handleApproveWithdrawal(request.id) : handleApprovePayment(request.id)}
                                  className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded transition-colors"
                                >
                                  <Check size={14} className="inline mr-1" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => request.type === 'Withdrawal' ? handleRejectWithdrawal(request.id) : handleRejectPayment(request.id)}
                                  className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors"
                                >
                                  <X size={14} className="inline mr-1" />
                                  Reject
                                </button>
                              </div>
                            )}
                            {request.status !== 'pending' && (
                              <span className="text-xs text-gray-400">No actions</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Total Pending</span>
                  <Wallet size={20} className="text-yellow-500" />
                </div>
                <p className="text-2xl font-bold text-gray-800">
                  {withdrawals.filter((r) => r.status === "pending").length + paymentRequests.filter((r) => r.status === "pending").length}
                </p>
                <p className="text-xs text-yellow-600 mt-1">Awaiting approval</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Withdrawals</span>
                  <TrendingUp size={20} className="text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-gray-800">
                  {withdrawals.length}
                </p>
                <p className="text-xs text-blue-600 mt-1">{withdrawals.filter(w => w.status === 'pending').length} pending</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Payment Requests</span>
                  <Check size={20} className="text-purple-500" />
                </div>
                <p className="text-2xl font-bold text-gray-800">
                  {paymentRequests.length}
                </p>
                <p className="text-xs text-purple-600 mt-1">{paymentRequests.filter(p => p.status === 'pending').length} pending</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Pending Amount</span>
                  <DollarSign size={20} className="text-green-500" />
                </div>
                <p className="text-2xl font-bold text-gray-800">
                  $
                  {(
                    withdrawals.filter((r) => r.status === "pending").reduce((sum, r) => sum + Number.parseFloat(r.amount), 0) +
                    paymentRequests.filter((r) => r.status === "pending").reduce((sum, r) => sum + Number.parseFloat(r.amount), 0)
                  ).toFixed(2)}
                </p>
                <p className="text-xs text-green-600 mt-1">Total to process</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "countries" && (
          <div className="p-4 space-y-4">
            {/* Add New Country Section */}
            <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-lg p-4 md:p-6 text-white">
              <h3 className="font-bold text-base md:text-lg mb-2">Add New Country</h3>
              <p className="text-xs md:text-sm text-green-100 mb-3 md:mb-4">Configure country-specific account purchase settings</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Country Code (e.g., US)"
                  className="px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-sm md:text-base text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
                  id="country-code-input"
                />
                <input
                  type="text"
                  placeholder="Country Name"
                  className="px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-sm md:text-base text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
                  id="country-name-input"
                />
                <input
                  type="number"
                  placeholder="Max Capacity"
                  min="0"
                  className="px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-sm md:text-base text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
                  id="country-capacity-input"
                />
                <input
                  type="number"
                  placeholder="Prize Amount (USDT)"
                  step="0.01"
                  min="0"
                  className="px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-sm md:text-base text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
                  id="country-prize-input"
                />
              </div>
              <button
                onClick={async () => {
                  const codeInput = document.getElementById('country-code-input') as HTMLInputElement
                  const nameInput = document.getElementById('country-name-input') as HTMLInputElement
                  const capacityInput = document.getElementById('country-capacity-input') as HTMLInputElement
                  const prizeInput = document.getElementById('country-prize-input') as HTMLInputElement
                  
                  if (!codeInput.value || !nameInput.value) {
                    alert('Please enter country code and name')
                    return
                  }
                  
                  try {
                    const response = await fetch('/api/admin/countries', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'create',
                        countryCode: codeInput.value.toUpperCase(),
                        countryName: nameInput.value,
                        maxCapacity: parseInt(capacityInput.value) || 0,
                        prizeAmount: parseFloat(prizeInput.value) || 0,
                        telegramId: adminTelegramId
                      })
                    })
                    
                    const result = await response.json()
                    
                    if (!response.ok) {
                      alert('Error: ' + (result.error || 'Failed to create country'))
                      return
                    }
                    
                    if (result.success) {
                      alert(`Country ${result.country.country_name} created successfully!`)
                      codeInput.value = ''
                      nameInput.value = ''
                      capacityInput.value = ''
                      prizeInput.value = ''
                      fetchAllData()
                    }
                  } catch (err) {
                    console.error('Error:', err)
                    alert('Error creating country')
                  }
                }}
                className="mt-3 w-full px-4 md:px-6 py-2 md:py-2.5 bg-white text-green-600 rounded-lg text-sm md:text-base font-semibold hover:bg-gray-100 transition-colors"
              >
                Add Country
              </button>
            </div>

            {/* Countries Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-teal-50 px-4 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                  <BarChart3 size={20} className="text-green-500" />
                  Country Capacity Management
                </h3>
                <p className="text-sm text-gray-600">Manage which countries can purchase accounts and set capacity limits</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Country</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Code</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Max Capacity</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Used</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Available</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Prize (USDT)</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr key="loading-countries">
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                          Loading countries...
                        </td>
                      </tr>
                    ) : countries.length === 0 ? (
                      <tr key="no-countries">
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                          No countries found. Add one above!
                        </td>
                      </tr>
                    ) : (
                      countries.map((country) => {
                        const available = country.max_capacity - country.used_capacity
                        const usagePercent = country.max_capacity > 0 
                          ? (country.used_capacity / country.max_capacity) * 100 
                          : 0
                        
                        const isEditing = editingCountry === country._id
                        
                        return (
                          <tr key={country._id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-800">
                              {country.country_name}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-700">
                                {country.country_code}
                              </code>
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={editValues?.capacity ?? country.max_capacity}
                                  onChange={(e) => setEditValues(prev => ({...prev!, capacity: parseInt(e.target.value) || 0}))}
                                  min="0"
                                  className="w-20 px-2 py-1 border-2 border-blue-500 rounded text-sm focus:outline-none"
                                />
                              ) : (
                                <span>{country.max_capacity}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                                {country.used_capacity}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                  available > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {available}
                                </span>
                                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${usagePercent >= 100 ? 'bg-red-500' : usagePercent >= 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={editValues?.prize ?? country.prize_amount}
                                  onChange={(e) => setEditValues(prev => ({...prev!, prize: parseFloat(e.target.value) || 0}))}
                                  step="0.01"
                                  min="0"
                                  className="w-20 px-2 py-1 border-2 border-blue-500 rounded text-sm focus:outline-none"
                                />
                              ) : (
                                <span className="font-semibold">${country.prize_amount.toFixed(2)}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <button
                                onClick={async () => {
                                  console.log('[Toggle] Country ID:', country._id)
                                  console.log('[Toggle] Admin Telegram ID:', adminTelegramId)
                                  console.log('[Toggle] Current status:', country.is_active)
                                  
                                  if (!adminTelegramId) {
                                    alert('❌ Error: Admin Telegram ID not found. Please refresh the page.')
                                    return
                                  }
                                  
                                  try {
                                    console.log('[Toggle] Sending toggle request...')
                                    const response = await fetch('/api/admin/countries', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        action: 'update',
                                        countryId: country._id,
                                        isActive: !country.is_active,
                                        telegramId: adminTelegramId
                                      })
                                    })
                                    
                                    const result = await response.json()
                                    console.log('[Toggle] Response:', response.status, result)
                                    
                                    if (response.ok) {
                                      alert(`✅ ${country.country_name} is now ${!country.is_active ? 'Active' : 'Inactive'}`)
                                      await fetchAllData()
                                    } else {
                                      console.error('[Toggle] Failed:', result)
                                      alert(`❌ Failed to update: ${result.error || 'Unknown error'}`)
                                    }
                                  } catch (err) {
                                    console.error('[Toggle] Error:', err)
                                    alert(`❌ Error toggling status: ${err}`)
                                  }
                                }}
                                className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
                                  country.is_active 
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                                disabled={isEditing}
                              >
                                {country.is_active ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex gap-2 justify-center flex-wrap">
                                {isEditing ? (
                                  <>
                                    <button
                                      onClick={async () => {
                                        console.log('[Save] Country ID:', country._id)
                                        console.log('[Save] Admin Telegram ID:', adminTelegramId)
                                        console.log('[Save] Edit values:', editValues)
                                        
                                        if (!adminTelegramId) {
                                          alert('❌ Error: Admin Telegram ID not found. Please refresh the page.')
                                          return
                                        }
                                        
                                        if (!editValues) {
                                          alert('❌ Error: No changes to save')
                                          return
                                        }
                                        
                                        try {
                                          console.log('[Save] Sending update request...')
                                          const response = await fetch('/api/admin/countries', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                              action: 'update',
                                              countryId: country._id,
                                              maxCapacity: editValues.capacity,
                                              prizeAmount: editValues.prize,
                                              telegramId: adminTelegramId
                                            })
                                          })
                                          
                                          const result = await response.json()
                                          console.log('[Save] Response:', response.status, result)
                                          
                                          if (response.ok) {
                                            setEditingCountry(null)
                                            setEditValues(undefined)
                                            alert(`✅ ${country.country_name} updated successfully!`)
                                            await fetchAllData()
                                          } else {
                                            console.error('[Save] Failed:', result)
                                            alert(`❌ Failed to update: ${result.error || 'Unknown error'}`)
                                          }
                                        } catch (err) {
                                          console.error('[Save] Error:', err)
                                          alert(`❌ Error updating country: ${err}`)
                                        }
                                      }}
                                      className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium text-xs"
                                    >
                                      💾 Save
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingCountry(null)
                                        setEditValues(undefined)
                                      }}
                                      className="px-3 py-1.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 font-medium text-xs"
                                    >
                                      ✕ Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingCountry(country._id)
                                        setEditValues({
                                          capacity: country.max_capacity,
                                          prize: country.prize_amount
                                        })
                                      }}
                                      className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-xs"
                                    >
                                      ✏️ Edit
                                    </button>
                                    <button
                                      onClick={async () => {
                                        console.log('[Reset] Country ID:', country._id)
                                        console.log('[Reset] Admin Telegram ID:', adminTelegramId)
                                        
                                        if (!adminTelegramId) {
                                          alert('❌ Error: Admin Telegram ID not found. Please refresh the page.')
                                          return
                                        }
                                        
                                        if (confirm(`Reset used capacity for ${country.country_name}?`)) {
                                          try {
                                            console.log('[Reset] Sending reset request...')
                                            const response = await fetch('/api/admin/countries', {
                                              method: 'POST',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({
                                                action: 'reset_capacity',
                                                countryId: country._id,
                                                telegramId: adminTelegramId
                                              })
                                            })
                                            
                                            const result = await response.json()
                                            console.log('[Reset] Response:', response.status, result)
                                            
                                            if (response.ok) {
                                              alert(`✅ ${country.country_name} capacity reset to 0!`)
                                              await fetchAllData()
                                            } else {
                                              console.error('[Reset] Failed:', result)
                                              alert(`❌ Failed to reset: ${result.error || 'Unknown error'}`)
                                            }
                                          } catch (err) {
                                            console.error('[Reset] Error:', err)
                                            alert(`❌ Error resetting capacity: ${err}`)
                                          }
                                        }
                                      }}
                                      className="px-3 py-1.5 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 font-medium text-xs"
                                      title="Reset used capacity to 0"
                                    >
                                      🔄 Reset
                                    </button>
                                    <button
                                      onClick={async () => {
                                        console.log('[Delete] Country ID:', country._id)
                                        console.log('[Delete] Admin Telegram ID:', adminTelegramId)
                                        
                                        if (!adminTelegramId) {
                                          alert('❌ Error: Admin Telegram ID not found. Please refresh the page.')
                                          return
                                        }
                                        
                                        if (confirm(`⚠️ DELETE ${country.country_name}?\n\nThis cannot be undone!`)) {
                                          try {
                                            console.log('[Delete] Sending delete request...')
                                            const response = await fetch('/api/admin/countries', {
                                              method: 'POST',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({
                                                action: 'delete',
                                                countryId: country._id,
                                                telegramId: adminTelegramId
                                              })
                                            })
                                            
                                            const result = await response.json()
                                            console.log('[Delete] Response:', response.status, result)
                                            
                                            if (response.ok) {
                                              alert(`✅ ${country.country_name} deleted successfully!`)
                                              await fetchAllData()
                                            } else {
                                              console.error('[Delete] Failed:', result)
                                              alert(`❌ Failed to delete: ${result.error || 'Unknown error'}`)
                                            }
                                          } catch (err) {
                                            console.error('[Delete] Error:', err)
                                            alert(`❌ Error deleting country: ${err}`)
                                          }
                                        }
                                      }}
                                      className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium text-xs"
                                    >
                                      🗑️ Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Country Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Total Countries</span>
                  <BarChart3 size={20} className="text-green-500" />
                </div>
                <p className="text-2xl font-bold text-gray-800">{countries.length}</p>
                <p className="text-xs text-gray-500 mt-1">Active: {countries.filter(c => c.is_active).length}</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Total Capacity</span>
                  <TrendingUp size={20} className="text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-gray-800">
                  {countries.reduce((sum, c) => sum + c.max_capacity, 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Across all countries</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Accounts Sold</span>
                  <Users size={20} className="text-purple-500" />
                </div>
                <p className="text-2xl font-bold text-gray-800">
                  {countries.reduce((sum, c) => sum + c.used_capacity, 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Total purchased</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Available Now</span>
                  <Check size={20} className="text-green-500" />
                </div>
                <p className="text-2xl font-bold text-gray-800">
                  {countries.reduce((sum, c) => sum + (c.max_capacity - c.used_capacity), 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Ready to purchase</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="p-4">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-800">System Settings</h2>
                <p className="text-sm text-gray-600 mt-1">Configure system-wide settings</p>
              </div>

              <div className="p-6 space-y-6">
                {/* Minimum Withdrawal Amount */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Minimum Withdrawal Amount (USDT)
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Users must have at least this amount in their balance to withdraw funds
                  </p>
                  <input
                    type="number"
                    value={minWithdrawalAmount}
                    onChange={(e) => setMinWithdrawalAmount(e.target.value)}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Enter minimum amount"
                  />
                </div>

                {/* Save Button */}
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                    className={`w-full font-semibold py-3 rounded-lg transition-all ${
                      settingsSaved 
                        ? 'bg-green-500 text-white' 
                        : 'bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white'
                    }`}
                  >
                    {savingSettings ? "Saving..." : settingsSaved ? "✓ Settings Saved!" : "Save Settings"}
                  </button>
                  
                  {/* Error Message */}
                  {settingsError && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600">
                        {settingsError}
                      </p>
                    </div>
                  )}
                </div>

                {/* Current Settings Display */}
                <div className={`border rounded-lg p-4 mt-4 transition-all ${
                  settingsSaved 
                    ? 'bg-green-50 border-green-300' 
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <h3 className={`text-sm font-semibold mb-2 ${
                    settingsSaved ? 'text-green-900' : 'text-blue-900'
                  }`}>
                    Current Settings
                  </h3>
                  <div className="space-y-1">
                    <p className={`text-sm ${
                      settingsSaved ? 'text-green-800' : 'text-blue-800'
                    }`}>
                      <span className="font-medium">Minimum Withdrawal:</span> {minWithdrawalAmount} USDT
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
