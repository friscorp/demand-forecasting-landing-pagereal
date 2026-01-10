import { API_BASE_URL } from "./config"

export interface ForecastPoint {
  ds: string
  yhat: number
  yhat_lower: number
  yhat_upper: number
}

export interface ForecastResponse {
  [item: string]: ForecastPoint[]
}

export interface ForecastRequest {
  file: File
  mapping: {
    date: string
    item: string
    quantity: string
  }
  horizon_days: number
}

export async function generateForecast(request: ForecastRequest): Promise<ForecastResponse> {
  const formData = new FormData()
  formData.append("file", request.file)
  formData.append("mapping", JSON.stringify(request.mapping))
  formData.append("horizon_days", request.horizon_days.toString())

  const response = await fetch(`${API_BASE_URL}/forecast`, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Forecast generation failed: ${error}`)
  }

  return response.json()
}
