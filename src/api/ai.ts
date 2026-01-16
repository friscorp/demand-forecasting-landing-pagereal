import { auth } from "../lib/firebase"

// ----- Types -----

export interface PromoInput {
  item?: string | null
  start: string // ISO datetime
  end: string // ISO datetime
  offer?: string | null
  channel?: "in_store" | "online" | "both" | null
}

export interface AiInsightResponse {
  short: string
  detailed: string
  confidence: number
  metrics?: Record<string, any>
  recommendations?: string[]
  risks?: string[]
}

export interface AiAskResponse {
  short: string
  detailed: string
  confidence: number
  metrics?: Record<string, any>
  recommendations?: string[]
}

export interface AiPromoMultiplierResponse {
  short: string
  detailed: string
  confidence: number
  multiplier?: number
  rating_0to10?: number
  promo?: Record<string, any>
  recommendations?: string[]
  risks?: string[]
}

// ----- Helper Function -----

async function authedJsonFetch(path: string, options?: RequestInit): Promise<any> {
  // Get Firebase ID token
  const user = auth.currentUser
  if (!user) {
    throw new Error("User not authenticated. Please sign in first.")
  }

  const token = await user.getIdToken()

  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  })

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`
    try {
      const errorData = await response.json()
      if (errorData.error?.message) {
        errorMessage = errorData.error.message
      } else if (errorData.message) {
        errorMessage = errorData.message
      }
    } catch {
      // If JSON parsing fails, use the text response
      const text = await response.text()
      if (text) errorMessage = text
    }
    throw new Error(errorMessage)
  }

  return response.json()
}

// ----- AI API Helpers -----

const AI_ENDPOINT = "https://us-central1-business-forecast-ea3a5.cloudfunctions.net/askAiHttp"

export async function fetchWeeklyInsights(hourlyForecast?: any): Promise<AiInsightResponse> {
  try {
    const payload: any = { task: "insights_weekly" }

    // Include hourly forecast if provided
    if (hourlyForecast) {
      payload.hourlyForecast = hourlyForecast
    }

    const result = await authedJsonFetch(AI_ENDPOINT, {
      method: "POST",
      body: JSON.stringify(payload),
    })

    if (!result || !result.short || !result.detailed) {
      throw new Error("Invalid response: missing required fields")
    }

    return result
  } catch (error: any) {
    throw new Error(error.message || "Failed to fetch weekly insights")
  }
}

export async function askAiQuestion(question: string): Promise<AiAskResponse> {
  try {
    const result = await authedJsonFetch(AI_ENDPOINT, {
      method: "POST",
      body: JSON.stringify({ task: "ask_ai", question }),
    })

    if (!result || !result.short || !result.detailed) {
      throw new Error("Invalid response: missing required fields")
    }

    return result
  } catch (error: any) {
    throw new Error(error.message || "Failed to ask AI question")
  }
}

export async function fetchPromoMultiplier(promo: PromoInput): Promise<AiPromoMultiplierResponse> {
  try {
    const result = await authedJsonFetch(AI_ENDPOINT, {
      method: "POST",
      body: JSON.stringify({ task: "promo_multiplier", promo }),
    })

    if (!result || !result.short || !result.detailed) {
      throw new Error("Invalid response: missing required fields")
    }

    return result
  } catch (error: any) {
    throw new Error(error.message || "Failed to fetch promo multiplier")
  }
}
