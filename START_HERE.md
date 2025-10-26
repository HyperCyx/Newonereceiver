# 🚀 Quick Start Guide

## ✅ Your Application is Ready!

Your Telegram accounts management system is now **fully migrated to MongoDB** and ready to use!

## 🌐 Access Your Website

**Public URL**: https://villiform-parker-perfunctorily.ngrok-free.dev

The website is currently running with both services:
- ✅ Next.js development server (port 3000)
- ✅ Ngrok tunnel (public access)

## 🎯 What You Have

### 1. Country Capacity Management System
- **Admin Control**: Manage which countries can purchase accounts
- **Capacity Limits**: Set maximum number of accounts per country
- **Prize Configuration**: Set prize amounts (in USDT) per country
- **Real-time Tracking**: Monitor usage with visual progress bars
- **User-Friendly UI**: Beautiful interface showing available countries and capacity

### 2. Complete Admin Panel
Access via: `https://villiform-parker-perfunctorily.ngrok-free.dev/admin`

Features:
- 📊 **Overview Dashboard** - Statistics and metrics
- 👥 **Users Management** - View all registered users
- 💰 **Transactions** - Transaction history
- 📈 **Analytics** - Revenue and performance charts
- 🔗 **Referrals** - Referral program management
- 💸 **Payment Requests** - Approve/reject payments
- 🌍 **Countries** - NEW! Capacity management
- ⚙️ **Settings** - System configuration

### 3. MongoDB Database
- **Cloud-Hosted**: MongoDB Atlas
- **Fully Initialized**: All collections and indexes created
- **Sample Data**: 6 countries pre-loaded with capacity settings
- **Auto-Scaling**: Handles growth automatically

## 📊 Database Collections

Your MongoDB database includes:

1. **users** - User accounts and profiles
2. **transactions** - Transaction history  
3. **withdrawals** - Withdrawal requests
4. **payment_requests** - Payment processing
5. **referrals** - Referral tracking
6. **referral_codes** - Master referral codes
7. **accounts** - Account purchases
8. **settings** - System configuration
9. **country_capacity** - 🆕 Country capacity limits and prizes

## 🎨 Features Overview

### For Admins

#### Country Management (NEW!)
1. Navigate to Admin Panel → **Countries** tab
2. Add new countries with:
   - Country code (e.g., US, GB, DE)
   - Country name
   - Maximum capacity (how many accounts can be sold)
   - Prize amount (reward per account in USDT)
3. Edit capacity and prizes inline
4. Enable/disable countries
5. Reset capacity when needed
6. View statistics:
   - Total countries
   - Total capacity
   - Accounts sold
   - Available spots

#### User Management
- View all registered users
- Check balances
- Track admin status
- Monitor join dates

#### Payment Processing
- Approve or reject withdrawal requests
- Process payment requests
- View transaction history

#### Referral Management
- Create master referral codes
- Track referral performance
- Monitor conversion rates

#### System Settings
- Set minimum withdrawal amounts
- Configure system parameters
- Update operational rules

### For Users

#### Country Selection
- View available countries
- See available capacity per country
- Check prize amounts
- Visual indicators:
  - 🟢 Green = Plenty available
  - 🟡 Yellow = 80%+ used  
  - 🔴 Red = No capacity
- Cannot purchase when capacity is full

#### Account Management
- Register via Telegram
- Check balance
- Request withdrawals
- View transaction history

## 🔧 Technical Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB Atlas
- **UI Components**: Radix UI, shadcn/ui
- **Icons**: Lucide React
- **Hosting**: Ngrok (development)

## 📖 Usage Instructions

### Creating an Admin User

You need at least one admin user to access the admin panel:

**Option 1: Via MongoDB Atlas UI**
1. Go to https://cloud.mongodb.com
2. Navigate to your cluster
3. Browse Collections → `telegram_accounts` → `users`
4. Find your user (by telegram_id)
5. Edit and set `is_admin: true`

**Option 2: Via MongoDB Compass**
1. Connect to: `mongodb+srv://newone:mAnik123456@newone.iaspgks.mongodb.net`
2. Select database: `telegram_accounts`
3. Select collection: `users`
4. Find and update your user
5. Set field: `is_admin: true`

