"use client"

import { ChevronLeft } from "lucide-react"

interface WithdrawalDetailsProps {
  withdrawalId: string
  onNavigate?: (view: "menu" | "dashboard" | "withdrawal" | "withdrawal-details", id?: string) => void
}

interface Account {
  id: string
  phone: string
  amount: string
  date: string
  status: string[]
}

export default function WithdrawalDetails({ withdrawalId, onNavigate }: WithdrawalDetailsProps) {
  const withdrawalData = {
    invoice: {
      amount: "10.00 USDT",
      confirmed: true,
      paid: true,
    },
    transaction: {
      amount: "31.11 TRX",
      usdtAmount: "10.00 USDT",
      status: "COMPLETED",
    },
    accounts: [
      {
        id: "1",
        phone: "+966 58 341 3467",
        amount: "1.00 USDT",
        date: "10/16 19:54",
        status: ["ACCEPTED", "FREE", "SUCCESS"],
      },
      {
        id: "2",
        phone: "+966 58 341 7240",
        amount: "1.00 USDT",
        date: "10/16 19:56",
        status: ["ACCEPTED", "FREE", "SUCCESS"],
      },
      {
        id: "3",
        phone: "+966 59 409 3042",
        amount: "1.00 USDT",
        date: "10/16 20:04",
        status: ["ACCEPTED", "FREE", "SUCCESS"],
      },
      {
        id: "4",
        phone: "+966 58 341 3836",
        amount: "1.00 USDT",
        date: "10/16 19:49",
        status: ["ACCEPTED", "FREE", "SUCCESS"],
      },
      {
        id: "5",
        phone: "+966 58 341 3467",
        amount: "1.00 USDT",
        date: "10/16 19:54",
        status: ["ACCEPTED", "FREE", "SUCCESS"],
      },
      {
        id: "6",
        phone: "+966 58 341 7240",
        amount: "1.00 USDT",
        date: "10/16 19:56",
        status: ["ACCEPTED", "FREE", "SUCCESS"],
      },
      {
        id: "7",
        phone: "+966 59 409 3042",
        amount: "1.00 USDT",
        date: "10/16 20:04",
        status: ["ACCEPTED", "FREE", "SUCCESS"],
      },
      {
        id: "8",
        phone: "+966 58 341 3836",
        amount: "1.00 USDT",
        date: "10/16 19:49",
        status: ["ACCEPTED", "FREE", "SUCCESS"],
      },
      {
        id: "9",
        phone: "+966 58 341 3467",
        amount: "1.00 USDT",
        date: "10/16 19:54",
        status: ["ACCEPTED", "FREE", "SUCCESS"],
      },
      {
        id: "10",
        phone: "+966 58 341 7240",
        amount: "1.00 USDT",
        date: "10/16 19:56",
        status: ["ACCEPTED", "FREE", "SUCCESS"],
      },
    ],
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate?.("withdrawal")}
            className="text-gray-700 hover:bg-gray-50 p-1 rounded transition-colors"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-[17px] font-medium text-gray-900">New one receiver</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Invoice Section */}
        <div className="border-b border-gray-100 px-4 py-3">
          <div className="flex items-start justify-between mb-2">
            <h2 className="text-[16px] font-medium text-blue-500">Invoice</h2>
            <button className="text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <p className="text-xl font-bold text-gray-900 mb-3">{withdrawalData.invoice.amount}</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-[13px] text-gray-500">The invoice is confirmed by admins.</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-[13px] text-gray-500">The invoice is paid successfully.</span>
            </div>
          </div>
        </div>

        {/* Transaction Section */}
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-[16px] font-medium text-blue-500 mb-2">1 Transaction</h2>
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-xl font-bold text-gray-900">{withdrawalData.transaction.amount}</p>
              <p className="text-[13px] text-gray-500 mt-0.5">{withdrawalData.transaction.usdtAmount}</p>
            </div>
            <button className="text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <span className="inline-block bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
            {withdrawalData.transaction.status}
          </span>
        </div>

        {/* Accounts Section */}
        <div className="px-4 py-3">
          <h2 className="text-[16px] font-medium text-blue-500 mb-3">{withdrawalData.accounts.length} Accounts</h2>
          <div className="space-y-3">
            {withdrawalData.accounts.map((account) => (
              <div key={account.id} className="border-b border-gray-100 pb-3 last:border-b-0">
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <p className="font-medium text-[15px] text-gray-900">{account.phone}</p>
                    <p className="text-[13px] text-gray-500 mt-0.5">{account.amount}</p>
                  </div>
                  <p className="text-[13px] text-gray-400">{account.date}</p>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {account.status.map((status, idx) => (
                    <span
                      key={idx}
                      className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    >
                      {status}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
