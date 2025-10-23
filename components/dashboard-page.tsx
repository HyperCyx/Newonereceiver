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
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-4 sticky top-0 bg-white z-10">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentView(currentView === "transactions" ? "menu" : "transactions")}
            className="text-2xl text-gray-800"
          >
            {currentView === "transactions" ? "←" : "✕"}
          </button>
          <h1 className="text-xl font-semibold text-gray-800">New one receiver</h1>
          <div className="flex gap-2">
            <button className="text-2xl text-gray-800">⌄</button>
            <button className="text-2xl text-gray-800">⋮</button>
          </div>
        </div>
      </div>

      {currentView === "menu" ? (
        <MenuView onNavigate={onNavigate} />
      ) : (
        <>
          {/* Search Bar */}
          <div className="px-4 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
              <input
                type="text"
                placeholder="Search phone number"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-gray-700 placeholder-gray-400"
              />
              <button className="text-gray-400">⚙️</button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 px-4">
            {(["pending", "accepted", "rejected"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-4 font-semibold capitalize relative ${
                  activeTab === tab ? "text-blue-500" : "text-gray-400"
                }`}
              >
                {tab}
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500"></div>}
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
