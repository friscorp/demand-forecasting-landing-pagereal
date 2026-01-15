export type { ForecastPoint } from "@/lib/api"

export type WeekSchedule = {
  [key: string]: { open: string; close: string } | null
}

export type ZonedParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  weekdayKey: string
}

export function parseISOToZonedParts(isoString: string, timezone: string): ZonedParts {
  const date = new Date(isoString)
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  })
  const parts = formatter.formatToParts(date)
  const partMap: Record<string, string> = {}
  parts.forEach((p) => {
    partMap[p.type] = p.value
  })

  const weekdayMap: Record<string, string> = {
    Sun: "sun",
    Mon: "mon",
    Tue: "tue",
    Wed: "wed",
    Thu: "thu",
    Fri: "fri",
    Sat: "sat",
  }

  return {
    year: Number.parseInt(partMap.year || "0", 10),
    month: Number.parseInt(partMap.month || "0", 10),
    day: Number.parseInt(partMap.day || "0", 10),
    hour: Number.parseInt(partMap.hour || "0", 10),
    minute: Number.parseInt(partMap.minute || "0", 10),
    weekdayKey: weekdayMap[partMap.weekday || ""] || "mon",
  }
}

export function getDateKeyYYYYMMDD(parts: ZonedParts): string {
  const mm = String(parts.month).padStart(2, "0")
  const dd = String(parts.day).padStart(2, "0")
  return `${parts.year}-${mm}-${dd}`
}

export function isClosedDate(dateKey: string, closedDates?: string[]): boolean {
  if (!closedDates) return false
  return closedDates.includes(dateKey)
}

export function isOpenHour(weekdayKey: string, hour: number, minute: number, schedule?: WeekSchedule): boolean {
  if (!schedule) return true

  const daySchedule = schedule[weekdayKey]
  if (!daySchedule) return false

  const [openHH, openMM] = daySchedule.open.split(":").map(Number)
  const [closeHH, closeMM] = daySchedule.close.split(":").map(Number)

  const currentMinutes = hour * 60 + minute
  const openMinutes = openHH * 60 + openMM
  const closeMinutes = closeHH * 60 + closeMM

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes
}

export function formatDayLabel(dateKey: string, timezone: string): string {
  const [year, month, day] = dateKey.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
  })
  return formatter.format(date)
}

export function formatTimeLabel(hour: number, minute: number): string {
  const hh = hour % 12 || 12
  const mm = String(minute).padStart(2, "0")
  const period = hour < 12 ? "AM" : "PM"
  return `${hh}:${mm} ${period}`
}

export function getNext7Days(startDateKey: string): string[] {
  const [year, month, day] = startDateKey.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  const result: string[] = []

  for (let i = 0; i < 7; i++) {
    const current = new Date(date)
    current.setDate(date.getDate() + i)
    const yyyy = current.getFullYear()
    const mm = String(current.getMonth() + 1).padStart(2, "0")
    const dd = String(current.getDate()).padStart(2, "0")
    result.push(`${yyyy}-${mm}-${dd}`)
  }

  return result
}
