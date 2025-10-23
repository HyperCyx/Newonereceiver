"use client"

import { useState, useEffect } from "react"
import MenuView from "@/components/menu-view"
import DashboardPage from "@/components/dashboard-page"
import WithdrawalHistory from "@/components/withdrawal-history"
import WithdrawalDetails from "@/components/withdrawal-details"
import LoginPage from "@/components/login-page"
import AdminLogin from "@/components/admin-login"
import AdminDashboard from "@/components/admin-dashboard"

export default function Home() {
  const [currentView, setCurrentView] = useState<
    "menu" | "dashboard" | "withdrawal" | "withdrawal-details" | "login" | "admin-login" | "admin-dashboard"
  >("menu")
  const [selectedWithdrawalId, setSelectedWithdrawalId] = useState<string>("")
  const [isAdminMode, setIsAdminMode] = useState(false)

  // Check for admin URL parameter and cookie on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const isAdminParam = urlParams.get('admin')
      const adminCookie = document.cookie.split('; ').find(row => row.startsWith('admin_mode='))
      const adminLoggedIn = localStorage.getItem('admin_logged_in')
      
      if (isAdminParam === 'true' || adminCookie) {
        setIsAdminMode(true)
        // If already logged in, go directly to dashboard
        if (adminLoggedIn === 'true') {
          setCurrentView('admin-dashboard')
        } else {
          setCurrentView('admin-login')
        }
        // Set cookie that expires in 30 days
        document.cookie = 'admin_mode=true; max-age=' + (30 * 24 * 60 * 60) + '; path=/'
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const tg = (window as any).Telegram?.WebApp
      if (tg) {
        // Show back button when not on menu page
        if (currentView !== "menu") {
          tg.BackButton.show()
          tg.BackButton.onClick(() => {
            handleNavigate("menu")
          })
        } else {
          tg.BackButton.hide()
        }

        // Cleanup function
        return () => {
          tg.BackButton.offClick(() => {
            handleNavigate("menu")
          })
        }
      }
    }
  }, [currentView])

  const handleNavigate = (
    view: "menu" | "dashboard" | "withdrawal" | "withdrawal-details" | "login" | "admin-login" | "admin-dashboard",
    id?: string,
  ) => {
    if (id) {
      setSelectedWithdrawalId(id)
    }
    // Set localStorage when navigating to admin dashboard
    if (view === "admin-dashboard" && typeof window !== 'undefined') {
      localStorage.setItem('admin_logged_in', 'true')
    }
    setCurrentView(view)
  }

  return currentView === "menu" ? (
    <MenuView onNavigate={(view) => handleNavigate(view)} />
  ) : currentView === "dashboard" ? (
    <DashboardPage onNavigate={(view) => handleNavigate(view)} />
  ) : currentView === "withdrawal" ? (
    <WithdrawalHistory onNavigate={handleNavigate} />
  ) : currentView === "withdrawal-details" ? (
    <WithdrawalDetails withdrawalId={selectedWithdrawalId} onNavigate={handleNavigate} />
  ) : currentView === "login" ? (
    <LoginPage onLogin={() => handleNavigate("menu")} onBack={() => handleNavigate("dashboard")} />
  ) : currentView === "admin-login" ? (
    <AdminLogin onLogin={() => handleNavigate("admin-dashboard")} onBack={() => handleNavigate("menu")} />
  ) : (
    <AdminDashboard onNavigate={handleNavigate} />
  )
}
