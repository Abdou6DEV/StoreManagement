/** Prisma money / quantity columns are Int (whole DA, whole units). */
export function toMoneyInt(value: number | string | null | undefined): number {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num);
}

export function toQtyInt(value: number | string | null | undefined): number {
  return toMoneyInt(value);
}
