import { db } from "./firebase"
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore"

export interface RunDocument {
  id: string
  businessName: string
  mapping: Record<string, string>
  forecast: any
  insights: any | null
  createdAt: string | { seconds: number; nanoseconds: number }
  [key: string]: any
}

/**
 * Query the latest daily run from Firestore users/{uid}/runs collection
 * Orders by createdAt descending and returns the most recent document
 */
export async function getLatestDailyRun(uid: string): Promise<RunDocument | null> {
  try {
    console.log(`[v0] getLatestDailyRun: querying users/${uid}/runs orderBy createdAt desc`)

    const runsQuery = query(collection(db, "users", uid, "runs"), orderBy("createdAt", "desc"), limit(1))

    const snapshot = await getDocs(runsQuery)

    if (snapshot.empty) {
      console.log("[v0] getLatestDailyRun: no runs found")
      return null
    }

    const doc = snapshot.docs[0]
    const data = doc.data()

    console.log(`[v0] getLatestDailyRun: found run ${doc.id} createdAt=${data.createdAt}`)

    return {
      id: doc.id,
      ...data,
    } as RunDocument
  } catch (error: any) {
    if (error.code === "failed-precondition" || error.message?.includes("index")) {
      console.warn("[v0] getLatestDailyRun: createdAt query failed, trying fallback without ordering")
      try {
        const fallbackQuery = query(collection(db, "users", uid, "runs"), limit(1))
        const snapshot = await getDocs(fallbackQuery)

        if (snapshot.empty) {
          return null
        }

        const doc = snapshot.docs[0]
        return {
          id: doc.id,
          ...doc.data(),
        } as RunDocument
      } catch (fallbackError) {
        console.error("[v0] getLatestDailyRun: fallback query also failed:", fallbackError)
        return null
      }
    }

    console.error("[v0] getLatestDailyRun: error querying runs:", error)
    throw error
  }
}

/**
 * Query the latest hourly run from Firestore users/{uid}/runs_hourly collection
 * Orders by createdAt descending and returns the most recent document
 */
export async function getLatestHourlyRun(uid: string): Promise<RunDocument | null> {
  try {
    console.log(`[v0] getLatestHourlyRun: querying users/${uid}/runs_hourly orderBy createdAt desc`)

    const runsQuery = query(collection(db, "users", uid, "runs_hourly"), orderBy("createdAt", "desc"), limit(1))

    const snapshot = await getDocs(runsQuery)

    if (snapshot.empty) {
      console.log("[v0] getLatestHourlyRun: no hourly runs found")
      return null
    }

    const doc = snapshot.docs[0]
    const data = doc.data()

    console.log(`[v0] getLatestHourlyRun: found run ${doc.id} createdAt=${data.createdAt}`)

    return {
      id: doc.id,
      ...data,
    } as RunDocument
  } catch (error: any) {
    if (error.code === "failed-precondition" || error.message?.includes("index")) {
      console.warn("[v0] getLatestHourlyRun: createdAt query failed, trying fallback without ordering")
      try {
        const fallbackQuery = query(collection(db, "users", uid, "runs_hourly"), limit(1))
        const snapshot = await getDocs(fallbackQuery)

        if (snapshot.empty) {
          return null
        }

        const doc = snapshot.docs[0]
        return {
          id: doc.id,
          ...doc.data(),
        } as RunDocument
      } catch (fallbackError) {
        console.error("[v0] getLatestHourlyRun: fallback query also failed:", fallbackError)
        return null
      }
    }

    console.error("[v0] getLatestHourlyRun: error querying hourly runs:", error)
    throw error
  }
}
