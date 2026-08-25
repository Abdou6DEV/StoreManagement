/**
 * Reads Supabase Edge credentials for the main process only (never expose service role here).
 * Set anon key + app secret in `.env` or the environment. URL defaults to this project if unset.
 */
/** Default project API host (no `/functions/...` path). Override with STORE_ONLINE_SUPABASE_URL if needed. */
export const DEFAULT_STORE_SUPABASE_URL = "https://fayqqjnhqggmtcwaymwh.supabase.co";

/** Phone capture page (custom domain). Override with STORE_INVOICE_SCAN_PAGE_URL. */
export const DEFAULT_INVOICE_SCAN_PAGE_URL =
  "https://www.redatechpos.com/scan.html";

export type StoreOnlineConfig = {
  supabaseUrl: string;
  anonKey: string;
  appSecret: string;
};

export function getStoreOnlineConfig(): StoreOnlineConfig | { error: "missing_env" } {
  const supabaseUrl = (process.env.STORE_ONLINE_SUPABASE_URL ?? DEFAULT_STORE_SUPABASE_URL)
    .trim()
    .replace(/\/$/, "");
  const anonKey = (process.env.STORE_ONLINE_SUPABASE_ANON_KEY ?? "").trim();
  const appSecret = (process.env.STORE_ONLINE_APP_SECRET ?? "").trim();
  if (!supabaseUrl || !anonKey || !appSecret) {
    return { error: "missing_env" };
  }
  return { supabaseUrl, anonKey, appSecret };
}
