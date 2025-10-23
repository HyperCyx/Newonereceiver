"use client"

import { useState } from "react"
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
  amount: string
  status: "completed" | "pending" | "failed"
  date: string
}

interface Withdrawal {
  id: string
  userId: string
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

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "transactions" | "withdrawals" | "analytics" | "referrals" | "payments"
  >("overview")

  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([
    {
      id: "p1",
      userId: "user_001",
      userName: "Hyper Red",
      amount: "500.00",
      walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f3bEb",
      status: "pending",
      requestDate: "2024-10-23",
    },
    {
      id: "p2",
      userId: "user_002",
      userName: "User Two",
      amount: "250.50",
      walletAddress: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
      status: "pending",
      requestDate: "2024-10-23",
    },
    {
      id: "p3",
      userId: "user_003",
      userName: "User Three",
      amount: "1000.00",
      walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f3bEb",
      status: "pending",
      requestDate: "2024-10-22",
    },
    {
      id: "p4",
      userId: "user_004",
      userName: "User Four",
      amount: "750.75",
      walletAddress: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
      status: "approved",
      requestDate: "2024-10-21",
      processedDate: "2024-10-22",
    },
    {
      id: "p5",
      userId: "user_005",
      userName: "User Five",
      amount: "300.00",
      walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f3bEb",
      status: "rejected",
      requestDate: "2024-10-20",
      processedDate: "2024-10-21",
    },
  ])

  const handleApprovePayment = (id: string) => {
    setPaymentRequests(
      paymentRequests.map((req) =>
        req.id === id ? { ...req, status: "approved", processedDate: new Date().toISOString().split("T")[0] } : req,
      ),
    )
  }

  const handleRejectPayment = (id: string) => {
    setPaymentRequests(
      paymentRequests.map((req) =>
        req.id === id ? { ...req, status: "rejected", processedDate: new Date().toISOString().split("T")[0] } : req,
      ),
    )
  }

  // Mock data
  const stats: DashboardStats = {
    totalUsers: 1250,
    totalTransactions: 5840,
    totalWithdrawals: 342,
    totalRevenue: 45230.5,
    activeUsers: 487,
    pendingWithdrawals: 23,
  }

  const recentTransactions: Transaction[] = [
    { id: "1", userId: "user_001", amount: "10.00", status: "completed", date: "2024-10-23" },
    { id: "2", userId: "user_002", amount: "25.50", status: "completed", date: "2024-10-23" },
    { id: "3", userId: "user_003", amount: "15.75", status: "pending", date: "2024-10-23" },
    { id: "4", userId: "user_004", amount: "8.25", status: "completed", date: "2024-10-22" },
    { id: "5", userId: "user_005", amount: "32.00", status: "failed", date: "2024-10-22" },
  ]

  const recentWithdrawals: Withdrawal[] = [
    { id: "w1", userId: "user_001", amount: "100.00", status: "confirmed", date: "2024-10-23" },
    { id: "w2", userId: "user_002", amount: "250.00", status: "confirmed", date: "2024-10-23" },
    { id: "w3", userId: "user_003", amount: "75.50", status: "pending", date: "2024-10-22" },
    { id: "w4", userId: "user_004", amount: "150.00", status: "confirmed", date: "2024-10-22" },
  ]

  const users = [
    { id: "user_001", name: "Hyper Red", phone: "+966 58 341 3467", status: "active", joinDate: "2024-01-15" },
    { id: "user_002", name: "User Two", phone: "+966 58 341 7240", status: "active", joinDate: "2024-02-20" },
    { id: "user_003", name: "User Three", phone: "+966 59 409 3042", status: "inactive", joinDate: "2024-03-10" },
    { id: "user_004", name: "User Four", phone: "+966 58 341 3836", status: "active", joinDate: "2024-04-05" },
    { id: "user_005", name: "User Five", phone: "+998 98 368 19 86", status: "active", joinDate: "2024-05-12" },
  ]

