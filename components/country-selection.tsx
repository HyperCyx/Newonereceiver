"use client"

import { useState, useEffect } from "react"
import { Globe, AlertCircle, CheckCircle, Trophy } from "lucide-react"

interface Country {
  id: string
  country_code: string
  country_name: string
  max_capacity: number
  used_capacity: number
  prize_amount: number
  is_active: boolean
  available_capacity: number
  has_capacity: boolean
}

interface CountrySelectionProps {
  onCountrySelect?: (country: Country) => void
  showPrizes?: boolean
}

export default function CountrySelection({ onCountrySelect, showPrizes = true }: CountrySelectionProps) {
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchCountries()
  }, [])

  const fetchCountries = async () => {
    setLoading(true)
    setError("")
    
    try {
      const response = await fetch('/api/countries')
      if (!response.ok) {
        throw new Error('Failed to fetch countries')
      }
      
      const result = await response.json()
      if (result.success && result.countries) {
        setCountries(result.countries)
      } else {
        setError('No countries available')
      }
    } catch (err) {
      console.error('Error fetching countries:', err)
      setError('Failed to load countries')
    } finally {
      setLoading(false)
    }
  }

  const handleCountryClick = (country: Country) => {
    if (country.has_capacity) {
      setSelectedCountry(country)
      if (onCountrySelect) {
        onCountrySelect(country)
      }
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-1">
          <Globe size={20} className="text-blue-500" />
          Select Your Country
        </h3>
        <p className="text-sm text-gray-600">Choose a country to see available accounts and prizes</p>
      </div>

      <div className="p-4 space-y-3">
        {countries.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <AlertCircle size={32} className="mx-auto mb-2" />
            <p>No countries available at the moment</p>
            <p className="text-sm mt-1">Please check back later</p>
          </div>
        ) : (
          countries.map((country) => {
            const isSelected = selectedCountry?.id === country.id
            const capacityPercent = country.max_capacity > 0 
              ? ((country.max_capacity - country.used_capacity) / country.max_capacity) * 100 
              : 0

            return (
              <div
                key={country.id}
                onClick={() => handleCountryClick(country)}
                className={`
                  relative border-2 rounded-lg p-4 transition-all cursor-pointer
                  ${!country.has_capacity 
                    ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed' 
                    : isSelected 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }
                `}
              >
                {/* Country Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                      {country.country_code}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">{country.country_name}</h4>
                      <p className="text-xs text-gray-500">Code: {country.country_code}</p>
                    </div>
                  </div>
                  
                  {isSelected && (
                    <CheckCircle className="text-blue-500" size={24} />
                  )}
                </div>

                {/* Capacity Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Available Accounts:</span>
                    <span className={`font-semibold ${country.has_capacity ? 'text-green-600' : 'text-red-600'}`}>
                      {country.available_capacity} / {country.max_capacity}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        capacityPercent > 50 ? 'bg-green-500' : 
                        capacityPercent > 20 ? 'bg-yellow-500' : 
                        'bg-red-500'
                      }`}
                      style={{ width: `${capacityPercent}%` }}
                    />
                  </div>

                  {/* Prize Amount */}
                  {showPrizes && country.prize_amount > 0 && (
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200">
                      <span className="text-gray-600 flex items-center gap-1">
                        <Trophy size={16} className="text-yellow-500" />
                        Prize per account:
                      </span>
                      <span className="font-bold text-green-600">
                        ${country.prize_amount.toFixed(2)} USDT
                      </span>
                    </div>
                  )}

                  {/* No Capacity Message */}
                  {!country.has_capacity && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle size={14} />
                      No capacity available for {country.country_name}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Selected Country Summary */}
      {selectedCountry && (
        <div className="bg-blue-50 border-t border-blue-200 px-4 py-3">
          <p className="text-sm text-blue-800">
            <strong>Selected:</strong> {selectedCountry.country_name} - 
            {selectedCountry.available_capacity} accounts available
            {showPrizes && selectedCountry.prize_amount > 0 && 
              ` - $${selectedCountry.prize_amount.toFixed(2)} prize per account`
            }
          </p>
        </div>
      )}
    </div>
  )
}
