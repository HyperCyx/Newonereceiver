# Country Capacity Management Guide

## Overview

The Country Capacity Management system allows admins to control which countries can purchase accounts, set capacity limits, and configure prize amounts for each country.

## Features

### Admin Features

1. **Country Management**
   - Add new countries with country codes and names
   - Set maximum capacity (how many accounts can be purchased)
   - Configure prize amounts (in USDT) for each country
   - Enable/disable countries
   - Reset used capacity
   - Delete countries

2. **Real-time Tracking**
   - View used capacity vs. max capacity
   - Visual progress bars showing capacity usage
   - Statistics dashboard showing:
     - Total countries
     - Total capacity across all countries
     - Total accounts sold
     - Available capacity

3. **Inline Editing**
   - Edit max capacity directly in the table
   - Edit prize amounts on the fly
   - Toggle country active status with one click

### User Features

1. **Country Selection**
   - View all available countries with capacity info
   - See prize amounts for each country
   - Visual indicators for capacity availability
   - Cannot select countries with no capacity
   - Real-time capacity updates

2. **Capacity Notifications**
   - Users are notified when a country has no capacity
   - Clear messages showing available accounts per country

## Setup

### 1. Run Database Migration

Run the migration to create the necessary tables:

```bash
# Using tsx
npx tsx scripts/run-migration-008.ts

# Or manually run the SQL file in Supabase SQL Editor
# Copy contents of scripts/008_create_country_capacity_table.sql
```

### 2. Access Admin Panel

1. Navigate to your admin panel
2. Click on the "Countries" tab
3. You'll see the country management interface

### 3. Add Countries

**Via Admin UI:**
1. Go to Countries tab
2. Fill in the form:
   - Country Code (e.g., US, GB, DE)
   - Country Name (e.g., United States, United Kingdom)
   - Max Capacity (e.g., 100)
   - Prize Amount (e.g., 10.00)
3. Click "Add Country"

**Via Database:**
Sample countries are automatically created during migration, including:
- United States (US) - 100 capacity, $10.00 prize
- United Kingdom (GB) - 50 capacity, $8.00 prize
- Germany (DE) - 75 capacity, $9.00 prize
- France (FR) - 60 capacity, $8.50 prize
- Canada (CA) - 80 capacity, $9.50 prize
- Australia (AU) - 70 capacity, $9.00 prize

## API Endpoints

### Admin Endpoints

**GET /api/admin/countries**
- Lists all countries with capacity info
- Requires admin authentication

**POST /api/admin/countries**
- Actions: `create`, `update`, `delete`, `reset_capacity`
- Requires admin authentication

Example:
```typescript
// Create country
await fetch('/api/admin/countries', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'create',
    countryCode: 'US',
    countryName: 'United States',
    maxCapacity: 100,
    prizeAmount: 10.00
  })
})

// Update country
await fetch('/api/admin/countries', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'update',
    countryId: '...',
    maxCapacity: 150,
    prizeAmount: 12.00
  })
})

// Reset capacity
await fetch('/api/admin/countries', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'reset_capacity',
    countryId: '...'
  })
})
```

### Public Endpoints

**GET /api/countries**
- Lists all active countries with capacity info
- Public access (no auth required)
- Shows available capacity for each country

**POST /api/countries**
- Actions: `check`, `reserve`
- Check: Verify if a country has capacity
- Reserve: Reserve capacity when creating an account

Example:
```typescript
// Check capacity
const response = await fetch('/api/countries', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'check',
    countryCode: 'US'
  })
})

// Reserve capacity (requires authentication)
const response = await fetch('/api/countries', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'reserve',
    countryCode: 'US'
  })
})
```

## Usage in Registration

### Frontend Integration

Use the `CountrySelection` component to show available countries:

```tsx
import CountrySelection from '@/components/country-selection'

function RegistrationPage() {
  const [selectedCountry, setSelectedCountry] = useState(null)

  return (
    <CountrySelection 
      onCountrySelect={(country) => setSelectedCountry(country)}
      showPrizes={true}
    />
  )
}
```

### Backend Integration

When creating an account, check and reserve capacity:

```typescript
// 1. Check if country has capacity
const checkResponse = await fetch('/api/countries', {
  method: 'POST',
  body: JSON.stringify({
    action: 'check',
    countryCode: selectedCountry.country_code
  })
})

const checkResult = await checkResponse.json()

if (!checkResult.hasCapacity) {
  // Show error: No capacity available
  return
}

// 2. Reserve capacity
const reserveResponse = await fetch('/api/countries', {
  method: 'POST',
  body: JSON.stringify({
    action: 'reserve',
    countryCode: selectedCountry.country_code
  })
})

// 3. Create account
// ... proceed with account creation
```

## Database Schema

### country_capacity table

```sql
CREATE TABLE country_capacity (
  id UUID PRIMARY KEY,
  country_code TEXT UNIQUE NOT NULL,
  country_name TEXT NOT NULL,
  max_capacity INTEGER DEFAULT 0,
  used_capacity INTEGER DEFAULT 0,
  prize_amount DECIMAL(18, 8) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Updated accounts table

```sql
ALTER TABLE accounts ADD COLUMN country_code TEXT;
```

## Best Practices

1. **Set Realistic Capacities**
   - Start with conservative capacity limits
   - Monitor usage patterns
   - Adjust as needed

2. **Monitor Capacity**
   - Regularly check capacity usage in admin panel
   - Reset capacity when needed (e.g., monthly)
   - Keep track of which countries are popular

3. **Prize Management**
   - Set competitive prize amounts
   - Consider country-specific economics
   - Update prizes based on performance

4. **Capacity Alerts**
   - Watch for countries approaching full capacity
   - Plan capacity increases in advance
   - Communicate with users about capacity

## Troubleshooting

### "No capacity available" message

- Check if country is active (is_active = true)
- Verify max_capacity > used_capacity
- Try resetting capacity if it's a test environment

### Countries not showing up

- Ensure migration ran successfully
- Check if countries are marked as active
- Verify RLS policies are correctly set

### Capacity not updating

- Check if used_capacity is being incremented correctly
- Verify the reserve API is being called
- Review account creation flow

## Future Enhancements

Possible future improvements:
- Automatic capacity refresh schedules
- Country-specific registration requirements
- Bulk capacity management
- Capacity reservation system
- Historical capacity tracking
- Email notifications for low capacity
- Dynamic prize adjustments based on demand
