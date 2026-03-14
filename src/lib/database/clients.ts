import { prisma } from "./prismaClient";
import { getPaymentsByClientWithInfo } from "./payments";

export async function getAllClients() {
  return await prisma.client.findMany();
}

export async function findClientByName(name: string) {
  return await prisma.client.findFirst({
    where: { name: name.trim() }
  });
}

export async function getAllClientsWithTotalPurchases() {
  const clients = await prisma.client.findMany();

  const results = await Promise.all(
    clients.map(async (client) => {
      // Calculate total purchases from sales
      const sales = await prisma.sale.findMany({
        where: { clientId: client.id },
        include: { saleItems: true },
      });

      let totalPurchases = 0;
      for (const sale of sales) {
        let saleTotal = 0;
        for (const item of sale.saleItems) {
          saleTotal += Number(item.price) * item.quantity;
        }
        saleTotal -= sale.discount;
        totalPurchases += saleTotal;
      }

      // Calculate total credits and versements - EXACTLY as shown in the payment table
      const paymentsData = await getPaymentsByClientWithInfo(client.id);

      // Filter unpaid payments
      const unpaidCredits = paymentsData.filter((p: any) => p.type === "CREDIT" && !p.paidDate);
      const unpaidVersements = paymentsData.filter((p: any) => p.type === "VERSEMENT" && !p.paidDate);
      
      // For CREDIT: Sum what's displayed in the table (line 137-139 paymentRow.tsx)
      // Shows: remainingAmount if available, else givenAmount
      // Ensure non-negative values to prevent formatting issues
      const totalCredit = Math.max(0, unpaidCredits.reduce((sum: number, p: any) => {
        if (p.type === "CREDIT" && p.remainingAmount !== undefined && p.remainingAmount > 0) {
          return sum + p.remainingAmount;
        }
        if (p.givenAmount && p.givenAmount > 0) {
          return sum + p.givenAmount;
        }
        return sum;
      }, 0));
      
      // For VERSEMENT: Sum EXACTLY what's shown in paymentRow.tsx line 139
      // For versements, paymentRow shows: payment.givenAmount (because condition is only for CREDIT)
      const totalVersement = unpaidVersements.reduce((sum: number, p: any) => {
        return sum + (p.givenAmount || 0);
      }, 0);

      return { ...client, totalPurchases, totalCredit, totalVersement };
    }),
  );

  return results;
}

export async function createClient(data: {
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
}) {
  return await prisma.client.create({ data });
}

export async function deleteClient(id: string) {
  // Delete related payments and sales first so no orphan rows remain.
  // SQLite does not enforce FK cascades by default, so we do it explicitly.
  await prisma.payment.deleteMany({ where: { clientId: id } });
  await prisma.sale.deleteMany({ where: { clientId: id } });
  await prisma.serviceAppointment.updateMany({
    where: { clientId: id },
    data: { clientId: null },
  });
  return await prisma.client.delete({ where: { id } });
}

export async function updateClient(
  id: string,
  data: { name?: string; phone?: string; address?: string; notes?: string },
) {
  return await prisma.client.update({ where: { id }, data });
}
