import { HttpsError } from "firebase-functions/v2/https";
import type { ParsedHourlyRow } from "../util/parseCsvToRowsHourly";

type ProphetPoint = { ds: string; y: number };

function groupToSeries(rows: ParsedHourlyRow[]): Record<string, ProphetPoint[]> {
  // item -> hourISO -> sum
  const agg: Record<string, Record<string, number>> = {};

  for (const r of rows) {
    const item = r.item;
    const hourIso = r.ds.toISOString();
    agg[item] ??= {};
    agg[item][hourIso] = (agg[item][hourIso] ?? 0) + r.quantity;
  }

  const out: Record<string, ProphetPoint[]> = {};
  for (const item of Object.keys(agg)) {
    out[item] = Object.entries(agg[item])
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([ds, y]) => ({ ds, y }));
  }
  return out;
}

async function callProphetHourly(prophetUrl: string, payload: any): Promise<any> {
  const resp = await fetch(prophetUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await resp.text();
  if (!resp.ok) {
    throw new HttpsError("internal", `Prophet hourly error ${resp.status}: ${text}`);
  }
  return JSON.parse(text);
}

export async function generateForecastHourlyPerProduct(
  rows: ParsedHourlyRow[],
  horizonDays: number,
  opts: { prophetUrl?: string; timezone?: string }
) {
  const prophetUrl = opts.prophetUrl;
  if (!prophetUrl) {
    throw new HttpsError("failed-precondition", "Missing PROPHET_HOURLY_URL env var.");
  }

  const items = groupToSeries(rows);

  // Your Cloud Run can generate future hours internally for horizonDays.
  const payload = {
    horizon_days: horizonDays,
    timezone: opts.timezone ?? "America/Los_Angeles",
    items, // { item: [{ds,y}] }
  };

  const prophetResult = await callProphetHourly(prophetUrl, payload);

  // Return a shape that feels like your existing per-product result,
  // but with ds as datetime.
  return {
    mode: "per_product_hourly",
    meta: {
      model: "prophet_hourly_v1",
      timezone: payload.timezone,
      ...(prophetResult?.meta ?? {}),
    },
    results: prophetResult?.results ?? prophetResult, // tolerate slightly different python shapes
  };
}
