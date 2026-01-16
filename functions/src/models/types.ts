/* eslint-disable @typescript-eslint/no-explicit-any */

export type ColumnMapping = {
    date: string;
    item: string;
    quantity: string;
  };
  
  export type ForecastPoint = {
    ds: string; // ISO date (YYYY-MM-DD)
    yhat: number;
    yhat_lower: number;
    yhat_upper: number;
  };
  
  export type ForecastItemResult = {
    meta: { model: string; regressors: any[] };
    forecast: ForecastPoint[];
  };
  
  export type ForecastResponse = {
    mode: "per_product";
    results: Record<string, ForecastItemResult>;
  };
  
  export type IngestResponse = {
    ok: boolean;
    business_id: string;         // Firestore doc id
    upload_id: string | null;    // Firestore doc id or null if deduped
    file_hash: string;
    rows_inserted: number;
    message: string;
  };
  
  export type SaveRunRequest = {
    business_name: string;
    mapping_json: ColumnMapping;
    forecast_json: any;   // keep flexible to match your frontend
    insights_json: any | null;
  };
  
  export type RunResponse = {
    id: string;
    business_name: string;
    mapping_json: ColumnMapping;
    forecast_json: any;
    insights_json: any | null;
    created_at: string; // ISO
  };
