"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

// Types for onboarding data based on Exit Ticket 2
export interface BusinessHours {
  [day: string]: { open: string; close: string; closed: boolean }
}

export interface ClosedDate {
  date: string
  recurring: boolean
}

export interface CalendarEvent {
  type: "holiday" | "promo" | "closure"
  label: string
  startDate: string
  endDate: string
}

export interface Recipe {
  item: string
  ingredient: string
  unitsPerItem: number
}

export interface ColumnMapping {
  date: string
  item: string
  unitsSold: string
  unitsMade?: string
  price?: string
  holidayFlag?: string
  promoFlag?: string
}

export interface OnboardingData {
  business: {
    name: string
    timezone: string
    category: string
    unitOfMeasure: string
  }
  hours: {
    weekly: BusinessHours
    closedDates: ClosedDate[]
  }
  leadTimeTemplate: string
  uploads: {
    salesFile: File | null
    regressorsFile: File | null
  }
  columnMapping: ColumnMapping
  events: CalendarEvent[]
  recipes: Recipe[]
}

interface OnboardingContextType {
  data: OnboardingData
  updateData: (updates: Partial<OnboardingData>) => void
  updateBusiness: (updates: Partial<OnboardingData["business"]>) => void
  updateHours: (updates: Partial<OnboardingData["hours"]>) => void
  updateColumnMapping: (updates: Partial<ColumnMapping>) => void
  addEvent: (event: CalendarEvent) => void
  removeEvent: (index: number) => void
  addRecipe: (recipe: Recipe) => void
  removeRecipe: (index: number) => void
  resetData: () => void
}

const defaultHours: BusinessHours = {
  monday: { open: "09:00", close: "17:00", closed: false },
  tuesday: { open: "09:00", close: "17:00", closed: false },
  wednesday: { open: "09:00", close: "17:00", closed: false },
  thursday: { open: "09:00", close: "17:00", closed: false },
  friday: { open: "09:00", close: "17:00", closed: false },
  saturday: { open: "10:00", close: "15:00", closed: false },
  sunday: { open: "10:00", close: "15:00", closed: true },
}

const initialData: OnboardingData = {
  business: {
    name: "",
    timezone: "",
    category: "",
    unitOfMeasure: "",
  },
  hours: {
    weekly: defaultHours,
    closedDates: [],
  },
  leadTimeTemplate: "",
  uploads: {
    salesFile: null,
    regressorsFile: null,
  },
  columnMapping: {
    date: "",
    item: "",
    unitsSold: "",
  },
  events: [],
  recipes: [],
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OnboardingData>(initialData)

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("onboardingData")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Files can't be stored in localStorage, so we keep them null
        setData({ ...parsed, uploads: { salesFile: null, regressorsFile: null } })
      } catch (e) {
        console.error("Failed to parse saved onboarding data")
      }
    }
  }, [])

  // Save to localStorage on change (excluding files)
  useEffect(() => {
    const toSave = { ...data, uploads: { salesFile: null, regressorsFile: null } }
    localStorage.setItem("onboardingData", JSON.stringify(toSave))
  }, [data])

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }

  const updateBusiness = (updates: Partial<OnboardingData["business"]>) => {
    setData((prev) => ({
      ...prev,
      business: { ...prev.business, ...updates },
    }))
  }

  const updateHours = (updates: Partial<OnboardingData["hours"]>) => {
    setData((prev) => ({
      ...prev,
      hours: { ...prev.hours, ...updates },
    }))
  }

  const updateColumnMapping = (updates: Partial<ColumnMapping>) => {
    setData((prev) => ({
      ...prev,
      columnMapping: { ...prev.columnMapping, ...updates },
    }))
  }

  const addEvent = (event: CalendarEvent) => {
    setData((prev) => ({ ...prev, events: [...prev.events, event] }))
  }

  const removeEvent = (index: number) => {
    setData((prev) => ({
      ...prev,
      events: prev.events.filter((_, i) => i !== index),
    }))
  }

  const addRecipe = (recipe: Recipe) => {
    setData((prev) => ({ ...prev, recipes: [...prev.recipes, recipe] }))
  }

  const removeRecipe = (index: number) => {
    setData((prev) => ({
      ...prev,
      recipes: prev.recipes.filter((_, i) => i !== index),
    }))
  }

  const resetData = () => {
    setData(initialData)
    localStorage.removeItem("onboardingData")
  }

  return (
    <OnboardingContext.Provider
      value={{
        data,
        updateData,
        updateBusiness,
        updateHours,
        updateColumnMapping,
        addEvent,
        removeEvent,
        addRecipe,
        removeRecipe,
        resetData,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider")
  }
  return context
}
