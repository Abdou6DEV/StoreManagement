/**
 * Store business days for AI tools.
 *
 * Must match History / dashboard:
 *   new Date(`${ymd}T00:00:00`)
 *   new Date(`${ymd}T23:59:59.999`)
 *
 * Never use `new Date("YYYY-MM-DD")` — that is UTC midnight, which makes
 * same-day queries a zero-width range and shifts Algeria (UTC+1) by one hour.
 */

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;
const HAS_ZONE = /[zZ]|[+-]\d{2}:?\d{2}$/;

export function formatUtcOffset(date = new Date()): string {
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const hours = String(Math.floor(abs / 60)).padStart(2, "0");
  const minutes = String(abs % 60).padStart(2, "0");
  return `UTC${sign}${hours}:${minutes}`;
}

export function getStoreTimeZone(): string {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "local";
  return `${zone} (${formatUtcOffset()})`;
}

export function localYmdFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatLocalDateTime(date: Date): string {
  const ymd = localYmdFromDate(date);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const ms = String(date.getMilliseconds()).padStart(3, "0");
  return `${ymd}T${hours}:${minutes}:${seconds}.${ms}`;
}

function isRealYmd(ymd: string): boolean {
  const match = YMD.exec(ymd);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const local = new Date(year, month - 1, day);

  return (
    local.getFullYear() === year &&
    local.getMonth() === month - 1 &&
    local.getDate() === day
  );
}

/**
 * Calendar day in store local time.
 * A plain YYYY-MM-DD string is the local day as written — never UTC-parsed.
 */
export function toLocalYmd(value: unknown): string | null {
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return localYmdFromDate(value);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return localYmdFromDate(date);
  }

  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (YMD.test(trimmed)) {
    return isRealYmd(trimmed) ? trimmed : null;
  }

  const datePart = /^(\d{4}-\d{2}-\d{2})T/.exec(trimmed);
  if (datePart && !HAS_ZONE.test(trimmed)) {
    return isRealYmd(datePart[1]) ? datePart[1] : null;
  }

  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) return null;
  return localYmdFromDate(parsed);
}

export function localStartOfDay(ymd: string): Date {
  return new Date(`${ymd}T00:00:00`);
}

export function localEndOfDay(ymd: string): Date {
  return new Date(`${ymd}T23:59:59.999`);
}

export type LocalDateRange =
  | {
      ok: true;
      startDate: Date;
      endDate: Date;
      startYmd: string;
      endYmd: string;
    }
  | { ok: false; error: string };

export function parseLocalDateRange(
  startInput: unknown,
  endInput: unknown
): LocalDateRange {
  const startYmd = toLocalYmd(startInput);
  const endYmd = toLocalYmd(endInput);

  if (!startYmd || !endYmd) {
    return {
      ok: false,
      error: `Invalid date. Use YYYY-MM-DD (local store calendar, same as History). Received: startDate=${JSON.stringify(startInput)}, endDate=${JSON.stringify(endInput)}`,
    };
  }

  const startDate = localStartOfDay(startYmd);
  const endDate = localEndOfDay(endYmd);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return { ok: false, error: "Invalid local date." };
  }

  if (startDate.getTime() > endDate.getTime()) {
    return {
      ok: false,
      error: `startDate (${startYmd}) is after endDate (${endYmd}).`,
    };
  }

  return { ok: true, startDate, endDate, startYmd, endYmd };
}

export function parseLocalDateBound(
  value: unknown,
  bound: "start" | "end"
): { ok: true; date: Date; ymd: string } | { ok: false; error: string } {
  const ymd = toLocalYmd(value);
  if (!ymd) {
    return {
      ok: false,
      error: `Invalid date. Use YYYY-MM-DD (local store calendar). Received: ${JSON.stringify(value)}`,
    };
  }

  const date = bound === "start" ? localStartOfDay(ymd) : localEndOfDay(ymd);
  if (isNaN(date.getTime())) {
    return { ok: false, error: "Invalid local date." };
  }

  return { ok: true, date, ymd };
}

export function localRangeMeta(startDate: Date, endDate: Date) {
  return {
    timezone: getStoreTimeZone(),
    timeline: "local store time (same as History and dashboard)",
    startLocal: formatLocalDateTime(startDate),
    endLocal: formatLocalDateTime(endDate),
  };
}
