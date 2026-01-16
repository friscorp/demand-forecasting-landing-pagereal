import { defineSecret } from "firebase-functions/params";
export const PROPHET_URL = defineSecret("PROPHET_URL");
export const HOURLY_PROPHET_URL = defineSecret("HOURLY_PROPHET_URL");
