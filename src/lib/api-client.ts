const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("dn_token")

  const headers: HeadersInit = {
    ...options.headers,
  }

  // Attach Firebase token if available
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  // Set JSON headers if body is JSON (but not FormData)
  if (options.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json"
  }

  const url = `${API_URL}${path}`

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API Error (${response.status}): ${errorText}`)
    }

    return await response.json()
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch ${path}: ${error.message}`)
    }
    throw error
  }
}

interface IngestResponse {
  business_id: number
  file_hash: string
  rows_inserted: number
  upload_id: number | null
}

interface ForecastFromDBResponse {
  mode: string
  results: {
    [itemName: string]: {
      forecast: Array<{
        ds: string
        yhat: number
        yhat_lower: number
        yhat_upper: number
      }>
    }
  }
}

interface SaveRunRequest {
  business_name: string
  mapping_json: Record<string, string>
  forecast_json: ForecastFromDBResponse
  insights_json: any | null
}

interface SaveRunResponse {
  id: number
  business_name: string
  mapping_json: Record<string, string>
  forecast_json: ForecastFromDBResponse
  insights_json: any | null
  created_at: string
}

export async function ingestCSV(file: File, mapping: Record<string, string>): Promise<IngestResponse> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("mapping", JSON.stringify(mapping))

  return apiFetch("/ingest", {
    method: "POST",
    body: formData,
  })
}

export async function generateForecastFromDB(horizonDays = 7): Promise<ForecastFromDBResponse> {
  return apiFetch(`/forecast/from-db?horizon_days=${horizonDays}`, {
    method: "POST",
  })
}

export async function saveRun(data: SaveRunRequest): Promise<SaveRunResponse> {
  console.log("[v0] POST /runs request:", {
    business_name: data.business_name,
    mapping_json: data.mapping_json,
    forecast_json_keys: data.forecast_json ? Object.keys(data.forecast_json) : null,
  })

  try {
    const response = await apiFetch("/runs", {
      method: "POST",
      body: JSON.stringify(data),
    })

    console.log("[v0] POST /runs response:", response)
    return response
  } catch (error) {
    console.error("[v0] POST /runs error:", error)
    if (error instanceof Error) {
      console.error("[v0] POST /runs error message:", error.message)
    }
    throw error
  }
}

export async function getLatestRun(): Promise<SaveRunResponse | null> {
  try {
    console.log("[v0] GET /runs/latest request...")
    const run = await apiFetch("/runs/latest", {
      method: "GET",
    })

    console.log("[v0] GET /runs/latest raw response:", run)

    const normalized = {
      id: run.id,
      business_name: run.business_name ?? run.businessName,
      mapping_json: run.mapping_json ?? run.mappingJson,
      forecast_json: run.forecast_json ?? run.forecastJson,
      insights_json: run.insights_json ?? run.insightsJson,
      created_at: run.created_at ?? run.createdAt,
    }

    console.log("[v0] GET /runs/latest normalized:", normalized)

    if (!normalized.forecast_json) {
      console.error("[v0] Latest run missing forecast_json!", run)
    }

    return normalized
  } catch (error) {
    console.log("[v0] GET /runs/latest error:", error)
    if (error instanceof Error && error.message.includes("404")) {
      console.log("[v0] No runs exist for this user (404)")
      return null
    }
    throw error
  }
}
