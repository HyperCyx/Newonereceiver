"use client"

import { useState } from "react"
import MenuView from "./menu-view"
import TransactionList from "./transaction-list"

interface DashboardPageProps {
  onNavigate: (view: "menu" | "login") => void
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [currentView, setCurrentView] = useState<"transactions" | "menu">("transactions")
  const [activeTab, setActiveTab] = useState<"pending" | "accepted" | "rejected">("accepted")
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {currentView === "menu" ? (
        <MenuView onNavigate={onNavigate} />
      ) : (
        <>
          {/* Search Bar */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <input
                type="text"
                placeholder="Search phone number"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-[15px] text-gray-700 placeholder-gray-400"
              />
              <button className="text-base">⚙️</button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {(["pending", "accepted", "rejected"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-[15px] font-medium capitalize relative ${
                  activeTab === tab ? "text-blue-500" : "text-gray-500"
                }`}
              >
                {tab}
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>}
              </button>
            ))}
          </div>

          {/* Transaction List */}
          <TransactionList tab={activeTab} searchQuery={searchQuery} onLoginClick={() => onNavigate("login")} />
        </>
      )}
    </div>
  )
}
