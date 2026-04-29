import { prisma } from "./prismaClient";
import { Bill } from "@prisma/client";

export interface CreateBillData {
  title: string;
  description?: string;
  type: string;
  amount: number;
  nextBillDate: Date;
  duration: string;
  notes?: string;
  firstPaymentNotes?: string;
}

export interface UpdateBillData {
  title?: string;
  description?: string;
  type?: string;
  amount?: number;
  nextBillDate?: Date;
  duration?: string;
  notes?: string;
}

export interface BillFilters {
  type?: string;
  duration?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export const bills = {
  async create(data: CreateBillData): Promise<Bill> {
    // Basic validation
    if (data.amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    // Create the bill and automatically record the first payment
    const bill = await prisma.bill.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        amount: data.amount,
        nextBillDate: data.nextBillDate,
        duration: data.duration,
        notes: data.notes,
      },
    });

    // Automatically record the first payment
    await prisma.billPayment.create({
      data: {
        billId: bill.id,
        amount: data.amount,
        notes: data.firstPaymentNotes ?? "Initial payment",
      }
    });

    // Return the bill with payments included
    return prisma.bill.findUnique({
      where: { id: bill.id },
      include: {
        payments: {
          orderBy: {
            paidDate: 'desc'
          }
        }
      }
    }) as Promise<Bill>;
  },

  async getAll(): Promise<Bill[]> {
    return prisma.bill.findMany({
      include: {
        payments: {
          orderBy: {
            paidDate: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async getById(id: string): Promise<Bill | null> {
    return prisma.bill.findUnique({
      where: { id },
      include: {
        payments: {
          orderBy: {
            paidDate: 'desc'
          }
        }
      }
    });
  },

  async update(id: string, data: UpdateBillData): Promise<Bill> {
    // Basic validation
    if (data.amount !== undefined && data.amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    return prisma.bill.update({
      where: { id },
      data,
      include: {
        payments: {
          orderBy: {
            paidDate: 'desc'
          }
        }
      }
    });
  },

  async delete(id: string): Promise<void> {
    await prisma.billPayment.deleteMany({ where: { billId: id } });
    await prisma.bill.delete({
      where: { id },
    });
  },


  async getFiltered(filters: BillFilters = {}): Promise<Bill[]> {
    const where: any = {};

    if (filters.type) {
      where.type = { contains: filters.type };
    }

    if (filters.duration) {
      where.duration = filters.duration;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { description: { contains: filters.search } },
        { type: { contains: filters.search } },
        { notes: { contains: filters.search } },
      ];
    }

    if (filters.dateFrom || filters.dateTo) {
      where.nextBillDate = {};
      if (filters.dateFrom) {
        where.nextBillDate.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.nextBillDate.lte = filters.dateTo;
      }
    }

    return prisma.bill.findMany({
      where,
      include: {
        payments: {
          orderBy: {
            paidDate: 'desc'
          }
        }
      },
      orderBy: {
        nextBillDate: "asc",
      },
    });
  },

  async getDueSoon(days = 7): Promise<Bill[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);
    futureDate.setHours(23, 59, 59, 999);

    return prisma.bill.findMany({
      where: {
        nextBillDate: {
          gte: today,
          lte: futureDate,
        },
      },
      include: {
        payments: {
          orderBy: {
            paidDate: 'desc'
          }
        }
      },
      orderBy: {
        nextBillDate: "asc",
      },
    });
  },

  async getStats() {
    const totalBills = await prisma.bill.count();
    const totalAmount = await prisma.bill.aggregate({
      _sum: { amount: true },
    });

    return {
      totalBills,
      totalAmount: totalAmount._sum.amount || 0,
    };
  },

  async getBillTypes(): Promise<string[]> {
    const bills = await prisma.bill.findMany({
      select: { type: true },
      distinct: ['type'],
    });
    return bills.map(bill => bill.type).sort();
  },

  async getBillTitles(): Promise<{ title: string; type: string; amount: number; duration: string }[]> {
    const bills = await prisma.bill.findMany({
      select: { 
        title: true, 
        type: true, 
        amount: true, 
        duration: true,
        nextBillDate: true
      },
      orderBy: {
        nextBillDate: 'desc'
      }
    });
    return bills;
  },

  async getBillByTitle(title: string): Promise<Bill | null> {
    return prisma.bill.findFirst({
      where: { title },
      orderBy: {
        nextBillDate: 'desc'
      }
    });
  },

  async recordPayment(billId: string, amount: number, notes?: string): Promise<Bill> {
    // Record the payment
    await prisma.billPayment.create({
      data: {
        billId,
        amount,
        notes,
      }
    });

    // Update the bill's next due date based on its duration
    const bill = await prisma.bill.findUnique({ where: { id: billId } });
    if (!bill) {
      throw new Error("Bill not found");
    }

    if (bill.duration !== "NO_NEXT") {
      const nextBillDate = this.calculateNextBillDate(bill.duration);
      
      return prisma.bill.update({
        where: { id: billId },
        data: {
          nextBillDate,
          amount, // Update the bill amount to the latest payment
        },
        include: {
          payments: {
            orderBy: {
              paidDate: 'desc'
            }
          }
        }
      });
    }

    return prisma.bill.findUnique({
      where: { id: billId },
      include: {
        payments: {
          orderBy: {
            paidDate: 'desc'
          }
        }
      }
    }) as Promise<Bill>;
  },

  async getBillWithPayments(billId: string): Promise<Bill & { payments: any[] } | null> {
    return prisma.bill.findUnique({
      where: { id: billId },
      include: {
        payments: {
          orderBy: {
            paidDate: 'desc'
          }
        }
      }
    });
  },

  // Calculate next bill date based on duration
  calculateNextBillDate(duration: string): Date {
    const today = new Date();
    
    switch (duration) {
      case "NO_NEXT":
        return today; // No next bill
      case "1_MONTH":
        return new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
      case "2_MONTHS":
        return new Date(today.getFullYear(), today.getMonth() + 2, today.getDate());
      case "3_MONTHS":
        return new Date(today.getFullYear(), today.getMonth() + 3, today.getDate());
      case "4_MONTHS":
        return new Date(today.getFullYear(), today.getMonth() + 4, today.getDate());
      case "5_MONTHS":
        return new Date(today.getFullYear(), today.getMonth() + 5, today.getDate());
      case "6_MONTHS":
        return new Date(today.getFullYear(), today.getMonth() + 6, today.getDate());
      case "7_MONTHS":
        return new Date(today.getFullYear(), today.getMonth() + 7, today.getDate());
      case "8_MONTHS":
        return new Date(today.getFullYear(), today.getMonth() + 8, today.getDate());
      case "9_MONTHS":
        return new Date(today.getFullYear(), today.getMonth() + 9, today.getDate());
      case "10_MONTHS":
        return new Date(today.getFullYear(), today.getMonth() + 10, today.getDate());
      case "11_MONTHS":
        return new Date(today.getFullYear(), today.getMonth() + 11, today.getDate());
      case "ANNUALLY":
        return new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
      default:
        return today;
    }
  },

  // Reset bill to next duration when paid
  async resetBillToNextDuration(id: string): Promise<Bill> {
    const bill = await prisma.bill.findUnique({ where: { id } });
    if (!bill) {
      throw new Error("Bill not found");
    }

    if (bill.duration === "NO_NEXT") {
      // If no next bill, just return the current bill
      return bill;
    }

    const nextBillDate = this.calculateNextBillDate(bill.duration);
    
    return prisma.bill.update({
      where: { id },
      data: {
        nextBillDate,
      },
    });
  },

  /**
   * Deletes a single bill payment row. Safe: no other tables reference BillPayment;
   * only Bill → BillPayment (parent keeps existing; optional empty payment list).
   * Runs in a transaction so read-and-delete is atomic.
   */
  async deletePayment(id: string): Promise<{
    paymentId: string;
    billId: string;
    billTitle: string;
    billType: string;
    amount: number;
    paidDate: Date;
    notes: string | null;
  }> {
    const trimmed = id?.trim();
    if (!trimmed) {
      throw new Error("Invalid payment id");
    }

    return prisma.$transaction(async (tx) => {
      const row = await tx.billPayment.findUnique({
        where: { id: trimmed },
        include: {
          bill: { select: { id: true, title: true, type: true } },
        },
      });

      if (!row) {
        throw new Error("Payment not found");
      }

      if (!row.bill) {
        throw new Error("Bill not found for payment");
      }

      await tx.billPayment.delete({ where: { id: trimmed } });

      return {
        paymentId: row.id,
        billId: row.bill.id,
        billTitle: row.bill.title,
        billType: row.bill.type,
        amount: row.amount,
        paidDate: row.paidDate,
        notes: row.notes ?? null,
      };
    });
  },

  async getAllPayments(): Promise<any[]> {
    return prisma.billPayment.findMany({
      include: {
        bill: {
          select: {
            id: true,
            title: true,
            type: true,
          }
        }
      },
      orderBy: {
        paidDate: 'desc'
      }
    });
  },

  async getBySpecificPeriod(
    period: "day" | "month" | "year",
    periodValue: string
  ): Promise<any[]> {
    let startDate: Date;
    let endDate: Date;

    if (period === "day") {
      startDate = new Date(periodValue);
      endDate = new Date(periodValue);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === "month") {
      const [year, month] = periodValue.split("-");
      startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    } else {
      startDate = new Date(parseInt(periodValue), 0, 1);
      endDate = new Date(parseInt(periodValue), 11, 31, 23, 59, 59, 999);
    }

    return prisma.billPayment.findMany({
      where: {
        paidDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        bill: {
          select: {
            id: true,
            title: true,
            type: true,
          }
        }
      },
      orderBy: {
        paidDate: 'desc'
      }
    });
  },

  async getBillsPaymentsAggregatedByPeriod(
    period: "day" | "month" | "year",
    startDate: Date,
    endDate: Date
  ) {
    const billPayments = await prisma.billPayment.findMany({
      where: {
        paidDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        bill: {
          select: {
            id: true,
            title: true,
            type: true,
          }
        }
      },
      orderBy: {
        paidDate: 'desc'
      }
    });

    // Group payments by period
    const groupedData = new Map<
      string,
      {
        period: string;
        totalAmount: number;
        count: number;
      }
    >();

    billPayments.forEach((payment) => {
      const paymentDate = new Date(payment.paidDate);
      let periodKey: string;

      if (period === "day") {
        // Use local timezone to match the sales data processing
        const year = paymentDate.getFullYear();
        const month = String(paymentDate.getMonth() + 1).padStart(2, "0");
        const day = String(paymentDate.getDate()).padStart(2, "0");
        periodKey = `${year}-${month}-${day}`;
      } else if (period === "month") {
        periodKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, "0")}`;
      } else {
        periodKey = paymentDate.getFullYear().toString();
      }

      const existing = groupedData.get(periodKey);
      if (existing) {
        existing.totalAmount += payment.amount;
        existing.count += 1;
      } else {
        groupedData.set(periodKey, {
          period: periodKey,
          totalAmount: payment.amount,
          count: 1,
        });
      }
    });

    // No filling of missing periods - only show existing data

    // Convert to array and sort by period
    const result = Array.from(groupedData.values()).sort((a, b) =>
      a.period.localeCompare(b.period)
    );

    return result;
  },
};
