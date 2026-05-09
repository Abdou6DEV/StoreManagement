import { prisma } from "./prismaClient";

/**
 * True when none of the core business tables have rows (see ONLINE_FEATURES_PLAN: products, sales, clients, bills, services).
 */
export async function isCoreModulesDatabaseEmpty(): Promise<boolean> {
  const [products, sales, clients, bills, appointments] = await Promise.all([
    prisma.product.count(),
    prisma.sale.count(),
    prisma.client.count(),
    prisma.bill.count(),
    prisma.serviceAppointment.count(),
  ]);
  return (
    products === 0 &&
    sales === 0 &&
    clients === 0 &&
    bills === 0 &&
    appointments === 0
  );
}
