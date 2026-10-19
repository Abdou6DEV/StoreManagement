/** Mobile Supabase credentials are read only in Electron's main process. */
export const DEFAULT_MOBILE_SUPABASE_URL =
  "https://rztritesbzeunyjluqdi.supabase.co";
export const DEFAULT_MOBILE_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_xgFvypeJMKifcefAPiS38Q_niLG4IR9";

export type StoreMobileConfig = {
  supabaseUrl: string;
  publishableKey: string;
  desktopSecret: string;
};

export function getStoreMobileConfig(): StoreMobileConfig | { error: "missing_env" } {
  const supabaseUrl = (
    process.env.STORE_MOBILE_SUPABASE_URL ?? DEFAULT_MOBILE_SUPABASE_URL
  )
    .trim()
    .replace(/\/$/, "");
  const publishableKey = (
    process.env.STORE_MOBILE_SUPABASE_PUBLISHABLE_KEY ?? DEFAULT_MOBILE_SUPABASE_PUBLISHABLE_KEY
  ).trim();
  const desktopSecret = (process.env.STORE_MOBILE_APP_SECRET ?? "").trim();

  if (!supabaseUrl || !publishableKey || !desktopSecret) {
    return { error: "missing_env" };
  }

  return { supabaseUrl, publishableKey, desktopSecret };
}
