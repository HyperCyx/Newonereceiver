# Telegram Accounts Platform

## Overview

A Next.js-based Telegram Mini App for managing and selling WhatsApp/Telegram accounts with country-based capacity control. The platform operates exclusively within Telegram, featuring user account management, admin dashboard, withdrawal system, referral tracking, and automated payment processing. Built with Next.js 14+ (App Router), MongoDB for data persistence, and deployed on Vercel.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: Next.js 14+ with App Router and React Server Components
- **UI Library**: Radix UI primitives with shadcn/ui components for consistent, accessible interface
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **State Management**: React Context API for global state (referrals, language/i18n)
- **Client-Side Logic**: Telegram WebApp SDK integration for native app feel within Telegram

**Key Design Decisions**:
- **Telegram-Only Access**: App designed exclusively for Telegram Mini Apps environment, utilizing Telegram WebApp SDK for authentication and UI controls
- **Mobile-First**: Fixed viewport with overflow control to prevent scrolling issues in mobile Telegram app
- **Component-Based**: Modular UI components (MenuView, DashboardPage, WithdrawalHistory, AdminDashboard) for maintainability
- **Multi-Language Support**: i18n context for internationalization with RTL support

### Backend Architecture

**API Routes**: Next.js API routes in `/app/api/` directory
- RESTful endpoints for user management, transactions, withdrawals, admin operations
- Server-side validation and error handling
- Admin authorization checks via middleware patterns

**Authentication & Authorization**:
- Telegram-based authentication using WebApp initData
- Admin role checking via database flags (`is_admin` field)
- Cookie-based admin mode persistence for web access
- No traditional JWT/session - relies on Telegram's authentication

**Data Flow**:
1. User interacts with Telegram Mini App
2. Frontend sends Telegram user data to API routes
3. API validates Telegram data and checks database
4. MongoDB operations performed (CRUD)
5. Response sent back to frontend
6. UI updates via React state

### Data Storage

**Database**: MongoDB (cloud-hosted via MONGODB_URI)

**Collections Structure**:
- `users`: User profiles with Telegram IDs, referral codes, balances, admin flags
- `accounts`: Phone numbers submitted by users with status tracking
- `transactions`: Account sales and status changes
- `withdrawals`: Payment requests with confirmation workflow
- `payment_requests`: User withdrawal requests pending admin approval
- `referrals`: Referral relationship tracking
- `referral_codes`: System-wide referral codes with usage limits
- `country_capacity`: Country-based capacity management (max/used slots)
- `settings`: Global application settings (min withdrawal amounts, feature flags)

**Indexing Strategy**:
- Unique indexes on `telegram_id` fields for fast user lookups
- Compound indexes on status + date fields for transaction filtering
- Referral code indexes for quick validation

**Data Consistency**:
- Atomic updates for balance modifications
- Capacity checking before account submissions
- Transaction status tracking (pending → accepted/rejected)

### External Dependencies

**Telegram Integration**:
- **Telegram WebApp SDK**: Embedded via CDN script for client-side Telegram API access
- **Telegram Bot API**: Used for sending OTPs and 2FA verification (via TELEGRAM_BOT_TOKEN)
- Bot username configuration for referral link generation

**Deployment & Hosting**:
- **Replit**: Primary hosting platform (migrated from Vercel on October 30, 2025)
- Environment variables managed via Replit Secrets
- Development server runs on port 5000 (0.0.0.0:5000)
- Deployment configured with autoscale mode for stateless operation

**Analytics**:
- **Vercel Analytics**: Integrated for usage tracking and performance monitoring

**UI & Fonts**:
- **Google Fonts**: Geist and Geist Mono font families
- **Material Icons**: Icon library via CDN for consistent iconography
- **Lucide React**: Icon components for modern UI elements

**Development Tools**:
- TypeScript for type safety across frontend and backend
- ESLint for code quality
- TSX for running TypeScript scripts (database initialization, migrations)

**Third-Party Libraries**:
- `date-fns`: Date manipulation and formatting
- `embla-carousel-react`: Carousel/slider functionality
- `archiver`: File compression utilities
- `class-variance-authority` & `clsx`: CSS class management
- `cmdk`: Command palette interface
- `react-hook-form` with `@hookform/resolvers`: Form handling and validation
- `zod`: Runtime type validation (implied by resolver usage)

**MongoDB Client**:
- Custom MongoDB client wrapper in `/lib/mongodb/client.ts`
- Connection pooling and initialization scripts
- Collection helpers and ID generation utilities