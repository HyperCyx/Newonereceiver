import { NextRequest, NextResponse } from 'next/server'
import { checkAdminByTelegramId } from '@/lib/mongodb/auth'
import { getDb } from '@/lib/mongodb/connection'

// Map of phone code prefixes to detect country
const COUNTRY_CODE_MAP: { [key: string]: string } = {
  '1': 'US/CA',
  '44': 'GB',
  '49': 'DE',
  '33': 'FR',
  '91': 'IN',
  '92': 'PK',
  '880': 'BD',
  '61': 'AU',
  '81': 'JP',
  '86': 'CN',
  '82': 'KR',
  '7': 'RU/KZ',
  '20': 'EG',
  '27': 'ZA',
  '30': 'GR',
  '31': 'NL',
  '32': 'BE',
  '34': 'ES',
  '36': 'HU',
  '39': 'IT',
  '40': 'RO',
  '41': 'CH',
  '43': 'AT',
  '45': 'DK',
  '46': 'SE',
  '47': 'NO',
  '48': 'PL',
  '51': 'PE',
  '52': 'MX',
  '53': 'CU',
  '54': 'AR',
  '55': 'BR',
  '56': 'CL',
  '57': 'CO',
  '58': 'VE',
  '60': 'MY',
  '62': 'ID',
  '63': 'PH',
  '64': 'NZ',
  '65': 'SG',
  '66': 'TH',
  '84': 'VN',
  '90': 'TR',
  '91': 'IN',
  '92': 'PK',
  '93': 'AF',
  '94': 'LK',
  '95': 'MM',
  '98': 'IR',
  '211': 'SS',
  '212': 'MA',
  '213': 'DZ',
  '216': 'TN',
  '218': 'LY',
  '220': 'GM',
  '221': 'SN',
  '222': 'MR',
  '223': 'ML',
  '224': 'GN',
  '225': 'CI',
  '226': 'BF',
  '227': 'NE',
  '228': 'TG',
  '229': 'BJ',
  '230': 'MU',
  '231': 'LR',
  '232': 'SL',
  '233': 'GH',
  '234': 'NG',
  '235': 'TD',
  '236': 'CF',
  '237': 'CM',
  '238': 'CV',
  '239': 'ST',
  '240': 'GQ',
  '241': 'GA',
  '242': 'CG',
  '243': 'CD',
  '244': 'AO',
  '245': 'GW',
  '246': 'IO',
  '248': 'SC',
  '249': 'SD',
  '250': 'RW',
  '251': 'ET',
  '252': 'SO',
  '253': 'DJ',
  '254': 'KE',
  '255': 'TZ',
  '256': 'UG',
  '257': 'BI',
  '258': 'MZ',
  '260': 'ZM',
  '261': 'MG',
  '262': 'RE',
  '263': 'ZW',
  '264': 'NA',
  '265': 'MW',
  '266': 'LS',
  '267': 'BW',
  '268': 'SZ',
  '269': 'KM',
  '290': 'SH',
  '291': 'ER',
  '297': 'AW',
  '298': 'FO',
  '299': 'GL',
  '350': 'GI',
  '351': 'PT',
  '352': 'LU',
  '353': 'IE',
  '354': 'IS',
  '355': 'AL',
  '356': 'MT',
  '357': 'CY',
  '358': 'FI',
  '359': 'BG',
  '370': 'LT',
  '371': 'LV',
  '372': 'EE',
  '373': 'MD',
  '374': 'AM',
  '375': 'BY',
  '376': 'AD',
  '377': 'MC',
  '378': 'SM',
  '380': 'UA',
  '381': 'RS',
  '382': 'ME',
  '383': 'XK',
  '385': 'HR',
  '386': 'SI',
  '387': 'BA',
  '389': 'MK',
  '420': 'CZ',
  '421': 'SK',
  '423': 'LI',
  '500': 'FK',
  '501': 'BZ',
  '502': 'GT',
  '503': 'SV',
  '504': 'HN',
  '505': 'NI',
  '506': 'CR',
  '507': 'PA',
  '508': 'PM',
  '509': 'HT',
  '590': 'GP',
  '591': 'BO',
  '592': 'GY',
  '593': 'EC',
  '594': 'GF',
  '595': 'PY',
  '596': 'MQ',
  '597': 'SR',
  '598': 'UY',
  '599': 'CW',
  '670': 'TL',
  '672': 'NF',
  '673': 'BN',
  '674': 'NR',
  '675': 'PG',
  '676': 'TO',
  '677': 'SB',
  '678': 'VU',
  '679': 'FJ',
  '680': 'PW',
  '681': 'WF',
  '682': 'CK',
  '683': 'NU',
  '685': 'WS',
  '686': 'KI',
  '687': 'NC',
  '688': 'TV',
  '689': 'PF',
  '690': 'TK',
  '691': 'FM',
  '692': 'MH',
  '850': 'KP',
  '852': 'HK',
  '853': 'MO',
  '855': 'KH',
  '856': 'LA',
  '870': 'PN',
  '878': 'UN',
  '880': 'BD',
  '886': 'TW',
  '960': 'MV',
  '961': 'LB',
  '962': 'JO',
  '963': 'SY',
  '964': 'IQ',
  '965': 'KW',
  '966': 'SA',
  '967': 'YE',
  '968': 'OM',
  '970': 'PS',
  '971': 'AE',
  '972': 'IL',
  '973': 'BH',
  '974': 'QA',
  '975': 'BT',
  '976': 'MN',
  '977': 'NP',
  '992': 'TJ',
  '993': 'TM',
  '994': 'AZ',
  '995': 'GE',
  '996': 'KG',
  '998': 'UZ',
}

