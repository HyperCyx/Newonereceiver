'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Lock, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Admin2FASettingsProps {
  telegramId: number
}

export function Admin2FASettings({ telegramId }: Admin2FASettingsProps) {
  const [masterPassword, setMasterPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [applyToAll, setApplyToAll] = useState(false)

  useEffect(() => {
    loadCurrentSettings()
  }, [])

  const loadCurrentSettings = async () => {
    try {
      const response = await fetch('/api/admin/2fa-settings', {
        headers: {
          'x-telegram-id': telegramId.toString()
        }
      })

      const data = await response.json()
      if (data.success) {
        setCurrentPassword(data.master_password || '')
        setLastUpdated(data.last_updated ? new Date(data.last_updated) : null)
      }
    } catch (error) {
      console.error('Failed to load 2FA settings:', error)
    }
  }

  const handleSavePassword = async () => {
    if (!masterPassword || masterPassword.length < 4) {
      toast.error('Password must be at least 4 characters long')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/2fa-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          masterPassword,
          telegramId
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Master 2FA password saved successfully')
        setCurrentPassword(masterPassword)
        setLastUpdated(new Date())
        setMasterPassword('')
      } else {
        toast.error(data.error || 'Failed to save password')
      }
    } catch (error: any) {
      toast.error('Failed to save password')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleApplyToAllAccounts = async () => {
    if (!currentPassword) {
      toast.error('Please set a master password first')
      return
    }

    const confirmed = confirm(
      `This will set the master 2FA password on ALL accounts. This operation may take several minutes. Continue?`
    )

    if (!confirmed) return

    setApplying(true)
    try {
      const response = await fetch('/api/admin/bulk-set-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          telegramId,
          applyToAll: true
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(
          `Applied to ${data.summary.success} accounts successfully. ` +
          `Failed: ${data.summary.failed}, Skipped: ${data.summary.skipped}`
        )
      } else {
        toast.error(data.error || 'Failed to apply password')
      }
    } catch (error: any) {
      toast.error('Failed to apply password to accounts')
      console.error(error)
    } finally {
      setApplying(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Master 2FA Password
        </CardTitle>
        <CardDescription>
          Set a master two-step verification password that will be applied to all Telegram accounts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Password Display */}
        {currentPassword && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium">Current Master Password: <code className="bg-gray-100 px-2 py-1 rounded">{currentPassword}</code></div>
              {lastUpdated && (
                <div className="text-sm text-gray-500 mt-1">
                  Last updated: {lastUpdated.toLocaleString()}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Set New Password */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="master-password">
              {currentPassword ? 'Change Master Password' : 'Set Master Password'}
            </Label>
            <Input
              id="master-password"
              type="text"
              placeholder="Enter master 2FA password (min 4 characters)"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              disabled={loading}
            />
            <p className="text-sm text-gray-500">
              This password will be used for all accounts. Make it secure but memorable.
            </p>
          </div>

          <Button 
            onClick={handleSavePassword}
            disabled={loading || !masterPassword}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                {currentPassword ? 'Update Master Password' : 'Save Master Password'}
              </>
            )}
          </Button>
        </div>

        {/* Apply to All Accounts */}
        {currentPassword && (
          <>
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Apply to All Accounts
              </h3>
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> This will set or change the 2FA password on ALL Telegram accounts in your database.
                  Accounts that fail validation will be rejected as frozen.
                </AlertDescription>
              </Alert>

              <Button 
                onClick={handleApplyToAllAccounts}
                disabled={applying}
                variant="destructive"
                className="w-full"
              >
                {applying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Applying to all accounts... This may take several minutes
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Apply Master Password to All Accounts
                  </>
                )}
              </Button>

              <p className="text-sm text-gray-500 mt-2">
                This will:
              </p>
              <ul className="text-sm text-gray-500 list-disc list-inside mt-1 space-y-1">
                <li>Set the master password on each account's Telegram 2FA</li>
                <li>Validate that the password was set correctly</li>
                <li>Accept accounts that pass validation</li>
                <li>Reject and freeze accounts that fail validation</li>
                <li>Skip accounts without valid sessions</li>
              </ul>
            </div>
          </>
        )}

        {/* Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">How it works</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• New accounts will automatically get this password when users log in</li>
            <li>• You can manually apply this password to all existing accounts</li>
            <li>• Accounts are validated immediately after setting the password</li>
            <li>• Failed validations result in account rejection (frozen status)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
