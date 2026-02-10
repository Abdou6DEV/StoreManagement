/**
 * Asset paths that work in both dev (Vite server) and production (Electron loadFile).
 * Uses BASE_URL so production resolves relative to the packed index.html (no "unknown image").
 */
const base = typeof import.meta !== "undefined" && import.meta.env?.BASE_URL != null
  ? import.meta.env.BASE_URL
  : "/";

export const LOGO_ICON = `${base}myapp.ico`;
export const LOGO_ICON_DARK = `${base}myapp_black.ico`;