function detectPhoneCode(phoneNumber: string): string | null {
  if (!phoneNumber.startsWith('+')) return null
  
  const digits = phoneNumber.substring(1)
  
  // Try matching from longest to shortest
  for (let len = 4; len >= 1; len--) {
    const prefix = digits.substring(0, len)
    if (COUNTRY_CODE_MAP[prefix]) {
      return '+' + prefix
    }
  }
  
  return null
}

/**
 * GET /api/admin/country-stats
 * Get statistics of accounts purchased per country
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const telegramId = searchParams.get('telegramId')

    if (!telegramId) {
      return NextResponse.json(
        { success: false, error: 'Telegram ID required' },
        { status: 400 }
      )
    }

    // Check admin
    const isAdmin = await checkAdminByTelegramId(telegramId)
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const db = await getDb()
    
    // Get all users with phone numbers
    const users = await db.collection('users').find({
      phone_number: { $exists: true, $ne: null }
    }).toArray()

    console.log('[CountryStats] Found', users.length, 'users with phone numbers')

    // Count by country
    const countryStats: { [phoneCode: string]: { count: number; countryName: string; users: any[] } } = {}

    for (const user of users) {
      const phoneNumber = user.phone_number
      if (!phoneNumber) continue

      const phoneCode = detectPhoneCode(phoneNumber)
      if (!phoneCode) {
        console.log('[CountryStats] Could not detect phone code for:', phoneNumber)
        continue
      }

      if (!countryStats[phoneCode]) {
        // Try to get country name from country_capacity collection
        const country = await db.collection('country_capacity').findOne({
          country_code: phoneCode
        })

        countryStats[phoneCode] = {
          count: 0,
          countryName: country?.country_name || COUNTRY_CODE_MAP[phoneCode.substring(1)] || 'Unknown',
          users: []
        }
      }

      countryStats[phoneCode].count++
      countryStats[phoneCode].users.push({
        telegramId: user.telegram_id,
        username: user.telegram_username,
        firstName: user.first_name,
        lastName: user.last_name,
        phoneNumber: user.phone_number,
        createdAt: user.created_at
      })
    }

    // Convert to array and sort by count
    const statsArray = Object.entries(countryStats).map(([phoneCode, data]) => ({
      phoneCode,
      countryName: data.countryName,
      count: data.count,
      users: data.users
    })).sort((a, b) => b.count - a.count)

    console.log('[CountryStats] Stats:', statsArray.map(s => `${s.phoneCode}: ${s.count}`).join(', '))

    return NextResponse.json({
      success: true,
      stats: statsArray,
      total: users.length
    })
  } catch (error: any) {
    console.error('[CountryStats] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
