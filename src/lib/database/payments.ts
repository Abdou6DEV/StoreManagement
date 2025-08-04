import { prisma } from "./prismaClient";

export async function createPayment(data: {
  saleId?: string;
  clientId: string;
  givenAmount: number;
  dueDate: Date;
  paidDate?: Date;
  type: "CREDIT" | "VERSEMENT";
}) {
  return await prisma.payment.create({
    data: {
      saleId: data.saleId,
      clientId: data.clientId,
      givenAmount: data.givenAmount,
      dueDate: data.dueDate,
      paidDate: data.paidDate,
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

export async function getAllPaymentsWithClientInfo() {
  return await prisma.payment.findMany({
    include: {
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      sale: {
        select: {
          id: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updatePaymentPaidAt(paymentId: string, paidDate: Date) {
  return await prisma.payment.update({
    where: { id: paymentId },
    data: { paidDate },
  });
}

export async function updatePaymentAmount(
  paymentId: string,
  givenAmount: number,
) {
  return await prisma.payment.update({
    where: { id: paymentId },
    data: { givenAmount },
  });
}
