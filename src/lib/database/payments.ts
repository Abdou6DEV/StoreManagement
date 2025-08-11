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

export async function getPaymentsByDateRange(startDate: Date, endDate: Date) {
  return await prisma.payment.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      client: true,
      sale: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getPaymentsBySpecificPeriod(
  period: "day" | "month" | "year",
  periodValue: string,
) {
  let startDate: Date;
  let endDate: Date;

  if (period === "day") {
    // periodValue is in format "YYYY-MM-DD"
    startDate = new Date(periodValue);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(periodValue);
    endDate.setHours(23, 59, 59, 999);
  } else if (period === "month") {
    // periodValue is in format "YYYY-MM"
    const [year, month] = periodValue.split("-");
    startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(parseInt(year), parseInt(month), 0);
    endDate.setHours(23, 59, 59, 999);
  } else {
    // periodValue is in format "YYYY"
    const year = parseInt(periodValue);
    startDate = new Date(year, 0, 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(year, 11, 31);
    endDate.setHours(23, 59, 59, 999);
  }

  return await getPaymentsByDateRange(startDate, endDate);
}
