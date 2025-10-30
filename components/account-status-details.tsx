'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

interface AccountDetails {
  phone_number: string
  balance: number
  acceptance_status: 'accepted' | 'rejected' | 'pending'
  acceptance_message: string
  limit_status: 'free' | 'frozen' | 'unlimited'
  limit_message: string
  validation_status: 'validated' | 'failed' | 'pending'
  validation_message: string
  created_at?: Date
  validated_at?: Date
  approved_at?: Date
}

interface AccountStatusDetailsProps {
  phoneNumber: string
  telegramId: number
  countryFlag?: string
  onClose?: () => void
}

export function AccountStatusDetails({ 
  phoneNumber, 
  telegramId,
  countryFlag = '🇵🇦', // Default to Panama flag
  onClose 
}: AccountStatusDetailsProps) {
  const [account, setAccount] = useState<AccountDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAccountDetails()
  }, [phoneNumber, telegramId])

  const fetchAccountDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/accounts/details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, telegramId })
      })

      const data = await response.json()

      if (data.success) {
        setAccount(data.account)
      } else {
        setError(data.error || 'Failed to load account details')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load account details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !account) {
    return (
      <div className="p-4 text-center text-red-500">
        {error || 'Account not found'}
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 p-4">
      {/* Account Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl text-blue-600">Account</CardTitle>
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-3xl">{countryFlag}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-semibold">{account.phone_number}</h2>
              <p className="text-xl text-gray-400">{account.balance.toFixed(2)} USDT</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acceptance Status */}
      <Card className="border-l-4 border-l-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl text-blue-600">Acceptance Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3">
            {account.acceptance_status === 'accepted' ? (
              <CheckCircle2 className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
            ) : account.acceptance_status === 'rejected' ? (
              <XCircle className="h-6 w-6 text-red-500 mt-1 flex-shrink-0" />
            ) : (
              <Loader2 className="h-6 w-6 text-yellow-500 mt-1 flex-shrink-0" />
            )}
            <div>
              <h3 className="text-lg font-semibold capitalize flex items-center gap-2">
                {account.acceptance_status}
              </h3>
              <p className="text-gray-500 mt-1">{account.acceptance_message}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Limit Status */}
      <Card className="border-l-4 border-l-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl text-blue-600">Limit Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3">
            {account.limit_status === 'free' || account.limit_status === 'unlimited' ? (
              <CheckCircle2 className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
            ) : (
              <XCircle className="h-6 w-6 text-red-500 mt-1 flex-shrink-0" />
            )}
            <div>
              <h3 className="text-lg font-semibold capitalize">
                {account.limit_status}
              </h3>
              <p className="text-gray-500 mt-1">{account.limit_message}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Status */}
      <Card className="border-l-4 border-l-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl text-blue-600">Validation Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3">
            {account.validation_status === 'validated' ? (
              <CheckCircle2 className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
            ) : account.validation_status === 'failed' ? (
              <XCircle className="h-6 w-6 text-red-500 mt-1 flex-shrink-0" />
            ) : (
              <Loader2 className="h-6 w-6 text-yellow-500 mt-1 flex-shrink-0" />
            )}
            <div>
              <h3 className="text-lg font-semibold capitalize">
                {account.validation_status}
              </h3>
              <p className="text-gray-500 mt-1">{account.validation_message}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
