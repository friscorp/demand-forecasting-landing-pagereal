import { httpsCallable } from "firebase/functions"
import { functions } from "./firebase"

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

// ----- API Helpers -----

export async function ingestCsv(data: IngestRequest): Promise<IngestResponse> {
  console.log("[v0] Calling ingestCsv callable with:", {
    businessName: data.businessName,
    mapping: data.mapping,
    csvLength: data.csvText.length,
  })

  const callable = httpsCallable<IngestRequest, IngestResponse>(functions, "ingestCsv")

  try {
    const result = await callable(data)
    console.log("[v0] ingestCsv response:", result.data)

    if (!result.data || typeof result.data.rowsInserted !== "number") {
      throw new Error("Invalid response from ingestCsv: missing expected fields")
    }

    return result.data
  } catch (error: any) {
    console.error("[v0] ingestCsv error:", error)
    throw new Error(error.message || "Failed to ingest CSV data")
  }
}

export async function forecastFromDb(data: ForecastRequest): Promise<ForecastResponse> {
  console.log("[v0] Calling forecastFromDb callable with:", data)

  const callable = httpsCallable<ForecastRequest, ForecastResponse>(functions, "forecastFromDb")

  try {
    const result = await callable(data)
    console.log("[v0] forecastFromDb response:", result.data)

    if (!result.data || !result.data.results) {
      console.error("[v0] forecastFromDb invalid response - missing .results:", result.data)
      throw new Error("Invalid forecast response: missing results field")
    }

    return result.data
  } catch (error: any) {
    console.error("[v0] forecastFromDb error:", error)
    throw new Error(error.message || "Failed to generate forecast")
  }
}

export async function saveRun(data: SaveRunRequest): Promise<SaveRunResponse> {
  console.log("[v0] Calling saveRun callable with:", {
    businessName: data.businessName,
    mapping: data.mapping,
    forecastKeys: data.forecast ? Object.keys(data.forecast.results || {}) : null,
  })

  const callable = httpsCallable<SaveRunRequest, SaveRunResponse>(functions, "saveRun")

  try {
    const result = await callable(data)
    console.log("[v0] saveRun response:", result.data)

    if (!result.data || !result.data.id) {
      throw new Error("Invalid response from saveRun: missing id")
    }

    return result.data
  } catch (error: any) {
    console.error("[v0] saveRun error:", error)
    throw new Error(error.message || "Failed to save run")
  }
}

export async function latestRun(): Promise<LatestRunResponse | null> {
  console.log("[v0] Calling latestRun callable...")

  const callable = httpsCallable<void, LatestRunResponse | null>(functions, "latestRun")

  try {
    const result = await callable()
    console.log("[v0] latestRun response:", result.data)

    if (!result.data) {
      console.log("[v0] latestRun: no run found")
      return null
    }

    // Validate forecast exists
    if (!result.data.forecast || !result.data.forecast.results) {
      console.error("[v0] latestRun: missing forecast.results in response:", result.data)
    }

    return result.data
  } catch (error: any) {
    console.error("[v0] latestRun error:", error)
    // Return null if no runs exist (common case)
    if (error.code === "not-found" || error.message?.includes("not found")) {
      return null
    }
    throw new Error(error.message || "Failed to fetch latest run")
  }
}
