#!/usr/bin/env tsx

/**
 * Check if a phone number is from Uzbekistan
 * Uzbekistan country code: +998
 */

function checkIfUzbekistanNumber(phoneNumber: string): boolean {
  // Remove all non-digit characters except +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '')
  
  // Check if starts with +998
  if (cleaned.startsWith('+998')) {
    return true
  }
  
  // Check if starts with 998 (without +)
  if (cleaned.startsWith('998')) {
    return true
  }
  
  // Check if starts with 00998 (international format)
  if (cleaned.startsWith('00998')) {
    return true
  }
  
  return false
}

function formatPhoneNumber(phoneNumber: string): string {
  const cleaned = phoneNumber.replace(/[^\d+]/g, '')
  
  if (cleaned.startsWith('+998')) {
    return cleaned
  } else if (cleaned.startsWith('998')) {
    return '+' + cleaned
  } else if (cleaned.startsWith('00998')) {
    return '+' + cleaned.substring(2)
  }
  
  return phoneNumber
}

// Get phone number from command line arguments
const phoneNumber = process.argv[2]

if (!phoneNumber) {
  console.log('Usage: tsx scripts/check-uzbekistan-number.ts <phone_number>')
  console.log('Examples:')
  console.log('  tsx scripts/check-uzbekistan-number.ts +998901234567')
  console.log('  tsx scripts/check-uzbekistan-number.ts 998901234567')
  console.log('  tsx scripts/check-uzbekistan-number.ts 00998901234567')
  process.exit(1)
}

const isUzbekistan = checkIfUzbekistanNumber(phoneNumber)
const formatted = formatPhoneNumber(phoneNumber)

console.log('\n' + '='.repeat(50))
console.log('UZBEKISTAN PHONE NUMBER CHECKER')
console.log('='.repeat(50))
console.log('')
console.log(`Input Number: ${phoneNumber}`)
console.log(`Formatted:    ${formatted}`)
console.log(`Country:      ${isUzbekistan ? '✅ Uzbekistan (+998)' : '❌ NOT Uzbekistan'}`)
console.log('')
console.log('='.repeat(50))

if (isUzbekistan) {
  console.log('')
  console.log('✅ This is an Uzbekistan phone number!')
  console.log(`   Country Code: +998`)
  console.log(`   Formatted: ${formatted}`)
} else {
  console.log('')
  console.log('❌ This is NOT an Uzbekistan phone number.')
  console.log('   Uzbekistan numbers start with +998')
}

process.exit(isUzbekistan ? 0 : 1)
