import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { ReferralProvider } from "@/lib/referral-context"
import { Toaster } from "@/components/ui/toaster"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Crypto Transaction Manager",
  description: "Telegram Mini App for managing crypto transactions",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
      </head>
      <body className={`font-sans antialiased bg-white min-h-screen`} suppressHydrationWarning>
        <ReferralProvider>
          <div className="bg-white min-h-screen">
            {children}
          </div>
          <Analytics />
          <Toaster />
        </ReferralProvider>
      </body>
    </html>
  )
}
