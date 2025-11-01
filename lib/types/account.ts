/**
 * Enhanced Account Type Definitions for Telegram Flow
 */

export type AccountStatus =
  | 'checking_capacity'
  | 'sending_otp'
  | 'verifying_otp'
  | 'verifying_2fa'
  | 'setting_password'
  | 'checking_sessions'
  | 'pending'
  | 'final_validation'
  | 'accepted'
  | 'rejected'

export interface Account {
  _id: string
  user_id: string
  phone_number: string
  country_code: string

  // Status tracking
  status: AccountStatus

  // OTP data
  otp_phone_code_hash?: string
  otp_session_string?: string
  otp_verified_at?: Date

  // 2FA data
  requires_2fa: boolean
  two_fa_verified_at?: Date

  // Password management
  had_existing_password: boolean
  master_password_set: boolean
  master_password_set_at?: Date

  // Session tracking
  initial_session_count: number
  current_session_count?: number
  multiple_devices_detected: boolean
  first_logout_attempted: boolean
  first_logout_successful?: boolean
  first_logout_count?: number
  last_session_check: Date

  // Pending queue
  pending_since?: Date
  country_wait_minutes: number
  ready_for_final_validation: boolean

  // Final validation
  final_validation_at?: Date
  final_session_count?: number
  final_logout_attempted: boolean
  final_logout_successful?: boolean
  final_logout_count?: number

  // Acceptance/Rejection
  accepted_at?: Date
  rejected_at?: Date
  rejection_reason?: string

  // Metadata
  telegram_user_id?: string
  session_string?: string
  created_at: Date
  updated_at: Date
}

export interface CountryCapacity {
  _id: string
  country_code: string
  country_name: string
  max_capacity: number
  used_capacity: number
  is_active: boolean
  wait_time_minutes: number
  created_at: Date
  updated_at: Date
}

export interface ValidationResult {
  success: boolean
  status: AccountStatus
  message?: string
  error?: string
  data?: any
}
