"use client"

import { ChevronLeft } from "lucide-react"

interface WithdrawalHistoryProps {
  onNavigate?: (view: "menu" | "dashboard" | "withdrawal") => void
}

interface Withdrawal {
  id: string
  amount: string
  status: string
  date: string
}

export default function WithdrawalHistory({ onNavigate }: WithdrawalHistoryProps) {
  const withdrawals: Withdrawal[] = [
    { id: "1", amount: "3.85 USDT", status: "CONFIRMED PAID", date: "10/16" },
    { id: "2", amount: "4.60 USDT", status: "CONFIRMED PAID", date: "10/15" },
    { id: "3", amount: "4.38 USDT", status: "CONFIRMED PAID", date: "10/14" },
    { id: "4", amount: "8.00 USDT", status: "CONFIRMED PAID", date: "10/13" },
    { id: "5", amount: "6.75 USDT", status: "CONFIRMED PAID", date: "10/12" },
    { id: "6", amount: "5.00 USDT", status: "CONFIRMED PAID", date: "10/11" },
    { id: "7", amount: "10.00 USDT", status: "CONFIRMED PAID", date: "10/10" },
    { id: "8", amount: "38.70 USDT", status: "CONFIRMED PAID", date: "10/09" },
  ]

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => onNavigate?.("menu")}
            className="text-gray-800 hover:bg-gray-100 p-2 rounded transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-semibold text-gray-800">New one receiver</h1>
        </div>
      </div>

      {/* Withdrawal History List */}
      <div className="flex-1 overflow-y-auto">
        {withdrawals.map((withdrawal) => (
          <div
            key={withdrawal.id}
            onClick={() => onNavigate?.("withdrawal-details", withdrawal.id)}
            className="border-b border-gray-200 px-4 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-lg font-semibold text-gray-800">{withdrawal.amount}</p>
                <p className="text-sm text-gray-400">{withdrawal.date}</p>
              </div>
              <button className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="flex gap-2">
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                CONFIRMED
              </span>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">PAID</span>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Button */}
      <div className="border-t border-gray-200 p-4">
        <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 rounded-full transition-colors">
          Minimum payment limit is 3.49 USDT
        </button>
      </div>
    </div>
  )
}
