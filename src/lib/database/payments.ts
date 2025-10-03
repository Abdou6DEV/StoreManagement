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

export async function getPaymentsByClientWithInfo(clientId: string) {
  const payments = await prisma.payment.findMany({
    where: { clientId },
    include: {
      sale: {
        include: {
          saleItems: {
            select: {
              price: true,
              quantity: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate remaining amounts for each payment
  return payments.map((payment) => {
    let remainingAmount = 0;
    
    if (payment.sale && payment.sale.saleItems) {
      // Calculate total sale amount
      const totalAmount = payment.sale.saleItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      
      // For CREDIT payments, remaining amount = total - givenAmount
      // For VERSEMENT payments, remaining amount = givenAmount (what we owe them)
      if (payment.type === "CREDIT") {
        remainingAmount = totalAmount - payment.givenAmount;
      } else {
        remainingAmount = payment.givenAmount;
      }
    }

    return {
      ...payment,
      remainingAmount,
    };
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
  const payments = await prisma.payment.findMany({
    include: {
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      sale: {
        include: {
          saleItems: {
            select: {
              price: true,
              quantity: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate remaining amounts for each payment
  return payments.map((payment) => {
    let remainingAmount = 0;
    
    if (payment.sale && payment.sale.saleItems) {
      // Calculate total sale amount
      const totalAmount = payment.sale.saleItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      
      // For CREDIT payments, remaining amount = total - givenAmount
      // For VERSEMENT payments, remaining amount = givenAmount (what we owe them)
      if (payment.type === "CREDIT") {
        remainingAmount = totalAmount - payment.givenAmount;
      } else {
        remainingAmount = payment.givenAmount;
      }
    }

    return {
      ...payment,
      remainingAmount,
    };
  });
}

export async function updatePaymentPaidAt(paymentId: string, paidDate: Date | null) {
  return await prisma.payment.update({
    where: { id: paymentId },
    data: { paidDate },
  });
}

export async function updatePaymentAmount(
  paymentId: string,
  givenAmount: number,
) {
  // Validate amount is within INT range (2,147,483,647)
  const MAX_INT = 2147483647;
  if (givenAmount < 0) {
    throw new Error("Payment amount cannot be negative");
  }
  if (givenAmount > MAX_INT) {
    throw new Error(`Payment amount cannot exceed ${MAX_INT.toLocaleString()} DA`);
  }

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
