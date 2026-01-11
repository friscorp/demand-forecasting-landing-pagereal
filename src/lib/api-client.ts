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

export async function ingestCSV(file: File, mapping: Record<string, string>): Promise<IngestResponse> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("mapping", JSON.stringify(mapping))

  return apiFetch("/ingest", {
    method: "POST",
    body: formData,
  })
}