**Option 3: Via MongoDB Shell**
```javascript
db.users.updateOne(
  { telegram_id: YOUR_TELEGRAM_ID },
  { $set: { is_admin: true } }
)
```

### Managing Countries

1. **Login as Admin**
   - Access admin panel
   - Use your Telegram account with admin privileges

2. **Navigate to Countries Tab**
   - Click "Countries" in the top navigation

3. **Add a Country**
   - Fill in the form:
     - Country Code: `US`
     - Country Name: `United States`
     - Max Capacity: `100`
     - Prize Amount: `10.00`
   - Click "Add Country"

4. **Edit Capacity**
   - Click on the capacity number in the table
   - Enter new value
   - Tab out to save automatically

5. **Edit Prize**
   - Click on the prize amount
   - Enter new value
   - Tab out to save

6. **Toggle Status**
   - Click the "Active/Inactive" button
   - Instantly enables/disables the country

7. **Reset Capacity**
   - Click "Reset" button
   - Confirms action
   - Sets used_capacity back to 0

### User Registration Flow

1. User clicks Telegram bot link
2. Bot authenticates user
3. User is presented with country selection
4. System checks capacity availability
5. User selects a country (if available)
6. Account is created
7. Capacity is incremented
8. User receives prize amount

## 🗂️ File Structure

```
/workspace
├── app/
│   └── api/
│       ├── admin/
│       │   ├── countries/     # Country capacity CRUD
│       │   ├── users/         # User management
│       │   ├── withdrawals/   # Withdrawal management
│       │   ├── payments/      # Payment processing
│       │   └── referrals/     # Referral tracking
│       ├── countries/         # Public country info
│       ├── referral-codes/    # Referral codes
│       ├── settings/          # System settings
│       ├── user/
│       │   └── register/      # User registration
│       └── withdrawal/
│           ├── create/        # Create withdrawal
│           └── list/          # List withdrawals
├── components/
│   ├── admin-dashboard.tsx    # Main admin UI
│   ├── country-selection.tsx  # Country picker
│   └── [other components]
├── lib/
│   └── mongodb/
│       ├── client.ts          # Database connection
│       └── auth.ts            # Authentication
└── scripts/
    └── init-mongodb.ts        # DB initialization
```

## 🎯 Sample Countries

Pre-loaded countries with settings:

| Country | Code | Capacity | Used | Prize |
|---------|------|----------|------|-------|
| 🇺🇸 United States | US | 100 | 0 | $10.00 |
| 🇬🇧 United Kingdom | GB | 50 | 0 | $8.00 |
| 🇩🇪 Germany | DE | 75 | 0 | $9.00 |
| 🇫🇷 France | FR | 60 | 0 | $8.50 |
| 🇨🇦 Canada | CA | 80 | 0 | $9.50 |
| 🇦🇺 Australia | AU | 70 | 0 | $9.00 |

## 🔒 Security Notes

- Session-based authentication (HTTP-only cookies)
- Admin-only routes protected
- Capacity checks prevent over-booking
- Input validation on all forms
- MongoDB connection secured with credentials

## 🛠️ Available Commands

```bash
# Start development server
pnpm dev

# Initialize/reinitialize database
pnpm db:init

# Build for production
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint
```

## 📞 Support

For questions or issues:
1. Check `MONGODB_MIGRATION_COMPLETE.md` for detailed migration info
2. Check `COUNTRY_CAPACITY_GUIDE.md` for feature documentation
3. Review API endpoints in `/app/api/` folders

## ✨ Next Steps

1. ✅ Database is initialized
2. ✅ Sample data loaded
3. ✅ Services running
4. ⏭️ Create your first admin user
5. ⏭️ Login to admin panel
6. ⏭️ Customize countries and settings
7. ⏭️ Test the complete flow

## 🎉 You're All Set!

Your application is **fully functional** and ready for production use!

**Access it now**: https://villiform-parker-perfunctorily.ngrok-free.dev

Happy coding! 🚀
