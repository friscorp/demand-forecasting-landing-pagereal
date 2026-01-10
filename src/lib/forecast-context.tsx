"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import type { ForecastResponse } from "./forecast-client"

interface ForecastContextType {
  forecast: ForecastResponse | null
  selectedItem: string | null
  setForecast: (forecast: ForecastResponse | null) => void
  setSelectedItem: (item: string | null) => void
  clearForecast: () => void
}

const ForecastContext = createContext<ForecastContextType | undefined>(undefined)

export const ForecastProvider = ({ children }: { children: ReactNode }) => {
  const [forecast, setForecast] = useState<ForecastResponse | null>(null)
  const [selectedItem, setSelectedItem] = useState<string | null>(null)

  const clearForecast = () => {
    setForecast(null)
    setSelectedItem(null)
  }

  return (
    <ForecastContext.Provider value={{ forecast, selectedItem, setForecast, setSelectedItem, clearForecast }}>
      {children}
    </ForecastContext.Provider>
  )
}

export const useForecast = () => {
  const context = useContext(ForecastContext)
  if (!context) {
    throw new Error("useForecast must be used within ForecastProvider")
  }
  return context
}
