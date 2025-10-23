"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface Transaction {
  id: string
  phone: string
  amount: string
  currency: string
  status: string[]
  date: string
  percentage?: string
}

const emptyTransactions = {
  accepted: [] as Transaction[],
  rejected: [] as Transaction[],
  pending: [] as Transaction[],
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

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true)
      try {
        const supabase = createClient()
        
        // Map tab to status
        const statusMap = {
          accepted: 'completed',
          rejected: 'failed',
          pending: 'pending'
        }
        
        const { data: txData } = await supabase
          .from('transactions')
          .select('id, amount, currency, status, created_at')
          .eq('status', statusMap[tab])
          .order('created_at', { ascending: false })
        
        if (txData) {
          const formattedTransactions: Transaction[] = txData.map(tx => ({
            id: tx.id,
            phone: '', // Phone number would come from related account
            amount: Number(tx.amount).toFixed(2),
            currency: tx.currency || 'USDT',
            status: tx.status === 'completed' ? ['ACCEPTED', 'SUCCESS'] : 
                   tx.status === 'failed' ? ['REJECTED', 'FAILED'] : ['PENDING'],
            date: new Date(tx.created_at).toLocaleDateString('en-US', { 
              month: '2-digit', 
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })
          }))
          setTransactions(formattedTransactions)
        }
      } catch (error) {
        console.error('Error fetching transactions:', error)
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
            <div key={transaction.id} className="border-b border-gray-100 px-4 py-3 hover:bg-gray-50 active:bg-gray-100">
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
    </div>
  )
}
