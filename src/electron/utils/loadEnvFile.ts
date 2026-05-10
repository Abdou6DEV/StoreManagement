import path from "node:path";
import fs from "node:fs";

/** Loads `.env` from cwd or next to the compiled main bundle (dev). Does not override existing `process.env`. */
export function loadEnvFile(): void {
  const candidates = [path.join(process.cwd(), ".env"), path.join(__dirname, "../../.env")];
  for (const envPath of candidates) {
    try {
      if (!fs.existsSync(envPath)) continue;
      const raw = fs.readFileSync(envPath, "utf8");
      for (const line of raw.split("\n")) {
        const s = line.replace(/^\uFEFF/, "").trim();
        if (!s || s.startsWith("#")) continue;
        const eq = s.indexOf("=");
        if (eq <= 0) continue;
        const key = s.slice(0, eq).trim();
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
        let val = s.slice(eq + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) process.env[key] = val;
      }
      return;
    } catch {
      /* try next candidate */
    }
  }
}
