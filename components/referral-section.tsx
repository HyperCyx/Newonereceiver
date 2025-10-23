"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export default function ReferralSection() {
  const [referralLink, setReferralLink] = useState("")
  const [copied, setCopied] = useState(false)
  const [stats, setStats] = useState({ totalReferrals: 0, activeReferrals: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReferralData = async () => {
      try {
        const supabase = createClient()
        const tg = (window as any).Telegram?.WebApp
        const user = tg?.initDataUnsafe?.user
        
        if (!user) return
        
        // Get user's referral code from database
        const { data: dbUser } = await supabase
          .from('users')
          .select('id, referral_code')
          .eq('telegram_id', user.id)
          .single()
        
        if (dbUser?.referral_code) {
          // Use bot link for referrals
          const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'your_bot'
          const link = `https://t.me/${botUsername}?start=${dbUser.referral_code}`
          setReferralLink(link)
          
          // Get referral stats
          const { count: totalCount } = await supabase
            .from('referrals')
            .select('*', { count: 'exact', head: true })
            .eq('referrer_id', dbUser.id)
          
          setStats({
            totalReferrals: totalCount || 0,
            activeReferrals: totalCount || 0 // You can add date filtering for active referrals
          })
        }
      } catch (error) {
        console.error('Error fetching referral data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchReferralData()
  }, [])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <p className="text-center text-gray-400">Loading referral data...</p>
      </div>
    )
  }
  
  if (!referralLink) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <p className="text-center text-gray-400">Unable to load referral link</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Referral Program</h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-gray-600 text-sm mb-1">Total Referrals</p>
          <p className="text-2xl font-bold text-blue-600">{stats.totalReferrals}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-gray-600 text-sm mb-1">Active (30 days)</p>
          <p className="text-2xl font-bold text-green-600">{stats.activeReferrals}</p>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Your Referral Link</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-600"
          />
          <button
            onClick={copyToClipboard}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-semibold"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Share this link with others. When they join using your link, they'll be added to your referral list.
      </p>
    </div>
  )
}
