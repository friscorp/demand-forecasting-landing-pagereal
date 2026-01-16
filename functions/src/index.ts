import { onRequest, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import crypto from "crypto";
import { saveBusinessProfileHandler } from "./handlers/saveBusinessProfile";
import { generateForecastHourlyPerProduct } from "./hourly/generateForecastHourlyPerProduct";
import { parseCsvToRowsHourly } from "./util/parseCsvToRowsHourly";
import { HOURLY_PROPHET_URL } from "./env";


import { parseCsvToRows } from "./services/csv";
import { generateForecastPerProduct } from "./services/forecast";

// If you have types in ./models/types you can keep them; not required for runtime.
// import { ColumnMapping } from "./models/types";

admin.initializeApp();
const db = admin.firestore();

/**
 * CORS: allow your v0 domain + localhost.
 * Add/remove origins as needed.
 */
const ALLOWED_ORIGINS = new Set<string>([
  "https://v0-demand-forecasting-landing-page.vercel.app",
  "http://localhost:5173",
  "https://v0-demand-forecasting-git-3f0a64-aarushvilvaray-8694s-projects.vercel.app",
  "http://localhost:3000",
]);

function applyCors(req: any, res: any): boolean {
  const origin = req.headers.origin as string | undefined;

  // Reflect origin if allowed; otherwise omit (or choose a default).
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  // If you need cookies later, keep this true. With Bearer tokens it’s optional.
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  // Handle preflight
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true;
  }
  return false;
}

function readJsonBody(req: any) {
  // firebase onRequest usually parses JSON automatically,
  // but this is defensive.
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

function httpStatusFromHttpsErrorCode(code: string): number {
  switch (code) {
    case "invalid-argument":
      return 400;
    case "unauthenticated":
      return 401;
    case "permission-denied":
      return 403;
    case "not-found":
      return 404;
    case "already-exists":
      return 409;
    case "failed-precondition":
      return 412;
    case "resource-exhausted":
      return 429;
    case "unavailable":
      return 503;
    case "deadline-exceeded":
      return 504;
    default:
      return 500;
  }
}

function sendError(res: any, err: unknown) {
  if (err instanceof HttpsError) {
    res.status(httpStatusFromHttpsErrorCode(err.code)).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details ?? null,
      },
    });
    return;
  }

  res.status(500).json({
    error: {
      code: "internal",
      message: (err as any)?.message ?? "Internal error",
    },
  });
}

/**
 * HTTP auth: expects Authorization: Bearer <Firebase ID token>
 * (Unlike callable functions, onRequest does NOT automatically include auth.)
 */
async function requireAuthHttp(req: any): Promise<{ uid: string; email: string | null }> {
  const authHeader = String(req.headers.authorization ?? "");
  const match = authHeader.match(/^Bearer (.+)$/);

  if (!match) {
    throw new HttpsError(
      "unauthenticated",
      "Missing Authorization header. Expected: Bearer <idToken>"
    );
  }

  try {
    const decoded = await admin.auth().verifyIdToken(match[1]);
    return { uid: decoded.uid, email: decoded.email ?? null };
  } catch {
    throw new HttpsError("unauthenticated", "Invalid/expired auth token.");
  }
}