  const dailyRevenue = [
    { day: "Mon", revenue: 3200 },
    { day: "Tue", revenue: 4100 },
    { day: "Wed", revenue: 3800 },
    { day: "Thu", revenue: 5200 },
    { day: "Fri", revenue: 6100 },
    { day: "Sat", revenue: 5800 },
    { day: "Sun", revenue: 4900 },
  ]

  const transactionStats = [
    { status: "Completed", count: 4850, percentage: 83 },
    { status: "Pending", count: 680, percentage: 12 },
    { status: "Failed", count: 310, percentage: 5 },
  ]

  const withdrawalStats = [
    { status: "Confirmed", count: 298, percentage: 87 },
    { status: "Pending", count: 32, percentage: 9 },
    { status: "Rejected", count: 12, percentage: 4 },
  ]

  const topUsers = [
    { name: "Hyper Red", transactions: 145, revenue: 3250.5 },
    { name: "User Two", transactions: 128, revenue: 2890.75 },
    { name: "User Three", transactions: 112, revenue: 2450.25 },
    { name: "User Four", transactions: 98, revenue: 2100.0 },
    { name: "User Five", transactions: 87, revenue: 1875.5 },
  ]

  const referralUsers = [
    { id: "admin_001", name: "Admin User", totalReferrals: 45, activeReferrals: 32, joinDate: "2024-01-01" },
    { id: "user_001", name: "Hyper Red", totalReferrals: 12, activeReferrals: 8, joinDate: "2024-01-15" },
    { id: "user_002", name: "User Two", totalReferrals: 8, activeReferrals: 5, joinDate: "2024-02-20" },
    { id: "user_003", name: "User Three", totalReferrals: 15, activeReferrals: 10, joinDate: "2024-03-10" },
    { id: "user_004", name: "User Four", totalReferrals: 6, activeReferrals: 4, joinDate: "2024-04-05" },
  ]

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => onNavigate("menu")} className="text-gray-600">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">Admin Dashboard</h1>
        <button className="text-gray-600">
          <Menu size={24} />
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 flex overflow-x-auto sticky top-12 z-10">
        {(["overview", "users", "transactions", "withdrawals", "analytics", "referrals", "payments"] as const).map(
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
                {recentTransactions.slice(0, 3).map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{tx.userId}</p>
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
                ))}
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
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Phone</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Join Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-800">{user.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{user.phone}</td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              user.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{user.joinDate}</td>
                      </tr>
                    ))}
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
                    {recentTransactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-800">{tx.userId}</td>
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
                    ))}
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
                    {recentWithdrawals.map((wd) => (
                      <tr key={wd.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-800">{wd.userId}</td>
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
                    ))}
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
              <div className="flex items-end justify-between h-40 gap-2">
                {dailyRevenue.map((item, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-blue-100 rounded-t relative group">
                      <div
                        className="bg-blue-500 rounded-t transition-all hover:bg-blue-600 cursor-pointer"
                        style={{ height: `${(item.revenue / 6500) * 100}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          ${item.revenue}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">{item.day}</p>
                  </div>
                ))}
              </div>
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
                {topUsers.map((user, idx) => (
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
                ))}
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
                    {referralUsers.map((user) => (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-800 font-medium">{user.name}</td>
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
                        <td className="px-4 py-3 text-sm text-gray-600">{user.joinDate}</td>
                        <td className="px-4 py-3 text-sm">
                          <button className="text-blue-500 hover:text-blue-700 font-semibold text-sm">View Link</button>
                        </td>
                      </tr>
                    ))}
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
                <p className="text-2xl font-bold text-gray-800">86</p>
                <p className="text-xs text-gray-500 mt-1">Active referral programs</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Total Referred Users</span>
                  <Users size={20} className="text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-gray-800">342</p>
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
                    {paymentRequests.map((request) => (
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
                    ))}
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
      </div>
    </div>
  )
}
