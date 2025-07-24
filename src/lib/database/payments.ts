import { prisma } from "../prismaClient";

export async function createPayment(data: {
  saleId: string;
  clientId: string;
  paidAmount: number;
  dueAt: Date;
  paidAt?: Date;
  type: "CREDIT" | "VERSEMENT";
}) {
  return await prisma.payment.create({
    data: {
      saleId: data.saleId,
      clientId: data.clientId,
      paidAmount: data.paidAmount,
      dueAt: data.dueAt,
      paidAt: data.paidAt,
      type: data.type,
    },
  });
}

export async function getPaymentsByClient(clientId: string) {
  return await prisma.payment.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllPayments() {
  return await prisma.payment.findMany({
    include: {
      client: true,
      sale: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updatePaymentPaidAt(saleId: string, clientId: string, paidAt: Date) {
  return await prisma.payment.update({
    where: { saleId_clientId: { saleId, clientId } },
    data: { paidAt },
  });
}
