"use client"

interface Transaction {
  id: string
  phone: string
  amount: string
  currency: string
  status: string[]
  date: string
  percentage?: string
}

const mockTransactions = {
  accepted: [
    {
      id: "1",
      phone: "+966 58 341 3467",
      amount: "1.00",
      currency: "USDT",
      status: ["ACCEPTED", "FREE", "SUCCESS"],
      date: "10/16 19:54",
    },
    {
      id: "2",
      phone: "+966 58 341 7240",
      amount: "1.00",
      currency: "USDT",
      status: ["ACCEPTED", "FREE", "SUCCESS"],
      date: "10/16 19:56",
    },
    {
      id: "3",
      phone: "+966 59 409 3042",
      amount: "1.00",
      currency: "USDT",
      status: ["ACCEPTED", "FREE", "SUCCESS"],
      date: "10/16 20:04",
    },
    {
      id: "4",
      phone: "+966 58 341 3836",
      amount: "1.00",
      currency: "USDT",
      status: ["ACCEPTED", "FREE", "SUCCESS"],
      date: "10/16 19:49",
    },
  ],
  rejected: [
    {
      id: "5",
      phone: "+966 59 672 6484",
      amount: "1.00",
      currency: "USDT",
      status: ["REJECTED", "LIMITED", "LOGIN FAILED"],
      date: "10/16 19:57",
      percentage: "-100%",
    },
    {
      id: "6",
      phone: "+998 98 368 19 86",
      amount: "0.00",
      currency: "USDT",
      status: ["REJECTED", "LIMITED", "LOGIN FAILED"],
      date: "08/15 15:13",
      percentage: "-100%",
    },
    {
      id: "7",
      phone: "+507 6173-6364",
      amount: "0.90",
      currency: "USDT",
      status: ["REJECTED", "FREE", "2FA FAILED"],
      date: "08/10 23:04",
    },
    {
      id: "8",
      phone: "+507 6174-9844",
      amount: "0.90",
      currency: "USDT",
      status: ["REJECTED", "FREE", "2FA FAILED"],
      date: "08/10 23:03",
    },
  ],
  pending: [],
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
  const transactions = mockTransactions[tab].filter((t) => t.phone.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="flex-1 flex flex-col">
      {transactions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400">No transactions found</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="border-b border-gray-200 px-4 py-4 hover:bg-gray-50">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{transaction.phone}</p>
                  <p className="text-sm text-gray-400">
                    {transaction.amount} {transaction.currency}
                    {transaction.percentage && <span className="text-red-500 ml-2">{transaction.percentage}</span>}
                  </p>
                </div>
                <div className="text-right">
                  <button className="text-gray-400 text-lg">↗</button>
                  <p className="text-sm text-gray-400">{transaction.date}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {transaction.status.map((status, idx) => (
                  <span key={idx} className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(status)}`}>
                    {status}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-4 py-4 border-t border-gray-200 bg-white">
        <button
          onClick={onLoginClick}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-full transition-colors"
        >
          Login
        </button>
      </div>
    </div>
  )
}
