"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface OnboardingData {
  businessName: string
  category: string
  timezone: string
  unitOfMeasure: string
  hours: {
    [key: string]: { open: string; close: string; enabled: boolean }
  }
  closedDates: string[]
  leadTime: string
  customLeadTime?: number
  csvFile?: File
  csvColumns?: { [key: string]: string }
  events: Array<{
    date: string
    type: "holiday" | "promotion" | "closure"
    description: string
  }>
  recipeMapping?: Array<{
    item: string
    ingredients: Array<{ name: string; quantity: number }>
  }>
}

interface OnboardingContextType {
  data: OnboardingData
  updateData: (updates: Partial<OnboardingData>) => void
  currentStep: number
  setCurrentStep: (step: number) => void
  resetOnboarding: () => void
}

const defaultData: OnboardingData = {
  businessName: "",
  category: "",
  timezone: "America/New_York",
  unitOfMeasure: "units",
  hours: {
    monday: { open: "09:00", close: "17:00", enabled: true },
    tuesday: { open: "09:00", close: "17:00", enabled: true },
    wednesday: { open: "09:00", close: "17:00", enabled: true },
    thursday: { open: "09:00", close: "17:00", enabled: true },
    friday: { open: "09:00", close: "17:00", enabled: true },
    saturday: { open: "09:00", close: "17:00", enabled: false },
    sunday: { open: "09:00", close: "17:00", enabled: false },
  },
  closedDates: [],
  leadTime: "same-day",
  events: [],
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<OnboardingData>(defaultData)
  const [currentStep, setCurrentStep] = useState(0)

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }

  const resetOnboarding = () => {
    setData(defaultData)
    setCurrentStep(0)
  }

  return (
    <OnboardingContext.Provider value={{ data, updateData, currentStep, setCurrentStep, resetOnboarding }}>
      {children}
    </OnboardingContext.Provider>
  )
}

export const useOnboarding = () => {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider")
  }
  return context
}
