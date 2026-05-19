/** Semver-style compare (major.minor.patch). Returns -1 if a < b, 0 if equal, 1 if a > b. */
export function compareVersions(a: string, b: string): number {
  const aParts = a.split(".").map((p) => parseInt(p, 10) || 0);
  const bParts = b.split(".").map((p) => parseInt(p, 10) || 0);
  const len = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < len; i++) {
    const av = aParts[i] ?? 0;
    const bv = bParts[i] ?? 0;
    if (av < bv) return -1;
    if (av > bv) return 1;
  }
  return 0;
}

/** True when installed app is older than the version required by the cloud backup metadata. */
export function isInstalledAppOlderThan(installed: string, required: string): boolean {
  return compareVersions(installed.trim(), required.trim()) < 0;
}