async function getOrCreateBusiness(uid: string, businessName?: string) {
    const ref = db.doc(`users/${uid}/business/profile`);
    const snap = await ref.get();
  
    if (!snap.exists) {
      await ref.set(
        {
          // Only set name on first create (optional)
          name: businessName ?? "",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } else {
      // IMPORTANT: do not overwrite wizard data on ingest
      await ref.set(
        { updatedAt: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );
    }
  
    return ref;
  }

/**
 * POST /ingestCsv
 * Body: { csvText, mapping: {date,item,quantity}, businessName? }
 * Response: { businessId, fileHash, rowsInserted, deduped }
 */
export const ingestCsv = onRequest({ region: "us-central1" }, async (req, res): Promise<void> => {
  try {
    if (applyCors(req, res)) return;
    if (req.method !== "POST") {
         res.status(405).send("Method Not Allowed");
         return
        }

    const { uid } = await requireAuthHttp(req);

    const body = readJsonBody(req);
    const csvText = String(body?.csvText ?? "");
    const mapping = body?.mapping as { date?: string; item?: string; quantity?: string } | undefined;
    const businessName = body?.businessName ? String(body.businessName) : undefined;

    if (!csvText.trim()) throw new HttpsError("invalid-argument", "Empty csvText.");
    if (!mapping?.date || !mapping?.item || !mapping?.quantity) {
      throw new HttpsError("invalid-argument", "Invalid mapping. Expected {date,item,quantity}.");
    }

    const businessRef = await getOrCreateBusiness(uid, businessName);

    const fileHash = crypto.createHash("sha256").update(csvText, "utf8").digest("hex");
    const uploadRef = db.doc(`users/${uid}/uploads/${fileHash}`);
    const existing = await uploadRef.get();

    if (existing.exists) {
      // Refresh + mark as used (your existing callable did similar merging :contentReference[oaicite:1]{index=1})
      await uploadRef.set(
        {
          businessRef: businessRef.path,
          fileHash,
          mapping,
          csvText, // TEMP: move to Storage later
          lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    res.json({
        businessId: businessRef.id,
        fileHash,
        rowsInserted: 0,
        deduped: true,
      });
    return
    }

    const rows = parseCsvToRows(csvText, mapping as any);
    if (!rows.length) {
      throw new HttpsError("failed-precondition", "No usable rows found after parsing.");
    }

    await uploadRef.set({
      businessRef: businessRef.path,
      fileHash,
      mapping,
      csvText, // TEMP: move to Storage later
      rowsCount: rows.length,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({
      businessId: businessRef.id,
      fileHash,
      rowsInserted: rows.length,
      deduped: false,
    });
    return
  } catch (e) {
    sendError(res, e);
    return
  }
});

export const saveBusinessProfile = onRequest(
    { region: "us-central1" },
    async (req, res): Promise<void> => {
      try {
        if (applyCors(req, res)) return;
        if (req.method !== "POST") {
          res.status(405).send("Method Not Allowed");
          return;
        }
  
        // Require auth like your other endpoints
        const { uid } = await requireAuthHttp(req);
  
        // Call the handler but pass uid via req (or just inline the logic there)
        // Easiest: modify handler signature to accept uid (recommended).
        await saveBusinessProfileHandler(req, res, uid);
        return;
      } catch (e) {
        return sendError(res, e);
      }
    }
  );
  
  

/**
 * POST /forecast
 * Body: { csvText, mapping, horizonDays? }
 * Response: { mode, results }
 */
export const forecast = onRequest(
    { region: "us-central1", secrets: ["PROPHET_URL"]},
    async (req, res): Promise<void> => {
  try {
    if (applyCors(req, res)) return;
    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return
}

    await requireAuthHttp(req);

    const body = readJsonBody(req);
    const csvText = String(body?.csvText ?? "");
    const mapping = body?.mapping as { date?: string; item?: string; quantity?: string } | undefined;
    const horizonDays = Number(body?.horizonDays ?? 7);

    if (!csvText.trim()) throw new HttpsError("invalid-argument", "Empty csvText.");
    if (!mapping?.date || !mapping?.item || !mapping?.quantity) {
      throw new HttpsError("invalid-argument", "Invalid mapping. Expected {date,item,quantity}.");
    }

    const rows = parseCsvToRows(csvText, mapping as any);
    if (!rows.length) throw new HttpsError("failed-precondition", "No usable rows found after parsing.");

    const result = await generateForecastPerProduct(rows, horizonDays);
    res.json(result);
    return
  } catch (e) {
    return sendError(res, e);
  }
});

/**
 * POST /forecastFromDb
 * Body: { horizonDays? }
 * Response: { mode, results }
 */
export const forecastFromDb = onRequest({ region: "us-central1", secrets: ["PROPHET_URL"] }, async (req, res): Promise<void> => {
  try {
    if (applyCors(req, res)) return;
    if (req.method !== "POST") { 
        res.status(405).send("Method Not Allowed");
        return
    }

    const { uid } = await requireAuthHttp(req);

    const body = readJsonBody(req);
    const horizonDays = Number(body?.horizonDays ?? 7);

    // Your callable used orderBy lastUsedAt + createdAt :contentReference[oaicite:2]{index=2}
    // This single-field order is simpler and avoids composite index friction:
    const tryLatest = async (field: "lastUsedAt" | "createdAt") =>
  db.collection(`users/${uid}/uploads`).orderBy(field, "desc").limit(1).get();

let uploadsSnap = await tryLatest("lastUsedAt");
if (uploadsSnap.empty) uploadsSnap = await tryLatest("createdAt");


    if (uploadsSnap.empty) {
      throw new HttpsError("failed-precondition", "No uploaded CSV found. Ingest CSV first.");
    }

    const uploadDoc = uploadsSnap.docs[0];
    const upload = uploadDoc.data() as any;

    const mapping = upload.mapping as { date?: string; item?: string; quantity?: string } | undefined;
    const csvText = String(upload.csvText ?? "");

    if (!mapping?.date || !mapping?.item || !mapping?.quantity) {
      throw new HttpsError("failed-precondition", "No valid column mapping found. Upload CSV and map columns first.");
    }
    if (!csvText.trim()) {
      throw new HttpsError(
        "failed-precondition",
        "CSV not stored with upload (or too large). Move CSV to Storage and update forecastFromDb."
      );
    }

    await uploadDoc.ref.set(
      { lastUsedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );

    const rows = parseCsvToRows(csvText, mapping as any);
    if (!rows.length) throw new HttpsError("failed-precondition", "No usable rows found after parsing.");

    const result = await generateForecastPerProduct(rows, horizonDays);
    res.json(result);
    return
  } catch (e) {
    return sendError(res, e);
  }
});

/**
 * POST /saveRun
 * Body: { businessName, mapping, forecast, insights? }
 * Response: { id, businessName, mapping, forecast, insights, createdAt }
 */
export const saveRun = onRequest({ region: "us-central1" }, async (req, res): Promise<void> => {
  try {
    if (applyCors(req, res)) return;
    if (req.method !== "POST") {
         res.status(405).send("Method Not Allowed");
         return
    }

    const { uid } = await requireAuthHttp(req);

    const body = readJsonBody(req);
    const businessName = body?.businessName ? String(body.businessName) : "";
    const mapping = body?.mapping ?? null;
    const forecast = body?.forecast ?? null;
    const insights = body?.insights ?? null;

    if (!businessName) throw new HttpsError("invalid-argument", "Missing businessName.");
    if (!mapping) throw new HttpsError("invalid-argument", "Missing mapping.");
    if (!forecast) throw new HttpsError("invalid-argument", "Missing forecast.");

    const ref = await db.collection(`users/${uid}/runs`).add({
      businessName,
      mapping,
      forecast,
      insights: insights ?? null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({
      id: ref.id,
      businessName,
      mapping,
      forecast,
      insights: insights ?? null,
      createdAt: new Date().toISOString(),
    });
    return
  } catch (e) {
    return sendError(res, e);
  }
});

export const forecastHourlyFromDbHttp = onRequest(
  { region: "us-central1", secrets: [HOURLY_PROPHET_URL] },
  async (req, res): Promise<void> => {
  try {
    if (applyCors(req, res)) return;
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const { uid } = await requireAuthHttp(req);

    const body = readJsonBody(req);
    const horizonDays = Number(body?.horizonDays ?? 7);

    // Same “latest upload” selection logic as your daily endpoint
    let uploadsSnap = await db
      .collection(`users/${uid}/uploads`)
      .orderBy("lastUsedAt", "desc")
      .limit(1)
      .get();

    if (uploadsSnap.empty) {
      uploadsSnap = await db
        .collection(`users/${uid}/uploads`)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();
    }

    if (uploadsSnap.empty) {
      throw new HttpsError("failed-precondition", "No uploaded CSV found. Ingest CSV first.");
    }

    const uploadDoc = uploadsSnap.docs[0];
    const upload = uploadDoc.data() as any;

    const mapping = upload.mapping as { date?: string; item?: string; quantity?: string } | undefined;
    const csvText = String(upload.csvText ?? "");

    if (!mapping?.date || !mapping?.item || !mapping?.quantity) {
      throw new HttpsError("failed-precondition", "No valid column mapping found. Upload CSV and map columns first.");
    }
    if (!csvText.trim()) {
      throw new HttpsError(
        "failed-precondition",
        "CSV not stored with upload (or too large). Move CSV to Storage and update forecastHourlyFromDb."
      );
    }

    await uploadDoc.ref.set(
      { lastUsedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );

    // NEW: hourly parser (keeps hour bucket)
    const rows = parseCsvToRowsHourly(csvText, mapping as any);
    if (!rows.length) throw new HttpsError("failed-precondition", "No usable rows found after parsing (hourly).");

    // Optional: if you have timezone in business profile later, pass it in here.
    const timezone = "America/Los_Angeles";

    const result = await generateForecastHourlyPerProduct(rows, horizonDays, {
      prophetUrl: HOURLY_PROPHET_URL.value(),
      timezone,
    });

    res.json(result);
    return;
  } catch (e) {
    return sendError(res, e);
  }
});

export const applyAdjustmentsHourlyHttp = onRequest(
  { region: "us-central1" },
  async (req, res): Promise<void> => {
    try {
      if (applyCors(req, res)) return;
      if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      const { uid } = await requireAuthHttp(req);
      const body = readJsonBody(req);

      const baseRunId = body?.baseRunId;
      const windows = body?.adjustments?.windows ?? [];

      if (!baseRunId) {
        throw new HttpsError("invalid-argument", "Missing baseRunId.");
      }

      const baseRef = db.doc(`users/${uid}/runs_hourly/${baseRunId}`);
      const baseSnap = await baseRef.get();

      if (!baseSnap.exists) {
        throw new HttpsError("not-found", "Base hourly run not found.");
      }

      const baseData = baseSnap.data() as any;
      const baseForecast = baseData.forecast;

      if (!baseForecast?.results) {
        throw new HttpsError("failed-precondition", "Invalid base forecast format.");
      }

      // Deep copy so we don’t mutate base
      const adjustedForecast = JSON.parse(JSON.stringify(baseForecast));

      for (const [item, itemData] of Object.entries<any>(adjustedForecast.results)) {
        const rows = itemData.forecast ?? [];
        for (const row of rows) {
          const ds = new Date(row.ds).getTime();

          for (const w of windows) {
            if (w.item && w.item !== item) continue;

            const start = new Date(w.start).getTime();
            const end = new Date(w.end).getTime();

            if (ds >= start && ds <= end) {
              const m = Number(w.multiplier ?? 1);
              row.yhat *= m;
              if (row.yhat_lower != null) row.yhat_lower *= m;
              if (row.yhat_upper != null) row.yhat_upper *= m;
            }
          }
        }
      }

      const ref = await db.collection(`users/${uid}/runs_hourly`).add({
        businessName: baseData.businessName ?? "Business",
        mapping: baseData.mapping ?? null,
        baseRunId,
        forecast_base: baseForecast,
        forecast: adjustedForecast,
        adjustmentsApplied: windows,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({ id: ref.id });
      return;
    } catch (e) {
      return sendError(res, e);
    }
  }
);


export const saveRunHourlyHttp = onRequest({ region: "us-central1" }, async (req, res): Promise<void> => {
  try {
    if (applyCors(req, res)) return;
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const { uid } = await requireAuthHttp(req);
    const body = readJsonBody(req);

    const businessName = body?.businessName ?? "Business";
    const mapping = body?.mapping ?? null;
    const forecast = body?.forecast ?? body?.results ?? null;
    const meta = body?.meta ?? null;

    if (!forecast) {
      throw new HttpsError("invalid-argument", "Missing forecast/results in request body.");
    }

    const docRef = await db.collection(`users/${uid}/runs_hourly`).add({
      businessName,
      mapping,
      forecast,
      meta,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ id: docRef.id });
    return;
  } catch (e) {
    return sendError(res, e);
  }
});

export const ingestHistoryHourlyFromLatestUploadHttp = onRequest(
  { region: "us-central1" },
  async (req, res): Promise<void> => {
    try {
      if (applyCors(req, res)) return;
      if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      const { uid } = await requireAuthHttp(req);

      const uploadsSnap = await db
        .collection(`users/${uid}/uploads`)
        .orderBy("lastUsedAt", "desc")
        .limit(1)
        .get();

      if (uploadsSnap.empty) {
        throw new HttpsError("failed-precondition", "No uploaded CSV found.");
      }

      const uploadDoc = uploadsSnap.docs[0];
      const upload = uploadDoc.data() as any;

      const mapping = upload.mapping;
      const csvText = String(upload.csvText ?? "");
      if (!mapping || !csvText) {
        throw new HttpsError("failed-precondition", "Upload missing mapping or csvText.");
      }

      const rows = parseCsvToRowsHourly(csvText, mapping as any);

      const batch = db.batch();
      let written = 0;

      for (const r of rows) {
        const d = r.ds;
        const y = r.quantity;

        const dayKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        const monthDay = `${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

        const ref = db
          .collection(`users/${uid}/history_hourly`)
          .doc(`${uploadDoc.id}_${r.item}_${d.toISOString()}`);

        batch.set(ref, {
          item: r.item,
          ds: admin.firestore.Timestamp.fromDate(d),
          y,
          dayKey,
          monthDay,
          year: d.getFullYear(),
          weekday: d.getDay(),
          hour: d.getHours(),
          sourceUploadId: uploadDoc.id,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        written++;
      }

      await batch.commit();

      res.json({ ingested: written });
      return;
    } catch (e) {
      return sendError(res, e);
    }
  }
);

export const compareDayAcrossYearsHourlyHttp = onRequest(
  { region: "us-central1" },
  async (req, res): Promise<void> => {
    try {
      if (applyCors(req, res)) return;
      if (req.method !== "GET") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      const { uid } = await requireAuthHttp(req);

      const item = String(req.query.item ?? "");
      const monthDay = String(req.query.monthDay ?? "");

      if (!item || !monthDay) {
        throw new HttpsError("invalid-argument", "Missing item or monthDay.");
      }

      const snap = await db
        .collection(`users/${uid}/history_hourly`)
        .where("item", "==", item)
        .where("monthDay", "==", monthDay)
        .get();

      const byYear: Record<string, any[]> = {};

      snap.forEach(doc => {
        const d = doc.data();
        const year = String(d.year);
        byYear[year] ??= [];
        byYear[year].push({
          ds: d.ds.toDate().toISOString(),
          y: d.y,
          hour: d.hour,
        });
      });

      res.json({ item, monthDay, byYear });
      return;
    } catch (e) {
      return sendError(res, e);
    }
  }
);


export const latestRunHourlyHttp = onRequest({ region: "us-central1" }, async (req, res): Promise<void> => {
  try {
    if (applyCors(req, res)) return;
    if (req.method !== "GET") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const { uid } = await requireAuthHttp(req);

    const snap = await db
      .collection(`users/${uid}/runs_hourly`)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (snap.empty) {
      throw new HttpsError("not-found", "No hourly runs found.");
    }

    const doc = snap.docs[0];
    const data = doc.data() as any;

    res.json({
      id: doc.id,
      businessName: data.businessName ?? null,
      mapping: data.mapping ?? null,
      forecast: data.forecast ?? null,
      meta: data.meta ?? null,
      createdAt: data.createdAt ?? null,
    });
    return;
  } catch (e) {
    return sendError(res, e);
  }
});



/**
 * GET /latestRun
 * Response: { ... } | null
 */
export const latestRun = onRequest({ region: "us-central1" }, async (req, res): Promise<void> => {
  try {
    if (applyCors(req, res)) return;
    if (req.method !== "GET") { 
        res.status(405).send("Method Not Allowed");
        return
    }

    const { uid } = await requireAuthHttp(req);

    const snap = await db
      .collection(`users/${uid}/runs`)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (snap.empty) { 
        res.json(null);
        return
    }

    const doc = snap.docs[0];
    const data = doc.data() as any;

    res.json({
      id: doc.id,
      businessName: data.businessName,
      mapping: data.mapping,
      forecast: data.forecast,
      insights: data.insights ?? null,
      createdAt: new Date().toISOString(),
    });
    return
  } catch (e) {
    return sendError(res, e);
  }
});
