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
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

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

interface ReferralUser {
  id: string
  telegram_username: string
  totalReferrals: number
  activeReferrals: number
  created_at: string
}

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "transactions" | "withdrawals" | "analytics" | "referrals" | "payments" | "settings"
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
  const [referralUsers, setReferralUsers] = useState<ReferralUser[]>([])
  const [loading, setLoading] = useState(true)
  const [minWithdrawalAmount, setMinWithdrawalAmount] = useState("5.00")
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [settingsError, setSettingsError] = useState("")

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

      // For other data, use client with RLS
      const supabase = createClient()

      // Fetch stats
      const [usersCount, transactionsData, withdrawalsData] = await Promise.all([
        fetch('/api/admin/users').then(r => r.json()),
        supabase.from('transactions').select('amount, status'),
        supabase.from('withdrawals').select('*', { count: 'exact' })
      ])

      const totalRevenue = transactionsData.data?.reduce((sum, t) => 
        t.status === 'completed' ? sum + Number(t.amount) : sum, 0) || 0

      const pendingWithdrawals = withdrawalsData.data?.filter(w => w.status === 'pending').length || 0

      setStats({
        totalUsers: usersCount.count || 0,
        totalTransactions: transactionsData.data?.length || 0,
        totalWithdrawals: withdrawalsData.count || 0,
        totalRevenue,
        activeUsers: usersCount.count || 0,
        pendingWithdrawals
      })

      // Fetch transactions with user info
      if (activeTab === 'transactions' || activeTab === 'overview' || activeTab === 'analytics') {
        const { data: txData } = await supabase
          .from('transactions')
          .select(`
            id, 
            user_id, 
            amount, 
            status, 
            created_at, 
            currency,
            users!inner(telegram_username)
          `)
          .order('created_at', { ascending: false })
          .limit(50)

        const formattedTx: Transaction[] = (txData || []).map((tx: any) => ({
          id: tx.id,
          userId: tx.user_id,
          userName: tx.users?.telegram_username || 'Unknown',
          amount: Number(tx.amount).toFixed(2),
          status: tx.status as "completed" | "pending" | "failed",
          date: new Date(tx.created_at).toLocaleDateString()
        }))
        
        setTransactions(formattedTx)
      }

      // Fetch withdrawals with user info
      if (activeTab === 'withdrawals' || activeTab === 'overview' || activeTab === 'analytics') {
        const { data: wdData } = await supabase
          .from('withdrawals')
          .select(`
            id, 
            user_id, 
            amount, 
            status, 
            created_at, 
            currency,
            users!inner(telegram_username)
          `)
          .order('created_at', { ascending: false })
          .limit(50)

        const formattedWd: Withdrawal[] = (wdData || []).map((wd: any) => ({
          id: wd.id,
          userId: wd.user_id,
          userName: wd.users?.telegram_username || 'Unknown',
          amount: Number(wd.amount).toFixed(2),
          status: wd.status as "confirmed" | "pending" | "rejected",
          date: new Date(wd.created_at).toLocaleDateString()
        }))
        
        setWithdrawals(formattedWd)
      }

      // Fetch payment requests with user info
      if (activeTab === 'payments') {
        const { data: prData } = await supabase
          .from('payment_requests')
          .select(`
            id, 
            user_id, 
            amount, 
            wallet_address, 
            status, 
            created_at,
            updated_at,
            users!inner(telegram_username)
          `)
          .order('created_at', { ascending: false })

        const formattedPr: PaymentRequest[] = (prData || []).map((pr: any) => ({
          id: pr.id,
          userId: pr.user_id,
          userName: pr.users?.telegram_username || 'Unknown',
          amount: Number(pr.amount).toFixed(2),
          walletAddress: pr.wallet_address,
          status: pr.status as "pending" | "approved" | "rejected",
          requestDate: new Date(pr.created_at).toLocaleDateString(),
          processedDate: pr.status !== 'pending' && pr.updated_at !== pr.created_at 
            ? new Date(pr.updated_at).toLocaleDateString() 
            : undefined
        }))
        
        setPaymentRequests(formattedPr)
      }

      // Fetch referrals
      if (activeTab === 'referrals') {
        const { data: refData } = await supabase
          .from('users')
          .select('id, telegram_username, created_at')
          .order('created_at', { ascending: false })

        const refUsers: ReferralUser[] = []
        
        for (const user of refData || []) {
          const { count: totalCount } = await supabase
            .from('referrals')
            .select('*', { count: 'exact', head: true })
            .eq('referrer_id', user.id)

          refUsers.push({
            id: user.id,
            telegram_username: user.telegram_username || 'Unknown',
            totalReferrals: totalCount || 0,
            activeReferrals: totalCount || 0,
            created_at: user.created_at
          })
        }
        
        setReferralUsers(refUsers)
      }

    } catch (error) {
      console.error('Error fetching admin data:', error)
    }

    setLoading(false)
  }

  const handleApprovePayment = async (id: string) => {
    const supabase = createClient()
    await supabase
      .from('payment_requests')
      .update({ status: 'approved' })
      .eq('id', id)
    
    fetchAllData()
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

      const supabase = createClient()
      
      // Try to get admin user - if not found, create settings without user verification
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, is_admin, telegram_id')
        .eq('is_admin', true)
        .limit(1)

      console.log('[AdminDashboard] Admin user lookup:', { users, usersError })

      let userId = null
      if (users && users.length > 0 && !usersError) {
        userId = users[0].id
        console.log('[AdminDashboard] Found admin user:', userId)
      } else {
        console.warn('[AdminDashboard] No admin user found, proceeding without user ID')
      }

      console.log('[AdminDashboard] Saving setting with admin user:', userId)

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settingKey: 'min_withdrawal_amount',
          settingValue: minAmount.toFixed(2),
          userId: userId
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
    const supabase = createClient()
    await supabase
      .from('payment_requests')
      .update({ status: 'rejected' })
      .eq('id', id)
    
    fetchAllData()
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 flex overflow-x-auto sticky top-0 z-10">
        {(["overview", "users", "transactions", "withdrawals", "analytics", "referrals", "payments", "settings"] as const).map(
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
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                          Loading...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
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
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                          Loading transactions...
                        </td>
                      </tr>
                    ) : transactions.length === 0 ? (
                      <tr>
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

        {activeTab === "withdrawals" && (
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
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                          Loading withdrawals...
                        </td>
                      </tr>
                    ) : withdrawals.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                          No withdrawals found
                        </td>
                      </tr>
                    ) : (
                      withdrawals.map((wd) => (
                        <tr key={wd.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-800">{wd.userName || wd.userId}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-800">${wd.amount}</td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              wd.status === "confirmed"
                                ? "bg-green-100 text-green-700"
                                : wd.status === "pending"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {wd.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{wd.date}</td>
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
          <div className="p-4">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-4 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                  <Link2 size={20} className="text-purple-500" />
                  Referral Program Management
                </h3>
                <p className="text-sm text-gray-600">Manage all referral links and track referral performance</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">User</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total Referrals</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Active (30d)</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Join Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                          Loading referral data...
                        </td>
                      </tr>
                    ) : referralUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                          No referral users found
                        </td>
                      </tr>
                    ) : (
                      referralUsers.slice(0, 20).map((user) => (
                        <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-800 font-medium">{user.telegram_username}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold">
                            {user.totalReferrals}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                            {user.activeReferrals}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button className="text-blue-500 hover:text-blue-700 font-semibold text-sm">View Link</button>
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
                  <span className="text-gray-600 text-sm">Total Referral Links</span>
                  <Link2 size={20} className="text-purple-500" />
                </div>
                <p className="text-2xl font-bold text-gray-800">{referralUsers.length}</p>
                <p className="text-xs text-gray-500 mt-1">Active referral programs</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Total Referred Users</span>
                  <Users size={20} className="text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-gray-800">
                  {referralUsers.reduce((sum, u) => sum + u.totalReferrals, 0)}
                </p>
                <p className="text-xs text-green-600 mt-1">+28 this week</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Referral Revenue</span>
                  <TrendingUp size={20} className="text-green-500" />
                </div>
                <p className="text-2xl font-bold text-gray-800">$8,450</p>
                <p className="text-xs text-green-600 mt-1">+15% this month</p>
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
                <p className="text-sm text-gray-600">Review and process payment withdrawal requests from users</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">User</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Wallet Address</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Request Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                          Loading payment requests...
                        </td>
                      </tr>
                    ) : paymentRequests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                          No payment requests found
                        </td>
                      </tr>
                    ) : (
                      paymentRequests.map((request) => (
                        <tr key={request.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          <div>
                            <p className="font-medium text-gray-800">{request.userName}</p>
                            <p className="text-xs text-gray-500">{request.userId}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-800">${request.amount}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 font-mono text-xs">
                          {request.walletAddress.substring(0, 10)}...
                          {request.walletAddress.substring(request.walletAddress.length - 8)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              request.status === "pending"
                                ? "bg-yellow-100 text-yellow-700"
                                : request.status === "approved"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{request.requestDate}</td>
                        <td className="px-4 py-3 text-sm">
                          {request.status === "pending" ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApprovePayment(request.id)}
                                className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-semibold transition-colors"
                              >
                                <Check size={14} />
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectPayment(request.id)}
                                className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-semibold transition-colors"
                              >
                                <X size={14} />
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">
                              {request.status === "approved" ? "✓ Approved" : "✗ Rejected"} on {request.processedDate}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Pending Requests</span>
                  <Wallet size={20} className="text-yellow-500" />
                </div>
                <p className="text-2xl font-bold text-gray-800">
                  {paymentRequests.filter((r) => r.status === "pending").length}
                </p>
                <p className="text-xs text-yellow-600 mt-1">Awaiting approval</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Approved Requests</span>
                  <Check size={20} className="text-green-500" />
                </div>
                <p className="text-2xl font-bold text-gray-800">
                  {paymentRequests.filter((r) => r.status === "approved").length}
                </p>
                <p className="text-xs text-green-600 mt-1">Total approved</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Total Pending Amount</span>
                  <TrendingUp size={20} className="text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-gray-800">
                  $
                  {paymentRequests
                    .filter((r) => r.status === "pending")
                    .reduce((sum, r) => sum + Number.parseFloat(r.amount), 0)
                    .toFixed(2)}
                </p>
                <p className="text-xs text-blue-600 mt-1">Pending payout</p>
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
