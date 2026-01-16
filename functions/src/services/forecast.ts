import { ForecastResponse, ForecastItemResult, ForecastPoint } from "../models/types";
import { ParsedRow } from "./csv";
import { PROPHET_URL } from "../env"; // adjust path if needed




type DailyPoint = { ds: string; y: number };



function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekdayIdx(iso: string): number {
  // 0=Sun..6=Sat in UTC
  return new Date(iso + "T00:00:00Z").getUTCDay();
}

function daysBetweenInclusive(startISO: string, endISO: string): number {
  const a = new Date(startISO + "T00:00:00Z").getTime();
  const b = new Date(endISO + "T00:00:00Z").getTime();
  return Math.floor((b - a) / 86400000) + 1;
}

function aggregateDaily(series: Array<{ ds: Date; qty: number }>): DailyPoint[] {
  const map = new Map<string, number>();
  for (const p of series) {
    const iso = toISODate(p.ds);
    map.set(iso, (map.get(iso) ?? 0) + (Number(p.qty) || 0));
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ds, y]) => ({ ds, y }));
}

function baselineWeekdayMean(daily: DailyPoint[], horizonDays: number): ForecastPoint[] {
  // Build weekday buckets of historical y values.
  const buckets: number[][] = Array.from({ length: 7 }, () => []);
  for (const p of daily) buckets[weekdayIdx(p.ds)].push(p.y);

  // Overall mean as fallback
  const all = daily.map((p) => p.y);
  const overall = all.reduce((s, v) => s + v, 0) / Math.max(all.length, 1);

  const lastDate = daily[daily.length - 1].ds;

  const forecast: ForecastPoint[] = [];
  for (let i = 1; i <= horizonDays; i++) {
    const ds = addDays(lastDate, i);
    const w = weekdayIdx(ds);
    const arr = buckets[w];
    const mean =
      arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : overall;

    forecast.push({
      ds,
      yhat: Number(mean.toFixed(4)),
      yhat_lower: Number((mean * 0.8).toFixed(4)),
      yhat_upper: Number((mean * 1.2).toFixed(4)),
    });
  }
  return forecast;
}

/**
 * Calls the Prophet microservice (Cloud Run) and returns forecasts per item.
 * You will set PROPHET_URL in your Firebase env/config.
 */
async function callProphet(items: Record<string, DailyPoint[]>, horizonDays: number) {
    const url = PROPHET_URL.value();
    if (!url) throw new Error("Missing PROPHET_URL");
  
    const payload = { horizon_days: horizonDays, items };
  
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Prophet service error (${resp.status}): ${text}`);
  }

  const data = (await resp.json()) as any;

  // Expected:
  // { results: { [item]: { forecast: [{ds,yhat,yhat_lower,yhat_upper}] } } }
  const results: Record<string, ForecastItemResult> = {};
  for (const [item, v] of Object.entries<any>(data.results ?? {})) {
    results[item] = {
      meta: { model: "prophet_v1", regressors: [] },
      forecast: (v.forecast ?? []).map((p: any) => ({
        ds: String(p.ds),
        yhat: Number(p.yhat),
        yhat_lower: Number(p.yhat_lower),
        yhat_upper: Number(p.yhat_upper),
      })),
    };
  }
  return results;
}

export async function generateForecastPerProduct(
  rows: ParsedRow[],
  horizonDays: number
): Promise<ForecastResponse> {
  // Group by item
  const perItem = new Map<string, Array<{ ds: Date; qty: number }>>();
  for (const r of rows) {
    if (!perItem.has(r.item)) perItem.set(r.item, []);
    perItem.get(r.item)!.push({ ds: r.ds, qty: r.quantity });
  }

  if (perItem.size === 0) return { mode: "per_product", results: {} };

  // Prepare daily series per item + compute max history span
  const dailyByItem: Record<string, DailyPoint[]> = {};
  let maxHistoryDays = 0;

  for (const [item, series] of perItem.entries()) {
    series.sort((a, b) => a.ds.getTime() - b.ds.getTime());
    const daily = aggregateDaily(series);
    dailyByItem[item] = daily;

    if (daily.length >= 2) {
      const span = daysBetweenInclusive(daily[0].ds, daily[daily.length - 1].ds);
      if (span > maxHistoryDays) maxHistoryDays = span;
    } else if (daily.length === 1) {
      maxHistoryDays = Math.max(maxHistoryDays, 1);
    }
  }

  // ROUTING RULE:
  // < 28 days => baseline weekday mean
  // >= 28 days => prophet
  if (maxHistoryDays < 28) {
    const results: Record<string, ForecastItemResult> = {};
    for (const [item, daily] of Object.entries(dailyByItem)) {
      results[item] = {
        meta: { model: "baseline_weekday_mean", regressors: [] },
        forecast: baselineWeekdayMean(daily, horizonDays),
      };
    }
    return { mode: "per_product", results };
  }

  // Prophet path
  const prophetResults = await callProphet(dailyByItem, horizonDays);
  return { mode: "per_product", results: prophetResults };
}
