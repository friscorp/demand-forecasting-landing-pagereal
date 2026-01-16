import { auth } from "./firebase"

// ----- Types -----

export interface IngestRequest {
  csvText: string
  mapping: {
    date: string
    item: string
    quantity: string
  }
  businessName: string
}

export interface IngestResponse {
  businessId?: string
  fileHash: string
  rowsInserted: number
  deduped: boolean
}

export interface ForecastRequest {
  horizonDays: number
}

export interface ForecastPoint {
  ds: string
  yhat: number
  yhat_lower: number
  yhat_upper: number
}

export interface ForecastResponse {
  mode: string
  results: {
    [itemName: string]: {
      meta?: any
      forecast: ForecastPoint[]
    }
  }
}

export interface SaveRunRequest {
  businessName: string
  mapping: Record<string, string>
  forecast: ForecastResponse
  insights: any | null
}

export interface SaveRunResponse {
  id: string
  businessName: string
  mapping: Record<string, string>
  forecast: ForecastResponse
  insights: any | null
  createdAt: string
}

export interface LatestRunResponse {
  id: string
  businessName: string
  mapping: Record<string, string>
  forecast: ForecastResponse
  insights: any | null
  createdAt: string
}

export interface BusinessProfile {
  name: string
  category?: string
  timezone?: string
  unitOfMeasure?: string
  hours?: {
    [key: string]: { open: string; close: string; enabled: boolean }
  }
  closedDates?: string[]
  leadTime?: string
  customLeadTime?: number
  events?: Array<{
    date: string
    type: "holiday" | "promotion" | "closure"
    description: string
  }>
  recipeMapping?: Array<{
    item: string
    ingredients: Array<{ name: string; quantity: number }>
  }>
  [key: string]: any
}

export interface SaveBusinessProfileRequest {
  profile: BusinessProfile
}

export interface SaveBusinessProfileResponse {
  success: boolean
  message?: string
}

export interface HourlyRunResponse {
  id: string
  businessName: string
  mapping: Record<string, string>
  forecast: ForecastResponse
  meta?: any
  createdAt: string
}

export interface CompareDayRequest {
  item: string
  monthDay: string // Format: MM-DD
}

export interface CompareDayResponse {
  item: string
  monthDay: string
  byYear: {
    [year: string]: Array<{
      ds: string
      y: number
      hour: number
    }>
  }
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

// ----- API Helpers -----

export async function ingestCsv(data: IngestRequest): Promise<IngestResponse> {
  try {
    const result = await authedJsonFetch("https://us-central1-business-forecast-ea3a5.cloudfunctions.net/ingestCsv", {
      method: "POST",
      body: JSON.stringify(data),
    })

    if (!result || typeof result.rowsInserted !== "number") {
      throw new Error("Invalid response from ingestCsv: missing expected fields")
    }

    return result
  } catch (error: any) {
    throw new Error(error.message || "Failed to ingest CSV data")
  }
}

export async function forecastFromDb(data: ForecastRequest): Promise<ForecastResponse> {
  try {
    const result = await authedJsonFetch(
      "https://us-central1-business-forecast-ea3a5.cloudfunctions.net/forecastFromDb",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    )

    if (!result || !result.results) {
      throw new Error("Invalid forecast response: missing results field")
    }

    return result
  } catch (error: any) {
    throw new Error(error.message || "Failed to generate forecast")
  }
}

export async function saveRun(data: SaveRunRequest): Promise<SaveRunResponse> {
  try {
    const result = await authedJsonFetch("https://us-central1-business-forecast-ea3a5.cloudfunctions.net/saveRun", {
      method: "POST",
      body: JSON.stringify(data),
    })

    if (!result || !result.id) {
      throw new Error("Invalid response from saveRun: missing id")
    }

    return result
  } catch (error: any) {
    throw new Error(error.message || "Failed to save run")
  }
}

export async function latestRun(): Promise<LatestRunResponse | null> {
  try {
    const result = await authedJsonFetch("https://us-central1-business-forecast-ea3a5.cloudfunctions.net/latestRun", {
      method: "GET",
    })

    if (!result) {
      return null
    }

    // Validate forecast exists
    if (!result.forecast || !result.forecast.results) {
      console.error("missing forecast.results in response:", result)
    }

    return result
  } catch (error: any) {
    // Return null if no runs exist (common case)
    if (error.message?.includes("not found") || error.message?.includes("404")) {
      return null
    }
    throw new Error(error.message || "Failed to fetch latest run")
  }
}

export async function saveBusinessProfile(data: SaveBusinessProfileRequest): Promise<SaveBusinessProfileResponse> {
  try {
    const result = await authedJsonFetch(
      "https://us-central1-business-forecast-ea3a5.cloudfunctions.net/saveBusinessProfile",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    )

    return result
  } catch (error: any) {
    throw new Error(error.message || "Failed to save business profile")
  }
}

export async function latestRunHourly(): Promise<HourlyRunResponse | null> {
  try {
    const result = await authedJsonFetch(
      "https://us-central1-business-forecast-ea3a5.cloudfunctions.net/latestRunHourlyHttp",
      {
        method: "GET",
      },
    )

    if (!result) {
      return null
    }

    // Validate forecast exists
    if (!result.forecast || !result.forecast.results) {
      console.error("missing forecast.results in response:", result)
    }

    return result
  } catch (error: any) {
    // Return null if no runs exist (common case)
    if (error.message?.includes("not found") || error.message?.includes("404")) {
      return null
    }
    throw new Error(error.message || "Failed to fetch latest hourly run")
  }
}

export async function forecastHourly(data: ForecastRequest): Promise<ForecastResponse> {
  try {
    const result = await authedJsonFetch(
      "https://us-central1-business-forecast-ea3a5.cloudfunctions.net/forecastHourlyFromDbHttp",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    )

    if (!result || !result.results) {
      throw new Error("Invalid hourly forecast response: missing results field")
    }

    return result
  } catch (error: any) {
    throw new Error(error.message || "Failed to generate hourly forecast")
  }
}

export async function saveRunHourly(data: SaveRunRequest): Promise<SaveRunResponse> {
  try {
    const result = await authedJsonFetch(
      "https://us-central1-business-forecast-ea3a5.cloudfunctions.net/saveRunHourlyHttp",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    )

    if (!result || !result.id) {
      throw new Error("Invalid response from saveRunHourlyHttp: missing id")
    }

    return result
  } catch (error: any) {
    throw new Error(error.message || "Failed to save hourly run")
  }
}

// ----- New API Methods for History Comparison -----

export async function ingestHistoryHourly(): Promise<{ count: number; message: string }> {
  try {
    const result = await authedJsonFetch(
      "https://us-central1-business-forecast-ea3a5.cloudfunctions.net/ingestHistoryHourlyFromLatestUploadHttp",
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    )

    return result
  } catch (error: any) {
    throw new Error(error.message || "Failed to ingest history")
  }
}

export async function compareDayAcrossYears(params: CompareDayRequest): Promise<CompareDayResponse> {
  try {
    const url = new URL(
      "https://us-central1-business-forecast-ea3a5.cloudfunctions.net/compareDayAcrossYearsHourlyHttp",
    )
    url.searchParams.append("item", params.item)
    url.searchParams.append("monthDay", params.monthDay)

    const result = await authedJsonFetch(url.toString(), {
      method: "GET",
    })

    return result
  } catch (error: any) {
    throw new Error(error.message || "Failed to compare day across years")
  }
}
