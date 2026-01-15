import type { ForecastPoint } from "@/lib/api"
import type { HourMask } from "@/lib/hour-mask"
import { parseISOToZonedParts, getDateKeyYYYYMMDD, isClosedDate, isOpenHour } from "@/lib/time-filtering"

export type ItemMetrics = {
  item: string
  nextOpenDayTotal: number
  sevenDayTotal: number
  peak: {
    label: string
    value: number
  }
  uncertainty: number
}

type BusinessProfile = {
  timezone?: string
  hours?: Record<string, { enabled: boolean; open: string; close: string }>
  closedDates?: string[]
}

type ForecastResults = {
  [item: string]: {
    forecast: ForecastPoint[]
  }
}

function convertBusinessHoursToOpenMap(hours: BusinessProfile["hours"]): Record<string, boolean> {
  if (!hours) return {}

  const dayMap: Record<string, string> = {
    monday: "mon",
    tuesday: "tue",
    wednesday: "wed",
    thursday: "thu",
    friday: "fri",
    saturday: "sat",
    sunday: "sun",
  }

  const openMap: Record<string, boolean> = {}
  for (const [fullDay, schedule] of Object.entries(hours)) {
    const abbr = dayMap[fullDay.toLowerCase()]
    if (abbr && schedule) {
      openMap[abbr] = schedule.enabled
    }
  }

  return openMap
}

function shouldIncludeRow(
  point: ForecastPoint,
  businessProfile: BusinessProfile | null,
  hourMask: HourMask | null,
  mode: "daily" | "hourly",
  maskEnabled: boolean,
): boolean {
  if (mode === "daily") return true

  const timezone = businessProfile?.timezone || "America/Los_Angeles"
  const parts = parseISOToZonedParts(point.ds, timezone)
  const dateKey = getDateKeyYYYYMMDD(parts)

  if (isClosedDate(dateKey, businessProfile?.closedDates)) {
    return false
  }

  if (businessProfile?.hours) {
    const dayMap: Record<string, string> = {
      monday: "mon",
      tuesday: "tue",
      wednesday: "wed",
      thursday: "thu",
      friday: "fri",
      saturday: "sat",
      sunday: "sun",
    }

    const schedule: Record<string, { open: string; close: string } | null> = {}
    for (const [fullDay, value] of Object.entries(businessProfile.hours)) {
      const abbr = dayMap[fullDay.toLowerCase()]
      if (abbr && value?.enabled) {
        schedule[abbr] = { open: value.open, close: value.close }
      } else if (abbr) {
        schedule[abbr] = null
      }
    }

    if (!isOpenHour(parts.weekdayKey, parts.hour, parts.minute, schedule)) {
      return false
    }
  }

  if (maskEnabled && hourMask) {
    const allowedHours = hourMask[parts.weekdayKey as keyof HourMask] || []
    if (!allowedHours.includes(parts.hour)) {
      return false
    }
  }

  return true
}

function getNextOpenDate(
  startDateKey: string,
  businessProfile: BusinessProfile | null,
  timezone: string,
): string | null {
  const openMap = businessProfile?.hours ? convertBusinessHoursToOpenMap(businessProfile.hours) : {}
  const allOpen = Object.keys(openMap).length === 0

  for (let i = 0; i < 30; i++) {
    const [year, month, day] = startDateKey.split("-").map(Number)
    const date = new Date(year, month - 1, day + i)
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, "0")
    const dd = String(date.getDate()).padStart(2, "0")
    const dateKey = `${yyyy}-${mm}-${dd}`

    if (isClosedDate(dateKey, businessProfile?.closedDates)) {
      continue
    }

    const parts = parseISOToZonedParts(`${dateKey}T00:00:00`, timezone)
    if (allOpen || openMap[parts.weekdayKey]) {
      return dateKey
    }
  }

  return null
}

function getNext7OpenDates(startDateKey: string, businessProfile: BusinessProfile | null, timezone: string): string[] {
  const openMap = businessProfile?.hours ? convertBusinessHoursToOpenMap(businessProfile.hours) : {}
  const allOpen = Object.keys(openMap).length === 0
  const result: string[] = []

  for (let i = 0; i < 60 && result.length < 7; i++) {
    const [year, month, day] = startDateKey.split("-").map(Number)
    const date = new Date(year, month - 1, day + i)
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, "0")
    const dd = String(date.getDate()).padStart(2, "0")
    const dateKey = `${yyyy}-${mm}-${dd}`

    if (isClosedDate(dateKey, businessProfile?.closedDates)) {
      continue
    }

    const parts = parseISOToZonedParts(`${dateKey}T00:00:00`, timezone)
    if (allOpen || openMap[parts.weekdayKey]) {
      result.push(dateKey)
    }
  }

  return result
}

export function computeItemMetrics(
  activeForecast: { mode: string; results: ForecastResults },
  businessProfile: BusinessProfile | null,
  hourMask: HourMask | null,
  mode: "daily" | "hourly",
  maskEnabled = false,
): ItemMetrics[] {
  const items = Object.keys(activeForecast.results)
  const timezone = businessProfile?.timezone || "America/Los_Angeles"

  return items.map((item) => {
    const forecast = activeForecast.results[item]?.forecast || []
    if (forecast.length === 0) {
      return {
        item,
        nextOpenDayTotal: 0,
        sevenDayTotal: 0,
        peak: { label: "N/A", value: 0 },
        uncertainty: 0,
      }
    }

    const firstPoint = forecast[0]
    const firstParts = parseISOToZonedParts(firstPoint.ds, timezone)
    const firstDateKey = getDateKeyYYYYMMDD(firstParts)

    const nextOpenDate = getNextOpenDate(firstDateKey, businessProfile, timezone)
    const next7OpenDates = getNext7OpenDates(firstDateKey, businessProfile, timezone)

    let nextOpenDayTotal = 0
    let sevenDayTotal = 0
    let peakValue = 0
    let peakLabel = "N/A"
    let uncertaintySum = 0
    let uncertaintyCount = 0

    const filteredPoints = forecast.filter((point) =>
      shouldIncludeRow(point, businessProfile, hourMask, mode, maskEnabled),
    )

    for (const point of filteredPoints) {
      const parts = parseISOToZonedParts(point.ds, timezone)
      const dateKey = getDateKeyYYYYMMDD(parts)

      if (nextOpenDate && dateKey === nextOpenDate) {
        nextOpenDayTotal += point.yhat
      }

      if (next7OpenDates.includes(dateKey)) {
        sevenDayTotal += point.yhat
      }

      if (point.yhat > peakValue) {
        peakValue = point.yhat
        if (mode === "hourly") {
          const hh = parts.hour % 12 || 12
          const period = parts.hour < 12 ? "AM" : "PM"
          peakLabel = `${hh}:00 ${period}`
        } else {
          peakLabel = new Date(point.ds).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        }
      }

      uncertaintySum += point.yhat_upper - point.yhat_lower
      uncertaintyCount += 1
    }

    const uncertainty = uncertaintyCount > 0 ? uncertaintySum / uncertaintyCount : 0

    return {
      item,
      nextOpenDayTotal: Math.round(nextOpenDayTotal),
      sevenDayTotal: Math.round(sevenDayTotal),
      peak: { label: peakLabel, value: Math.round(peakValue) },
      uncertainty: Math.round(uncertainty),
    }
  })
}
