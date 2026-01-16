import { onRequest } from "firebase-functions/v2/https"
import * as admin from "firebase-admin"
import { corsWrap } from "../shared/corsWrap"
import { requireAuthUid } from "../shared/requireAuthUid"

export const saveRunHourlyHttp = onRequest(async (req, res) => {
  return corsWrap(req, res, async () => {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" })
    const uid = await requireAuthUid(req)

    const { businessName, mapping, forecast, meta } = req.body ?? {}
    if (!forecast) return res.status(400).json({ error: "Missing forecast" })

    const db = admin.firestore()
    const runsRef = db.collection(`users/${uid}/runs_hourly`)
    const docRef = runsRef.doc()

    await docRef.set({
      business_name: businessName ?? "Business",
      mapping_json: mapping ?? null,
      forecast_json: forecast,
      meta_json: meta ?? null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return res.status(200).json({ id: docRef.id })
  })
})
