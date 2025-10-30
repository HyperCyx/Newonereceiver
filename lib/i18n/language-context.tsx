"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { translations, Language } from './translations'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string>) => string
  isRTL: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Fetch default language from settings
    const fetchLanguage = async () => {
      try {
        const response = await fetch('/api/settings')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.settings?.default_language) {
            setLanguageState(data.settings.default_language as Language)
          }
        }
      } catch (error) {
        console.error('Error fetching language setting:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchLanguage()
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    // Update HTML dir attribute for RTL
    if (typeof document !== 'undefined') {
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
      document.documentElement.lang = lang
    }
  }

  // Set initial dir attribute
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
      document.documentElement.lang = language
    }
  }, [language])

  const t = (key: string, params?: Record<string, string>): string => {
    const keys = key.split('.')
    let value: any = translations[language]
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k]
      } else {
        // Fallback to English if key not found
        value = translations.en
        for (const fallbackKey of keys) {
          if (value && typeof value === 'object') {
            value = value[fallbackKey]
          } else {
            return key // Return key if not found
          }
        }
        break
      }
    }
    
    if (typeof value !== 'string') {
      return key
    }
    
    // Replace parameters
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        value = value.replace(`{${paramKey}}`, paramValue)
      })
    }
    
    return value
  }

  const isRTL = language === 'ar'

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen bg-white">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
