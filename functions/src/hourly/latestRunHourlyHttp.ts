import { onRequest } from "firebase-functions/v2/https"
import * as admin from "firebase-admin"
import { corsWrap } from "../shared/corsWrap"
import { requireAuthUid } from "../shared/requireAuthUid"

export const latestRunHourlyHttp = onRequest(async (req, res) => {
  return corsWrap(req, res, async () => {
    if (req.method !== "GET") return res.status(405).json({ error: "GET only" })
    const uid = await requireAuthUid(req)

    const db = admin.firestore()
    const q = await db
      .collection(`users/${uid}/runs_hourly`)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get()

    if (q.empty) return res.status(404).json({ error: "No hourly runs found" })

    const doc = q.docs[0]
    const data = doc.data() as any

    return res.status(200).json({
      id: doc.id,
      businessName: data.business_name,
      mapping: data.mapping_json,
      forecast: data.forecast_json,
      meta: data.meta_json,
      createdAt: data.createdAt,
    })
  })
})
