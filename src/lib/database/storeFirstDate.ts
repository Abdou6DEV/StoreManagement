import { prisma, prismaPromise } from "./prismaClient";

let cachedFirstYmd: string | undefined;
let inflight: Promise<string> | undefined;

function ymd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function peekStoreFirstRecordedYmd(): string | undefined {
  return cachedFirstYmd;
}

/**
 * Earliest business day in the store. Loaded once at startup, then reused from memory.
 */
export async function getStoreFirstRecordedYmd(): Promise<string> {
  if (cachedFirstYmd) return cachedFirstYmd;
  if (inflight) return inflight;

  inflight = loadFirstRecordedYmd().finally(() => {
    inflight = undefined;
  });
  return inflight;
}

async function loadFirstRecordedYmd(): Promise<string> {
  try {
    await prismaPromise;
    const [sale, purchase, payment, bill, appointment, client, product] =
      await Promise.all([
        prisma.sale.findFirst({
          orderBy: { createdAt: "asc" },
          select: { createdAt: true },
        }),
        prisma.purchase.findFirst({
          orderBy: { createdAt: "asc" },
          select: { createdAt: true },
        }),
        prisma.payment.findFirst({
          orderBy: { createdAt: "asc" },
          select: { createdAt: true },
        }),
        prisma.billPayment.findFirst({
          orderBy: { paidDate: "asc" },
          select: { paidDate: true },
        }),
        prisma.serviceAppointment.findFirst({
          orderBy: { createdAt: "asc" },
          select: { createdAt: true },
        }),
        prisma.client.findFirst({
          orderBy: { createdAt: "asc" },
          select: { createdAt: true },
        }),
        prisma.product.findFirst({
          orderBy: { createdAt: "asc" },
          select: { createdAt: true },
        }),
      ]);

    const times = [
      sale?.createdAt,
      purchase?.createdAt,
      payment?.createdAt,
      bill?.paidDate,
      appointment?.createdAt,
      client?.createdAt,
      product?.createdAt,
    ]
      .map(asDate)
      .filter((date): date is Date => date !== null)
      .map((date) => date.getTime());

    if (times.length === 0) {
      cachedFirstYmd = ymd(new Date());
    } else {
      cachedFirstYmd = ymd(new Date(Math.min(...times)));
    }
    console.log(`[AI] First store day cached: ${cachedFirstYmd}`);
    return cachedFirstYmd;
  } catch (error) {
    console.warn("[AI] Could not read first store date", error);
    return ymd(new Date());
  }
}
