import { prisma } from "./prismaClient";

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

      return { ...client, totalPurchases };
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
  return await prisma.client.delete({ where: { id } });
}

export async function updateClient(
  id: string,
  data: { name?: string; phone?: string; address?: string; notes?: string },
) {
  return await prisma.client.update({ where: { id }, data });
}
