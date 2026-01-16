/* eslint-disable @typescript-eslint/no-explicit-any */

import Papa from "papaparse";
import { ColumnMapping } from "../models/types";

export type ParsedRow = {
  ds: Date;       // date bucket (day)
  item: string;
  quantity: number;
};

function parseDateLoose(value: string): Date | null {
  const v = (value ?? "").toString().trim();
  if (!v) return null;

  // Try ISO (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)
  const iso = new Date(v);
  if (!Number.isNaN(iso.getTime())) return iso;

  // Try common formats from your python: %m/%d/%Y, %m-%d-%Y, %Y/%m/%d
  // Minimal parser for m/d/Y and m-d-Y and Y/m/d
  const tryMDY = (sep: string) => {
    const parts = v.split(sep);
    if (parts.length !== 3) return null;
    const [a, b, c] = parts.map((x) => x.trim());
    // m/d/Y
    const m = Number(a), d = Number(b), y = Number(c);
    if ([m, d, y].some((n) => Number.isNaN(n))) return null;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  const tryYMD = (sep: string) => {
    const parts = v.split(sep);
    if (parts.length !== 3) return null;
    const [a, b, c] = parts.map((x) => x.trim());
    // Y/m/d
    const y = Number(a), m = Number(b), d = Number(c);
    if ([m, d, y].some((n) => Number.isNaN(n))) return null;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  return tryMDY("/") ?? tryMDY("-") ?? tryYMD("/") ?? null;
}

function toDayBucketUTC(dt: Date): Date {
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
}

export function parseCsvToRows(csvText: string, mapping: ColumnMapping): ParsedRow[] {
  const parsed = Papa.parse<Record<string, any>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors?.length) {
    // We’ll be forgiving like your Python (skip bad rows), but fail if totally broken
    // eslint-disable-next-line no-console
    console.warn("CSV parse warnings:", parsed.errors.slice(0, 3));
  }

  const rows: ParsedRow[] = [];
  for (const r of parsed.data ?? []) {
    try {
      const dsRaw = r[mapping.date];
      const itemRaw = r[mapping.item];
      const qtyRaw = r[mapping.quantity];

      const dt = parseDateLoose(String(dsRaw ?? ""));
      if (!dt) continue;

      const item = String(itemRaw ?? "").trim();
      if (!item) continue;

      const qty = Number(String(qtyRaw ?? "").trim() || "0");
      if (Number.isNaN(qty)) continue;

      rows.push({
        ds: toDayBucketUTC(dt),
        item,
        quantity: qty,
      });
    } catch {
      continue;
    }
  }

  return rows;
}
