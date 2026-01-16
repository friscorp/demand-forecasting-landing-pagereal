import Papa from "papaparse"
import { collection, query, orderBy, limit, getDocs, doc, setDoc } from "firebase/firestore"
import { db } from "./firebase"

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

export interface FirestoreBusinessHours {
  sunday?: { enabled: boolean; open: string; close: string }
  monday?: { enabled: boolean; open: string; close: string }
  tuesday?: { enabled: boolean; open: string; close: string }
  wednesday?: { enabled: boolean; open: string; close: string }
  thursday?: { enabled: boolean; open: string; close: string }
  friday?: { enabled: boolean; open: string; close: string }
  saturday?: { enabled: boolean; open: string; close: string }
}

const fullDayToAbbrev: Record<string, WeekdayKey> = {
  sunday: "sun",
  monday: "mon",
  tuesday: "tue",
  wednesday: "wed",
  thursday: "thu",
  friday: "fri",
  saturday: "sat",
}

function convertBusinessHoursToOpenMap(hours?: FirestoreBusinessHours): Record<WeekdayKey, boolean> {
  const result: Record<WeekdayKey, boolean> = {
    sun: true,
    mon: true,
    tue: true,
    wed: true,
    thu: true,
    fri: true,
    sat: true,
  }

  if (!hours) {
    return result
  }

  for (const [fullDay, abbrev] of Object.entries(fullDayToAbbrev)) {
    const dayData = hours[fullDay as keyof FirestoreBusinessHours]
    if (dayData) {
      result[abbrev] = dayData.enabled === true
    }
  }

  return result
}

/**
 * Fetch the latest upload document for a user from Firestore
 */
export async function fetchLatestUpload(userId: string): Promise<UploadDoc | null> {
  try {
    const uploadsRef = collection(db, "users", userId, "uploads")
    const q = query(uploadsRef, orderBy("lastUsedAt", "desc"), limit(1))

    let snapshot = await getDocs(q)

    // Fallback to createdAt if no results with lastUsedAt
    if (snapshot.empty) {
      const qByCreated = query(uploadsRef, orderBy("createdAt", "desc"), limit(1))
      snapshot = await getDocs(qByCreated)
    }

    if (snapshot.empty) {
      return null
    }

    const uploadDoc = snapshot.docs[0]
    const data = uploadDoc.data() as UploadDoc

    return { ...data, id: uploadDoc.id } as any
  } catch (error) {
    console.error("error fetching latest upload:", error)
    return null
  }
}

/**
 * Parse a timestamp from various formats and return weekday + hour
 * Uses local timezone consistently to avoid UTC/local mismatches
 */
function parseTimestamp(
  value: string,
  timezone = "America/Los_Angeles",
): { weekdayKey: WeekdayKey; hour: number; dayKey: string } | null {
  try {
    // Try ISO format first
    let date = new Date(value)

    // If invalid, try M/D/YY H:mm or MM/DD/YYYY HH:mm format
    if (isNaN(date.getTime())) {
      const match = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})/)
      if (match) {
        let [, month, day, year, hour, minute] = match
        // Handle 2-digit year
        if (year.length === 2) {
          year = "20" + year
        }
        date = new Date(
          `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:00`,
        )
      }
    }

    if (isNaN(date.getTime())) {
      return null
    }

    // Get weekday (0=Sunday, 6=Saturday) in local time
    const weekday = date.getDay()
    const weekdayKeys: WeekdayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
    const weekdayKey = weekdayKeys[weekday]

    // Get hour (0-23) in local time
    const hour = date.getHours()

    // Get day key using local date components instead of UTC
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const dayKey = `${year}-${month}-${day}`

    return { weekdayKey, hour, dayKey }
  } catch (error) {
    return null
  }
}

/**
 * Check if a cached hour mask is valid (has at least one hour in any day)
 */
function isHourMaskValid(mask: HourMask): boolean {
  const weekdayKeys: WeekdayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
  for (const day of weekdayKeys) {
    if (mask[day] && mask[day].length > 0) {
      return true
    }
  }
  return false
}

/**
 * Compute hour mask from CSV text
 */
export function computeHourMaskFromCsv(
  csvText: string,
  mapping: { date: string; item: string; quantity: string },
  businessHours?: FirestoreBusinessHours,
  timezone = "America/Los_Angeles",
): { hourMaskV1: HourMask; hourMaskCountsV1: HourCounts } {
  const openDays = convertBusinessHoursToOpenMap(businessHours)

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

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    trimHeaders: true,
    transformHeader: (h) => h.trim(),
  })

  if (parsed.errors.length > 0) {
    console.warn("CSV parse warnings:", parsed.errors)
  }

  const rows = parsed.data as any[]

  if (rows.length === 0) {
    return { hourMaskV1: {} as HourMask, hourMaskCountsV1: hourCounts }
  }

  const dateColumn = mapping.date

  // Process rows
  for (const row of rows) {
    const timestamp = row[dateColumn]
    if (!timestamp) continue

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
    const isOpen = openDays[weekdayKey]

    if (!isOpen) {
      hourMaskV1[weekdayKey] = []
      continue
    }

    const dayCount = distinctDays[weekdayKey].size
    const threshold = Math.max(2, Math.ceil(dayCount * 0.4))

    for (const hourStr in hourCounts[weekdayKey]) {
      const hour = Number.parseInt(hourStr, 10)
      const count = hourCounts[weekdayKey][hour]

      if (count >= threshold) {
        hourMaskV1[weekdayKey].push(hour)
      }
    }

    // Sort hours
    hourMaskV1[weekdayKey].sort((a, b) => a - b)
  }

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
  } catch (error) {
    console.warn("failed to save mask to Firestore:", error)
  }
}

/**
 * Load or compute hour mask for the current user
 */
export async function loadOrComputeHourMask(
  userId: string,
  businessHours?: FirestoreBusinessHours,
  timezone?: string,
): Promise<HourMask | null> {
  const upload = await fetchLatestUpload(userId)

  if (!upload) {
    return null
  }

  // Check if mask already exists AND is valid (has at least one hour)
  if (upload.hourMaskV1 && isHourMaskValid(upload.hourMaskV1)) {
    return upload.hourMaskV1
  }

  // Compute mask from CSV
  if (!upload.csvText || !upload.mapping) {
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
