"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

interface Transaction {
  id: string
  phone: string
  amount: string
  currency: string
  status: string[]
  date: string
  fullDate: string
  percentage?: string
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
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true)
      try {
        // Map tab to status for accounts table
        const statusMap = {
          accepted: 'accepted',
          rejected: 'rejected',
          pending: 'pending'
        }
        
        const response = await fetch('/api/accounts/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: statusMap[tab] })
        })
        
        if (response.ok) {
          const data = await response.json()
          
          if (data.success && data.accounts) {
            const formattedTransactions: Transaction[] = data.accounts.map((acc: any) => ({
              id: acc._id,
              phone: acc.phone_number || '',
              amount: Number(acc.amount).toFixed(2),
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
              })
            }))
            setTransactions(formattedTransactions)
          }
        }
      } catch (error) {
        console.error('Error fetching accounts:', error)
        setTransactions([])
      }
      setLoading(false)
    }
    
    fetchTransactions()
  }, [tab])

  const filteredTransactions = transactions.filter((t) => 
    t.phone.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
        <div className="flex-1 overflow-y-auto pb-20">
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

      <div className="fixed bottom-0 left-0 right-0 px-4 py-3 border-t border-gray-100 bg-white z-10">
        <button
          onClick={onLoginClick}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white text-[15px] font-medium py-3 rounded-full transition-colors"
        >
          Login
        </button>
      </div>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedTransaction(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-md w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedTransaction(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>

            <h2 className="text-xl font-bold text-gray-900 mb-6">Transaction Details</h2>

            <div className="space-y-4">
              {/* Transaction ID */}
              <div>
                <p className="text-sm text-gray-500 mb-1">Transaction ID</p>
                <p className="text-base font-mono text-gray-900 break-all">{selectedTransaction.id}</p>
              </div>

              {/* Amount */}
              <div>
                <p className="text-sm text-gray-500 mb-1">Amount</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${selectedTransaction.amount} <span className="text-base font-normal text-gray-600">{selectedTransaction.currency}</span>
                </p>
              </div>

              {/* Date & Time */}
              <div>
                <p className="text-sm text-gray-500 mb-1">Date & Time</p>
                <p className="text-base text-gray-900">{selectedTransaction.fullDate}</p>
              </div>

              {/* Status */}
              <div>
                <p className="text-sm text-gray-500 mb-2">Status</p>
                <div className="flex gap-2 flex-wrap">
                  {selectedTransaction.status.map((status, idx) => (
                    <span key={idx} className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(status)}`}>
                      {status}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedTransaction(null)}
              className="w-full mt-6 bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-full transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
