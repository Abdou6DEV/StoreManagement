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
