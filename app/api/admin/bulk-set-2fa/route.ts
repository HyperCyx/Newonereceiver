import { NextRequest, NextResponse } from 'next/server'
import { Collections, getCollection } from '@/lib/mongodb/client'
import { checkAdminByTelegramId } from '@/lib/mongodb/auth'
import { set2FAPassword, validate2FAPassword } from '@/lib/telegram/auth'
import * as fs from 'fs'
import * as path from 'path'

const SESSIONS_DIR = path.join(process.cwd(), 'telegram_sessions')

/**
 * POST /api/admin/bulk-set-2fa
 * Apply master 2FA password to all accounts (or selected accounts)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegramId, accountIds, applyToAll = false } = body

    if (!telegramId) {
      return NextResponse.json({ error: 'Telegram ID required' }, { status: 400 })
    }

    const isAdmin = await checkAdminByTelegramId(telegramId)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access only' }, { status: 403 })
    }

    // Get master password
    const settings = await getCollection(Collections.SETTINGS)
    const masterPasswordSetting = await settings.findOne({ setting_key: 'master_2fa_password' })

    if (!masterPasswordSetting?.setting_value) {
      return NextResponse.json({ 
        error: 'Master 2FA password not set. Please set it in admin settings first.' 
      }, { status: 400 })
    }

    const masterPassword = masterPasswordSetting.setting_value

    const accounts = await getCollection(Collections.ACCOUNTS)
    
    // Build query
    let query: any = {}
    if (applyToAll) {
      // Apply to all accounts
      query = {}
    } else if (accountIds && accountIds.length > 0) {
      // Apply to specific accounts
      query = { _id: { $in: accountIds } }
    } else {
      return NextResponse.json({ 
        error: 'Please specify accounts or set applyToAll to true' 
      }, { status: 400 })
    }

    const accountsToProcess = await accounts.find(query).toArray()

    console.log(`[BulkSet2FA] Processing ${accountsToProcess.length} accounts`)

    let successCount = 0
    let failedCount = 0
    let skippedCount = 0
    const results: any[] = []

    for (const account of accountsToProcess) {
      try {
        console.log(`[BulkSet2FA] Processing ${account.phone_number}...`)

        // Load session string from file
        const files = fs.readdirSync(SESSIONS_DIR)
        const sessionFile = files.find((f) => 
          f.startsWith(account.phone_number.replace('+', '')) && 
          !f.includes('pending2fa')
        )

        if (!sessionFile) {
          console.log(`[BulkSet2FA] ⚠️ No session file for ${account.phone_number}, skipping`)
          skippedCount++
          results.push({
            phone: account.phone_number,
            status: 'skipped',
            reason: 'No session file found'
          })
          continue
        }

        const filePath = path.join(SESSIONS_DIR, sessionFile)
        const sessionData = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

        // Set 2FA password
        const setResult = await set2FAPassword(
          account.phone_number,
          sessionData.sessionString,
          masterPassword,
          account.twofa_password // Current password if exists
        )

        if (!setResult.success) {
          console.log(`[BulkSet2FA] ❌ Failed to set 2FA on ${account.phone_number}: ${setResult.error}`)
          failedCount++
          
          // Update account as failed
          await accounts.updateOne(
            { _id: account._id },
            { 
              $set: { 
                validation_status: 'failed',
                acceptance_status: 'rejected',
                rejection_reason: `Failed to set 2FA: ${setResult.error}`,
                limit_status: 'frozen',
                has_2fa: false,
                updated_at: new Date()
              } 
            }
          )

          results.push({
            phone: account.phone_number,
            status: 'failed',
            reason: setResult.error
          })
          continue
        }

        console.log(`[BulkSet2FA] ✅ 2FA set on ${account.phone_number}`)

        // Wait a bit before validation
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Validate the password
        const validateResult = await validate2FAPassword(
          account.phone_number,
          sessionData.sessionString,
          masterPassword
        )

        if (validateResult.success && validateResult.passwordValid) {
          // Success - Accept account
          await accounts.updateOne(
            { _id: account._id },
            { 
              $set: { 
                validation_status: 'validated',
                acceptance_status: 'accepted',
                limit_status: 'free',
                has_2fa: true,
                twofa_password: masterPassword,
                twofa_set_at: new Date(),
                validated_at: new Date(),
                updated_at: new Date()
              } 
            }
          )

          console.log(`[BulkSet2FA] ✅ ${account.phone_number} validated and accepted`)
          successCount++
          results.push({
            phone: account.phone_number,
            status: 'success',
            message: 'Set and validated successfully'
          })
        } else {
          // Validation failed - Reject
          await accounts.updateOne(
            { _id: account._id },
            { 
              $set: { 
                validation_status: 'failed',
                acceptance_status: 'rejected',
                rejection_reason: 'The 2FA password cannot be verified',
                limit_status: 'frozen',
                has_2fa: true,
                twofa_password: masterPassword,
                twofa_set_at: new Date(),
                updated_at: new Date()
              } 
            }
          )

          console.log(`[BulkSet2FA] ❌ ${account.phone_number} validation failed`)
          failedCount++
          results.push({
            phone: account.phone_number,
            status: 'failed',
            reason: 'Validation failed'
          })
        }

        // Small delay between accounts to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error: any) {
        console.error(`[BulkSet2FA] Error processing ${account.phone_number}:`, error)
        failedCount++
        results.push({
          phone: account.phone_number,
          status: 'error',
          reason: error.message
        })
      }
    }

    console.log(`[BulkSet2FA] Summary: Success=${successCount}, Failed=${failedCount}, Skipped=${skippedCount}`)

    return NextResponse.json({
      success: true,
      message: `Processed ${accountsToProcess.length} accounts`,
      summary: {
        total: accountsToProcess.length,
        success: successCount,
        failed: failedCount,
        skipped: skippedCount
      },
      results
    })
  } catch (error: any) {
    console.error('[BulkSet2FA] Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}
