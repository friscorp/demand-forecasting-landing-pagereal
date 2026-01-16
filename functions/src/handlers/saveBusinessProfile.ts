import { Request } from "express";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function getBearerToken(req: Request): string | null {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer (.+)$/);
  return m ? m[1] : null;
}

export async function saveBusinessProfileHandler(req: any, res: any, uid: string) {
  try {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "Method not allowed" });
      return;
    }

    const token = getBearerToken(req);
    if (!token) {
      res.status(401).json({ ok: false, error: "Missing Authorization token" });
      return;
    }

    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const profile = req.body?.profile;
    if (!profile || typeof profile !== "object") {
      res.status(400).json({ ok: false, error: "Missing profile object" });
      return;
    }

    // Required fields (minimal)
    const name = String(profile.name ?? "").trim();
    const industry = String(profile.industry ?? "").trim();
    const location = String(profile.location ?? "").trim();
    if (!name || !industry || !location) {
      res.status(400).json({
        ok: false,
        error: "Missing required fields: name, industry, location",
      });
      return;
    }

    const db = getFirestore();

    // ✅ Recommended: business doc id = uid (no migration required per your note)
    const businessRef = db.collection("businesses").doc(uid);

    // Merge profile fields, never wipe anything.
    // created_at only set if missing (transaction)
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(businessRef);
      const base: Record<string, any> = {
        owner_uid: uid,
        ...profile,
        updated_at: FieldValue.serverTimestamp(),
      };

      if (!snap.exists) {
        base.created_at = FieldValue.serverTimestamp();
      } else if (!snap.get("created_at")) {
        base.created_at = FieldValue.serverTimestamp();
      }

      tx.set(businessRef, base, { merge: true });
    });

    res.status(200).json({ ok: true, business_id: uid });
  } catch (err: any) {
    console.error("saveBusinessProfile error:", err);
    res.status(500).json({ ok: false, error: err?.message ?? "Internal error" });
  }
}
