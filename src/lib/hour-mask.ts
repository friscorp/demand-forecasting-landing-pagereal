import { collection, query, orderBy, limit, getDocs, doc, setDoc } from "firebase/firestore"
import { db } from "./firebase"
import type { WeekSchedule } from "./time-filtering"

export type WeekdayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat"
export type HourMask = Record<WeekdayKey, number[]>
export type HourCounts = Record<WeekdayKey, Record<number, number>>

export interface UploadDoc {
  csvText: string
  mapping: {
    date: string
    item: string
    quantity: string
  }
  fileHash: string
  businessId?: string
  createdAt?: any
  lastUsedAt?: any
  hourMaskV1?: HourMask
  hourMaskCountsV1?: HourCounts
  hourMaskUpdatedAt?: any
}

/**
 * Fetch the latest upload document for a user from Firestore
 */
export async function fetchLatestUpload(userId: string): Promise<UploadDoc | null> {
  console.log("[v0] HourMask: fetching latest upload...")

  try {
    const uploadsRef = collection(db, "users", userId, "uploads")

    // Try orderBy lastUsedAt first
    let q = query(uploadsRef, orderBy("lastUsedAt", "desc"), limit(1))
    let snapshot = await getDocs(q)

    // Fallback to createdAt if no results
    if (snapshot.empty) {
      q = query(uploadsRef, orderBy("createdAt", "desc"), limit(1))
      snapshot = await getDocs(q)
    }

    if (snapshot.empty) {
      console.log("[v0] HourMask: no uploads found")
      return null
    }

    const uploadDoc = snapshot.docs[0]
    const data = uploadDoc.data() as UploadDoc

    console.log("[v0] HourMask: found upload doc with fileHash:", data.fileHash)
    return { ...data, id: uploadDoc.id } as any
  } catch (error) {
    console.error("[v0] HourMask: error fetching latest upload:", error)
    return null
  }
}

/**
 * Parse a timestamp from various formats and return weekday + hour
 */
function parseTimestamp(
  value: string,
  timezone = "America/Los_Angeles",
): { weekdayKey: WeekdayKey; hour: number; dayKey: string } | null {
  try {
    // Try ISO format first
    let date = new Date(value)

    // If invalid, try MM/DD/YYYY HH:mm format
    if (isNaN(date.getTime())) {
      const match = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/)
      if (match) {
        const [, month, day, year, hour, minute] = match
        date = new Date(
          `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:00`,
        )
      }
    }

    if (isNaN(date.getTime())) {
      return null
    }

    // Get weekday (0=Sunday, 6=Saturday)
    const weekday = date.getDay()
    const weekdayKeys: WeekdayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
    const weekdayKey = weekdayKeys[weekday]

    // Get hour (0-23)
    const hour = date.getHours()

    // Get day key for counting distinct days
    const dayKey = date.toISOString().split("T")[0]

    return { weekdayKey, hour, dayKey }
  } catch (error) {
    return null
  }
}

/**
 * Compute hour mask from CSV text
 */
export function computeHourMaskFromCsv(
  csvText: string,
  mapping: { date: string; item: string; quantity: string },
  businessHours?: WeekSchedule,
  timezone = "America/Los_Angeles",
): { hourMaskV1: HourMask; hourMaskCountsV1: HourCounts } {
  console.log("[v0] HourMask: computing mask from CSV (threshold=2)")

  const hourCounts: HourCounts = {
    sun: {},
    mon: {},
    tue: {},
    wed: {},
    thu: {},
    fri: {},
    sat: {},
  }

  const distinctDays: Record<WeekdayKey, Set<string>> = {
    sun: new Set(),
    mon: new Set(),
    tue: new Set(),
    wed: new Set(),
    thu: new Set(),
    fri: new Set(),
    sat: new Set(),
  }

  // Parse CSV
  const lines = csvText.split("\n").filter((line) => line.trim())
  if (lines.length < 2) {
    console.log("[v0] HourMask: CSV too short")
    return { hourMaskV1: {} as HourMask, hourMaskCountsV1: hourCounts }
  }

  const headers = lines[0].split(",").map((h) => h.trim())
  const dateIdx = headers.indexOf(mapping.date)

  if (dateIdx === -1) {
    console.log("[v0] HourMask: date column not found")
    return { hourMaskV1: {} as HourMask, hourMaskCountsV1: hourCounts }
  }

  // Process rows
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",").map((c) => c.trim())
    if (cells.length <= dateIdx) continue

    const timestamp = cells[dateIdx]
    const parsed = parseTimestamp(timestamp, timezone)

    if (parsed) {
      const { weekdayKey, hour, dayKey } = parsed
      hourCounts[weekdayKey][hour] = (hourCounts[weekdayKey][hour] || 0) + 1
      distinctDays[weekdayKey].add(dayKey)
    }
  }

  // Build mask with threshold
  const hourMaskV1: HourMask = {
    sun: [],
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
  }

  const weekdayKeys: WeekdayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]

  for (const weekdayKey of weekdayKeys) {
    // Check if day is open
    const isOpen = businessHours?.[weekdayKey]?.length > 0

    if (!isOpen) {
      hourMaskV1[weekdayKey] = []
      continue
    }

    const dayCount = distinctDays[weekdayKey].size
    const threshold = Math.max(2, Math.ceil(dayCount * 0.4))

    for (const hourStr in hourCounts[weekdayKey]) {
      const hour = Number.parseInt(hourStr)
      const count = hourCounts[weekdayKey][hour]

      if (count >= threshold) {
        hourMaskV1[weekdayKey].push(hour)
      }
    }

    // Sort hours
    hourMaskV1[weekdayKey].sort((a, b) => a - b)
  }

  console.log("[v0] HourMask: computed mask:", hourMaskV1)
  return { hourMaskV1, hourMaskCountsV1: hourCounts }
}

/**
 * Save hour mask to Firestore upload document
 */
export async function saveHourMaskToFirestore(
  userId: string,
  uploadDocId: string,
  hourMaskV1: HourMask,
  hourMaskCountsV1: HourCounts,
): Promise<void> {
  try {
    const uploadRef = doc(db, "users", userId, "uploads", uploadDocId)
    await setDoc(
      uploadRef,
      {
        hourMaskV1,
        hourMaskCountsV1,
        hourMaskUpdatedAt: Date.now(),
      },
      { merge: true },
    )
    console.log("[v0] HourMask: saved mask to Firestore")
  } catch (error) {
    console.warn("[v0] HourMask: failed to save mask to Firestore:", error)
  }
}

/**
 * Load or compute hour mask for the current user
 */
export async function loadOrComputeHourMask(
  userId: string,
  businessHours?: WeekSchedule,
  timezone?: string,
): Promise<HourMask | null> {
  const upload = await fetchLatestUpload(userId)

  if (!upload) {
    console.log("[v0] HourMask: no upload found")
    return null
  }

  // Check if mask already exists
  if (upload.hourMaskV1) {
    console.log("[v0] HourMask: using cached mask from upload doc")
    return upload.hourMaskV1
  }

  // Compute mask from CSV
  if (!upload.csvText || !upload.mapping) {
    console.log("[v0] HourMask: upload missing csvText or mapping")
    return null
  }

  const { hourMaskV1, hourMaskCountsV1 } = computeHourMaskFromCsv(
    upload.csvText,
    upload.mapping,
    businessHours,
    timezone,
  )

  // Save back to Firestore
  if ((upload as any).id) {
    await saveHourMaskToFirestore(userId, (upload as any).id, hourMaskV1, hourMaskCountsV1)
  }

  return hourMaskV1
}
