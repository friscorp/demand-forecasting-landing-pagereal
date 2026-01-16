/* eslint-disable @typescript-eslint/no-explicit-any */

import Papa from "papaparse";
import { ColumnMapping } from "../models/types";

export type ParsedHourlyRow = {
  ds: Date; // hour bucket (UTC)
  item: string;
  quantity: number;
};

function parseDateLooseWithTime(value: string): Date | null {
  const v = (value ?? "").toString().trim();
  if (!v) return null;

  // 1) Try native Date parsing (ISO timestamps etc.)
  const iso = new Date(v);
  if (!Number.isNaN(iso.getTime())) return iso;

  // 2) Try formats like:
  // - "1/14/2026 9:13"
  // - "01/14/2026 09:13"
  // - "1/14/2026 9:13 AM"
  // - "1-14-2026 21:05"
  const tryMDYWithTime = (dateSep: string) => {
    const [datePart, timePartRaw] = v.split(/\s+/, 2);
    if (!datePart || !timePartRaw) return null;

    const dateParts = datePart.split(dateSep);
    if (dateParts.length !== 3) return null;

    const m = Number(dateParts[0]);
    const d = Number(dateParts[1]);
    const y = Number(dateParts[2]);
    if ([m, d, y].some((n) => Number.isNaN(n))) return null;

    // timePart might be "9:13" or "9:13" plus AM/PM in remainder
    // Get remaining pieces after datePart
    const rest = v.slice(datePart.length).trim(); // "9:13 AM" etc.
    const mTime = rest.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (!mTime) return null;

    let hh = Number(mTime[1]);
    const mm = Number(mTime[2]);
    const ss = mTime[3] ? Number(mTime[3]) : 0;
    const ampm = (mTime[4] ?? "").toUpperCase();

    if ([hh, mm, ss].some((n) => Number.isNaN(n))) return null;

    // Handle AM/PM
    if (ampm) {
      if (hh === 12) hh = 0;
      if (ampm === "PM") hh += 12;
    }

    const dt = new Date(Date.UTC(y, m - 1, d, hh, mm, ss));
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  // 3) Fall back to your original day-only date formats (no time) as last resort
  // (If user only has dates, hour bucket becomes midnight UTC)
  const tryMDY = (sep: string) => {
    const parts = v.split(sep);
    if (parts.length !== 3) return null;
    const [a, b, c] = parts.map((x) => x.trim());
    const m = Number(a), d = Number(b), y = Number(c);
    if ([m, d, y].some((n) => Number.isNaN(n))) return null;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  const tryYMD = (sep: string) => {
    const parts = v.split(sep);
    if (parts.length !== 3) return null;
    const [a, b, c] = parts.map((x) => x.trim());
    const y = Number(a), m = Number(b), d = Number(c);
    if ([m, d, y].some((n) => Number.isNaN(n))) return null;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  return (
    tryMDYWithTime("/") ??
    tryMDYWithTime("-") ??
    tryMDY("/") ??
    tryMDY("-") ??
    tryYMD("/") ??
    null
  );
}

function toHourBucketUTC(dt: Date): Date {
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), dt.getUTCHours(), 0, 0));
}

export function parseCsvToRowsHourly(csvText: string, mapping: ColumnMapping): ParsedHourlyRow[] {
  const parsed = Papa.parse<Record<string, any>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors?.length) {
    // Be forgiving (skip bad rows), but warn.
    console.warn("CSV parse warnings:", parsed.errors.slice(0, 3));
  }

  const rows: ParsedHourlyRow[] = [];
  for (const r of parsed.data ?? []) {
    try {
      const dsRaw = r[mapping.date];
      const itemRaw = r[mapping.item];
      const qtyRaw = r[mapping.quantity];

      const dt = parseDateLooseWithTime(String(dsRaw ?? ""));
      if (!dt) continue;

      const item = String(itemRaw ?? "").trim();
      if (!item) continue;

      const qty = Number(String(qtyRaw ?? "").trim() || "0");
      if (Number.isNaN(qty)) continue;

      rows.push({
        ds: toHourBucketUTC(dt),
        item,
        quantity: qty,
      });
    } catch {
      continue;
    }
  }

  return rows;
}
