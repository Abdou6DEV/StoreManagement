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
  firstPaymentPaidDate?: Date;
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
        ...(data.firstPaymentPaidDate ? { paidDate: data.firstPaymentPaidDate } : {}),
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

  async recordPayment(billId: string, amount: number, notes?: string, paidDate?: Date): Promise<Bill> {
    return prisma.$transaction(async (tx) => {
      const bill = await tx.bill.findUnique({ where: { id: billId } });
      if (!bill) {
        throw new Error("Bill not found");
      }

      await tx.billPayment.create({
        data: {
          billId,
          amount,
          notes,
          ...(paidDate ? { paidDate } : {}),
        }
      });

      if (bill.duration !== "NO_NEXT") {
        // Only advance nextBillDate for current-day payments.
        // Past/missed payments should not shift the existing reminder date.
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const isCurrentPayment = !paidDate || paidDate >= todayStart;

        if (isCurrentPayment) {
          const nextBillDate = this.calculateNextBillDate(bill.duration);

          return tx.bill.update({
            where: { id: billId },
            data: {
              nextBillDate,
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
      }

      return tx.bill.findUnique({
        where: { id: billId },
        include: {
          payments: {
            orderBy: {
              paidDate: 'desc'
            }
          }
        }
      }) as Promise<Bill>;
    });
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

    // Adds months while clamping the day to the last valid day of the target month.
    // Prevents silent day-overflow (e.g. Aug 31 + 1 month → Sep 30, not Oct 1).
    const addMonths = (d: Date, months: number): Date => {
      const targetMonth = d.getMonth() + months;
      const lastDay = new Date(d.getFullYear(), targetMonth + 1, 0).getDate();
      return new Date(d.getFullYear(), targetMonth, Math.min(d.getDate(), lastDay));
    };

    switch (duration) {
      case "NO_NEXT":
        return today;
      case "1_DAY":
        return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      case "1_MONTH":   return addMonths(today, 1);
      case "2_MONTHS":  return addMonths(today, 2);
      case "3_MONTHS":  return addMonths(today, 3);
      case "4_MONTHS":  return addMonths(today, 4);
      case "5_MONTHS":  return addMonths(today, 5);
      case "6_MONTHS":  return addMonths(today, 6);
      case "7_MONTHS":  return addMonths(today, 7);
      case "8_MONTHS":  return addMonths(today, 8);
      case "9_MONTHS":  return addMonths(today, 9);
      case "10_MONTHS": return addMonths(today, 10);
      case "11_MONTHS": return addMonths(today, 11);
      case "ANNUALLY":  return addMonths(today, 12);
      default:          return today;
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
