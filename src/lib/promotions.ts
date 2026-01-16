import { db } from "./firebase"
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  getDocs,
  serverTimestamp,
  setDoc,
  orderBy,
} from "firebase/firestore"
import type { Promotion } from "./applyPromotionsToForecast"

/**
 * Strip undefined values from an object (Firestore doesn't allow undefined)
 */
function stripUndefined<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export interface PromotionInput {
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
}

/**
 * Save a new promotion to Firestore and mark it as the last applied
 */
export async function savePromotion(uid: string, promotionData: PromotionInput): Promise<string> {
  const promotionsRef = collection(db, "users", uid, "promotions")

  const newPromo = stripUndefined({
    status: "active",
    item: promotionData.item ?? null,
    start: promotionData.start,
    end: promotionData.end,
    offer: promotionData.offer ?? null,
    channel: promotionData.channel ?? null,
    multiplier: promotionData.multiplier,
    confidence: promotionData.confidence,
    rating_0to10: promotionData.rating_0to10,
    metrics: {
      expectedLiftPct: promotionData.metrics?.expectedLiftPct ?? 0,
      baselineUnitsEstimate: promotionData.metrics?.baselineUnitsEstimate ?? null,
      promoUnitsEstimate: promotionData.metrics?.promoUnitsEstimate ?? null,
    },
    warnings: promotionData.warnings ?? [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  const docRef = await addDoc(promotionsRef, newPromo)

  // Update meta pointer
  const metaRef = doc(db, "users", uid, "meta", "promotions")
  await setDoc(
    metaRef,
    {
      lastAppliedPromotionId: docRef.id,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )

  return docRef.id
}

/**
 * Get all active promotions for a user
 */
export async function getActivePromotions(uid: string): Promise<Promotion[]> {
  const promotionsRef = collection(db, "users", uid, "promotions")
  const q = query(promotionsRef, where("status", "==", "active"), orderBy("createdAt", "desc"))

  const snapshot = await getDocs(q)
  const promotions: Promotion[] = []

  snapshot.forEach((doc) => {
    promotions.push({
      id: doc.id,
      ...doc.data(),
    } as Promotion)
  })

  return promotions
}

/**
 * Get all promotions (active and inactive) for display/management
 */
export async function getAllPromotions(uid: string): Promise<Promotion[]> {
  const promotionsRef = collection(db, "users", uid, "promotions")
  const q = query(promotionsRef, orderBy("createdAt", "desc"))

  const snapshot = await getDocs(q)
  const promotions: Promotion[] = []

  snapshot.forEach((doc) => {
    promotions.push({
      id: doc.id,
      ...doc.data(),
    } as Promotion)
  })

  return promotions
}

/**
 * Deactivate a promotion
 */
export async function deactivatePromotion(uid: string, promotionId: string): Promise<void> {
  const promoRef = doc(db, "users", uid, "promotions", promotionId)
  await updateDoc(promoRef, {
    status: "inactive",
    updatedAt: serverTimestamp(),
  })
}

/**
 * Reactivate a promotion
 */
export async function reactivatePromotion(uid: string, promotionId: string): Promise<void> {
  const promoRef = doc(db, "users", uid, "promotions", promotionId)
  await updateDoc(promoRef, {
    status: "active",
    updatedAt: serverTimestamp(),
  })

  // Update meta pointer
  const metaRef = doc(db, "users", uid, "meta", "promotions")
  await setDoc(
    metaRef,
    {
      lastAppliedPromotionId: promotionId,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}
