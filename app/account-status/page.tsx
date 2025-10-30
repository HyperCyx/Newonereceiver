'use client'

import { useState, useEffect } from 'react'
import { AccountStatusDetails } from '@/components/account-status-details'
import { useSearchParams } from 'next/navigation'

export default function AccountStatusPage() {
  const searchParams = useSearchParams()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [telegramId, setTelegramId] = useState<number | null>(null)

  useEffect(() => {
    // Try to get from URL params
    const phone = searchParams.get('phone')
    const tgId = searchParams.get('telegramId')
    
    if (phone) setPhoneNumber(phone)
    if (tgId) setTelegramId(parseInt(tgId))

    // Try to get from Telegram WebApp if available
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp
      tg.ready()
      
      const user = tg.initDataUnsafe?.user
      if (user?.id && !tgId) {
        setTelegramId(user.id)
      }
    }
  }, [searchParams])

  if (!phoneNumber || !telegramId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Account Status</h1>
          <p className="text-gray-500 mb-4">
            Please provide phone number and Telegram ID via URL parameters:
          </p>
          <code className="text-sm bg-gray-100 p-2 rounded">
            ?phone=+1234567890&telegramId=123456789
          </code>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <AccountStatusDetails 
        phoneNumber={phoneNumber}
        telegramId={telegramId}
      />
    </div>
  )
}
