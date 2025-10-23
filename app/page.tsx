"use client"

import { useState } from "react"
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

  const handleNavigate = (
    view: "menu" | "dashboard" | "withdrawal" | "withdrawal-details" | "login" | "admin-login" | "admin-dashboard",
    id?: string,
  ) => {
    if (id) {
      setSelectedWithdrawalId(id)
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
