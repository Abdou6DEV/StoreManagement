import { prisma } from "./prismaClient";
import { createSale } from "./sales";

export async function createPayment(data: {
  saleId?: string;
  clientId: string;
  givenAmount: number;
  creditAmount?: number;
  dueDate: Date;
  paidDate?: Date;
  type: "CREDIT" | "VERSEMENT";
  pendingSaleItems?: string;
  discount?: number;
}) {
  return await prisma.payment.create({
    data: {
      saleId: data.saleId,
      clientId: data.clientId,
      givenAmount: data.givenAmount,
      creditAmount: data.creditAmount,
      dueDate: data.dueDate,
      paidDate: data.paidDate,
      type: data.type,
      pendingSaleItems: data.pendingSaleItems,
      discount: data.discount,
    } as any,
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
    select: {
      id: true,
      saleId: true,
      clientId: true,
      givenAmount: true,
      creditAmount: true,
      dueDate: true,
      paidDate: true,
      type: true,
      createdAt: true,
      updatedAt: true,
      pendingSaleItems: true,
      discount: true,
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
    } as any,
    orderBy: { createdAt: "desc" },
  });

  // Calculate remaining amounts for each payment
  return payments.map((payment: any) => {
    let remainingAmount = 0;
    
    if (payment.sale) {
      // Use pre-calculated total amount for performance
      const totalAmount = payment.sale.totalAmount || 0;
      const totalAmountWithDiscount = payment.sale.totalAmountWithDiscount || 0;
      
      // For CREDIT payments, use creditAmount if available (includes discount), otherwise use totalAmountWithDiscount
      // For VERSEMENT payments, remaining amount = givenAmount (what we owe them)
      if (payment.type === "CREDIT") {
        const creditAmount = (payment as any).creditAmount;
        if (creditAmount !== undefined && creditAmount !== null) {
          remainingAmount = creditAmount - payment.givenAmount;
        } else {
          // Use pre-calculated total with discount
          remainingAmount = totalAmountWithDiscount - payment.givenAmount;
        }
      } else {
        remainingAmount = payment.givenAmount;
      }
    } else {
      // Standalone payments (no sale associated)
      if (payment.type === "CREDIT") {
        // For standalone CREDIT: remaining amount = creditAmount - givenAmount
        // creditAmount = total amount we owe, givenAmount = amount paid so far
        const creditAmount = (payment as any).creditAmount || 0;
        remainingAmount = creditAmount - payment.givenAmount;
      } else {
        // For standalone VERSEMENT: remaining amount is what we owe them
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
    select: {
      id: true,
      saleId: true,
      clientId: true,
      givenAmount: true,
      creditAmount: true,
      dueDate: true,
      paidDate: true,
      type: true,
      createdAt: true,
      updatedAt: true,
      pendingSaleItems: true,
      discount: true,
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
          totalAmount: true,
          totalAmountWithDiscount: true,
          saleItems: {
            select: {
              price: true,
              quantity: true,
            },
          },
        },
      },
    } as any,
    orderBy: { createdAt: "desc" },
  });

  // Calculate remaining amounts for each payment
  return payments.map((payment: any) => {
    let remainingAmount = 0;
    
    if (payment.sale) {
      // Use pre-calculated total amount for performance
      const totalAmount = payment.sale.totalAmount || 0;
      const totalAmountWithDiscount = payment.sale.totalAmountWithDiscount || 0;
      
      // For CREDIT payments, use creditAmount if available (includes discount), otherwise use totalAmountWithDiscount
      // For VERSEMENT payments, remaining amount = givenAmount (what we owe them)
      if (payment.type === "CREDIT") {
        const creditAmount = (payment as any).creditAmount;
        if (creditAmount !== undefined && creditAmount !== null) {
          remainingAmount = creditAmount - payment.givenAmount;
        } else {
          // Use pre-calculated total with discount
          remainingAmount = totalAmountWithDiscount - payment.givenAmount;
        }
      } else {
        remainingAmount = payment.givenAmount;
      }
    } else {
      // Standalone payments (no sale associated)
      if (payment.type === "CREDIT") {
        // For standalone CREDIT: remaining amount = creditAmount - givenAmount
        // creditAmount = total amount we owe, givenAmount = amount paid so far
        const creditAmount = (payment as any).creditAmount || 0;
        remainingAmount = creditAmount - payment.givenAmount;
      } else {
        // For standalone VERSEMENT: remaining amount is what we owe them
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
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new Error("Payment not found");
  }

  // If marking as paid and it's a VERSEMENT with pending sale items, create the sale
  if (paidDate && payment.type === "VERSEMENT" && (payment as any).pendingSaleItems && !payment.saleId) {
    const saleItems = JSON.parse((payment as any).pendingSaleItems);

    // Create the sale using the existing createSale function
    const sale = await createSale({
      clientId: payment.clientId,
      items: saleItems,
      discount: (payment as any).discount || 0,
    });

    // Update the payment with the sale ID and clear pending items
    return await prisma.payment.update({
      where: { id: paymentId },
      data: {
        paidDate,
        saleId: sale.id,
        pendingSaleItems: null,
        discount: null,
      } as any,
    });
  }

  // For other cases, just update the paid date
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
