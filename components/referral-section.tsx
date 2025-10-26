"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export default function ReferralSection() {
  const [referralLink, setReferralLink] = useState("")
  const [copied, setCopied] = useState(false)
  const [stats, setStats] = useState({ totalReferrals: 0, activeReferrals: 0 })
  const [loading, setLoading] = useState(true)
  const [hasReferralCode, setHasReferralCode] = useState(false)

  useEffect(() => {
    const fetchReferralData = async () => {
      try {
        const supabase = createClient()
        const tg = (window as any).Telegram?.WebApp
        const user = tg?.initDataUnsafe?.user
        
        if (!user) {
          setLoading(false)
          return
        }
        
        // Get user's referral code from database
        const { data: dbUser, error } = await supabase
          .from('users')
          .select('id, referral_code')
          .eq('telegram_id', user.id)
          .single()
        
        if (error) {
          console.error('[ReferralSection] Error fetching user:', error)
          setLoading(false)
          return
        }
        
        if (dbUser?.referral_code) {
          setHasReferralCode(true)
          // Use bot link for referrals
          const botUsername = '@WhatsAppNumberRedBot'
          const link = `https://t.me/${botUsername.replace('@', '')}?start=${dbUser.referral_code}`
          setReferralLink(link)
          
          // Get referral stats
          const { count: totalCount } = await supabase
            .from('referrals')
            .select('*', { count: 'exact', head: true })
            .eq('referrer_id', dbUser.id)
          
          setStats({
            totalReferrals: totalCount || 0,
            activeReferrals: totalCount || 0
          })
        } else {
          setHasReferralCode(false)
        }
      } catch (error) {
        console.error('[ReferralSection] Error:', error)
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
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-center py-8">
          <div className="animate-pulse text-gray-400">Loading referral data...</div>
        </div>
      </div>
    )
  }
  
  if (!hasReferralCode) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Referral Link Not Available</h3>
          <p className="text-gray-600 mb-4 text-sm">
            Referral links are created and managed by administrators only.
          </p>
          <p className="text-gray-500 text-xs">
            Contact an admin to get your referral link activated.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 px-6 py-6">
        <h2 className="text-xl font-bold text-white mb-1">Referral Program</h2>
        <p className="text-purple-100 text-sm">Share your link and earn rewards</p>
      </div>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
            <p className="text-gray-700 text-xs font-medium mb-1">Total Referrals</p>
            <p className="text-3xl font-bold text-blue-600">{stats.totalReferrals}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
            <p className="text-gray-700 text-xs font-medium mb-1">Active Referrals</p>
            <p className="text-3xl font-bold text-green-600">{stats.activeReferrals}</p>
          </div>
        </div>

        {/* Referral Link */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Your Referral Link</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 text-sm text-gray-700 font-mono"
            />
            <button
              onClick={copyToClipboard}
              className={`px-6 py-3 rounded-xl transition-all text-sm font-semibold ${
                copied 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600'
              }`}
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-xs text-purple-800 leading-relaxed">
            💡 <strong>How it works:</strong> Share this link with friends. When they join using your link, 
            they'll be added to your referral list and you'll earn rewards!
          </p>
        </div>
      </div>
    </div>
  )
}
