import type { Request, Response } from "express"

const ALLOW_ORIGIN = "*" // temp

export async function corsWrap(req: Request, res: Response, fn: () => Promise<any>) {
  res.setHeader("Access-Control-Allow-Origin", ALLOW_ORIGIN)
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Shared-Secret")
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")

  if (req.method === "OPTIONS") {
    res.status(204).send("")
    return
  }

  try {
    await fn()
  } catch (e: any) {
    console.error("[v0] Error:", e?.message ?? e)
    res.status(500).json({ error: e?.message ?? "Internal error" })
  }
}
