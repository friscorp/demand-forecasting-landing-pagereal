import * as admin from "firebase-admin"
import type { Request } from "express"

export async function requireAuthUid(req: Request): Promise<string> {
  const auth = req.headers.authorization || ""
  const match = auth.match(/^Bearer (.+)$/)
  if (!match) throw new Error("Missing Authorization Bearer token")

  const token = match[1]
  const decoded = await admin.auth().verifyIdToken(token)
  if (!decoded?.uid) throw new Error("Invalid token (no uid)")
  return decoded.uid
}
