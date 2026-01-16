export interface Promotion {
  id: string
  status: "active" | "inactive"
  item: string | null
  start: string
  end: string
  offer: string | null
  channel: "in_store" | "online" | "both" | null
  multiplier: number
  confidence: number
  rating_0to10: number
  metrics: {
    expectedLiftPct: number
    baselineUnitsEstimate?: number
    promoUnitsEstimate?: number
  }
  warnings: string[]
  createdAt: any
  updatedAt: any
}

export interface ForecastPoint {
  ds: string
  yhat: number
  yhat_lower: number
  yhat_upper: number
  [key: string]: any
}

export interface ForecastResult {
  forecast: ForecastPoint[]
  meta?: any
}

export interface Forecast {
  results: Record<string, ForecastResult>
  [key: string]: any
}

/**
 * Apply active promotions to forecast data at render time.
 * Multiplies yhat, yhat_lower, yhat_upper by applicable multipliers.
 * Returns a NEW forecast object with adjusted values.
 */
export function applyPromotionsToForecast(forecast: Forecast, promotions: Promotion[], timezone?: string): Forecast {
  if (!promotions || promotions.length === 0) {
    return forecast
  }

  const activePromos = promotions.filter((p) => p.status === "active")
  if (activePromos.length === 0) {
    return forecast
  }

  // Create a deep copy of the forecast
  const adjustedForecast: Forecast = {
    ...forecast,
    results: {},
  }

  // Process each item's forecast
  for (const [itemName, itemResult] of Object.entries(forecast.results)) {
    const forecastPoints = itemResult.forecast || []
    if (forecastPoints.length === 0) {
      adjustedForecast.results[itemName] = itemResult
      continue
    }

    // Apply promotions to each forecast point
    const adjustedPoints = forecastPoints.map((point) => {
      const pointDate = parseDate(point.ds, timezone)
      if (!pointDate) return point

      // Find all applicable promotions for this point
      const applicablePromos = activePromos.filter((promo) => {
        // Check if promotion applies to this item
        if (promo.item !== null && promo.item !== itemName) {
          return false
        }

        // Check if point is within promotion timeframe
        const startDate = parseDate(promo.start, timezone)
        const endDate = parseDate(promo.end, timezone)

        if (!startDate || !endDate) return false

        return pointDate >= startDate && pointDate < endDate
      })

      if (applicablePromos.length === 0) {
        return point
      }

      // Calculate combined multiplier (multiply all applicable multipliers)
      let combinedMultiplier = 1.0
      for (const promo of applicablePromos) {
        combinedMultiplier *= promo.multiplier
      }

      // Cap total multiplier to reasonable range [0.5, 2.0]
      combinedMultiplier = Math.max(0.5, Math.min(2.0, combinedMultiplier))

      // Apply multiplier to forecast values
      return {
        ...point,
        yhat: point.yhat * combinedMultiplier,
        yhat_lower: point.yhat_lower * combinedMultiplier,
        yhat_upper: point.yhat_upper * combinedMultiplier,
      }
    })

    adjustedForecast.results[itemName] = {
      ...itemResult,
      forecast: adjustedPoints,
    }
  }

  return adjustedForecast
}

/**
 * Parse a date string consistently, handling various formats
 */
function parseDate(dateStr: string, timezone?: string): Date | null {
  try {
    // Handle ISO format with or without timezone info
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return null
    }
    return date
  } catch {
    return null
  }
}

/**
 * Count how many active promotions affect a given forecast
 */
export function countActivePromotions(forecast: Forecast, promotions: Promotion[]): number {
  if (!promotions || promotions.length === 0) return 0

  const activePromos = promotions.filter((p) => p.status === "active")
  return activePromos.length
}
