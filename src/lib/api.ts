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

// ----- Helper Function -----

async function authedJsonFetch(path: string, options?: RequestInit): Promise<any> {
  // Get Firebase ID token
  const user = auth.currentUser
  if (!user) {
    throw new Error("User not authenticated. Please sign in first.")
  }

  const token = await user.getIdToken()

  console.log(`[v0] authedJsonFetch: ${options?.method || "GET"} ${path}`)

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
    console.error(`[v0] authedJsonFetch error:`, errorMessage)
    throw new Error(errorMessage)
  }

  return response.json()
}

// ----- API Helpers -----

export async function ingestCsv(data: IngestRequest): Promise<IngestResponse> {
  console.log("[v0] Calling ingestCsv with:", {
    businessName: data.businessName,
    mapping: data.mapping,
    csvLength: data.csvText.length,
  })

  try {
    const result = await authedJsonFetch("https://us-central1-business-forecast-ea3a5.cloudfunctions.net/ingestCsv", {
      method: "POST",
      body: JSON.stringify(data),
    })

    console.log("[v0] ingestCsv response:", result)

    if (!result || typeof result.rowsInserted !== "number") {
      throw new Error("Invalid response from ingestCsv: missing expected fields")
    }

    return result
  } catch (error: any) {
    console.error("[v0] ingestCsv error:", error)
    throw new Error(error.message || "Failed to ingest CSV data")
  }
}

export async function forecastFromDb(data: ForecastRequest): Promise<ForecastResponse> {
  console.log("[v0] Calling forecastFromDb with:", data)

  try {
    const result = await authedJsonFetch(
      "https://us-central1-business-forecast-ea3a5.cloudfunctions.net/forecastFromDb",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    )

    console.log("[v0] forecastFromDb response:", result)

    if (!result || !result.results) {
      console.error("[v0] forecastFromDb invalid response - missing .results:", result)
      throw new Error("Invalid forecast response: missing results field")
    }

    return result
  } catch (error: any) {
    console.error("[v0] forecastFromDb error:", error)
    throw new Error(error.message || "Failed to generate forecast")
  }
}

export async function saveRun(data: SaveRunRequest): Promise<SaveRunResponse> {
  console.log("[v0] Calling saveRun with:", {
    businessName: data.businessName,
    mapping: data.mapping,
    forecastKeys: data.forecast ? Object.keys(data.forecast.results || {}) : null,
  })

  try {
    const result = await authedJsonFetch("https://us-central1-business-forecast-ea3a5.cloudfunctions.net/saveRun", {
      method: "POST",
      body: JSON.stringify(data),
    })

    console.log("[v0] saveRun response:", result)

    if (!result || !result.id) {
      throw new Error("Invalid response from saveRun: missing id")
    }

    return result
  } catch (error: any) {
    console.error("[v0] saveRun error:", error)
    throw new Error(error.message || "Failed to save run")
  }
}

export async function latestRun(): Promise<LatestRunResponse | null> {
  console.log("[v0] Calling latestRun...")

  try {
    const result = await authedJsonFetch("https://us-central1-business-forecast-ea3a5.cloudfunctions.net/latestRun", {
      method: "GET",
    })

    console.log("[v0] latestRun response:", result)

    if (!result) {
      console.log("[v0] latestRun: no run found")
      return null
    }

    // Validate forecast exists
    if (!result.forecast || !result.forecast.results) {
      console.error("[v0] latestRun: missing forecast.results in response:", result)
    }

    return result
  } catch (error: any) {
    console.error("[v0] latestRun error:", error)
    // Return null if no runs exist (common case)
    if (error.message?.includes("not found") || error.message?.includes("404")) {
      return null
    }
    throw new Error(error.message || "Failed to fetch latest run")
  }
}
