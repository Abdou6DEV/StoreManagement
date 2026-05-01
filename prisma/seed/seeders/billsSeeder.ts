import { PrismaClient, Bill } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { generateDAPrice } from "../utils/generators";

export async function seedBills(prisma: PrismaClient): Promise<Bill[]> {
  console.log("📋 Creating sample bills...");

  // Mobile phone shop bills
  const billTypes = [
    "Shop Rent",
    "Electricity",
    "Water",
    "Internet",
    "Phone Service",
    "Insurance",
    "Equipment Maintenance",
    "Security",
    "Cleaning",
    "Marketing",
    "Software License",
    "Point of Sale System",
    "Repair Tools",
    "Bank Fees",
    "Tax Preparation",
    "Legal Services",
    "Accounting",
    "Office Supplies",
    "Utilities",
    "Property Tax"
  ];

  const durations = [
    "NO_NEXT",
    "1_MONTH",
    "2_MONTHS", 
    "3_MONTHS",
    "4_MONTHS",
    "5_MONTHS",
    "6_MONTHS",
    "7_MONTHS",
    "8_MONTHS",
    "9_MONTHS",
    "10_MONTHS",
    "11_MONTHS",
    "ANNUALLY"
  ];

  const bills: Bill[] = [];
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  // Salary bills (requested): 3 employees, paid for 2 years.
  // - Daily: 30% of profits (daily)
  // - Daily: 2000 DA (daily)
  // - Monthly: 34000 DA (monthly)
  await seedSalaryBills(prisma, twoYearsAgo);

  // Create 7 bills with 100 payments total
  // 1 overdue, 1 due soon
  const totalBills = 7;
  const totalPayments = 100;
  const paymentsPerBill = Math.floor(totalPayments / totalBills); // ~14 per bill
  const remainingPayments = totalPayments - (paymentsPerBill * totalBills); // Distribute remainder

  for (let i = 0; i < totalBills; i++) {
    const billType = faker.helpers.arrayElement(billTypes);
    // Generate DA prices (last digit 0)
    const amount = generateDAPrice(100, 5000); // 100-5000 DA in centimes
    const duration = faker.helpers.arrayElement(durations);
    
    // Calculate next bill date based on duration
    let nextBillDate = new Date();
    
    // Set specific dates for overdue and due soon bills
    if (i === 0) {
      // First bill: overdue (past date)
      nextBillDate = new Date();
      nextBillDate.setDate(nextBillDate.getDate() - 5); // 5 days ago
    } else if (i === 1) {
      // Second bill: due soon (within 2 days)
      nextBillDate = new Date();
      nextBillDate.setDate(nextBillDate.getDate() + faker.number.int({ min: 1, max: 2 }));
    } else {
      // Other bills: normal dates
      switch (duration) {
        case "1_MONTH":
          nextBillDate.setMonth(nextBillDate.getMonth() + 1);
          break;
        case "2_MONTHS":
          nextBillDate.setMonth(nextBillDate.getMonth() + 2);
          break;
        case "3_MONTHS":
          nextBillDate.setMonth(nextBillDate.getMonth() + 3);
          break;
        case "4_MONTHS":
          nextBillDate.setMonth(nextBillDate.getMonth() + 4);
          break;
        case "5_MONTHS":
          nextBillDate.setMonth(nextBillDate.getMonth() + 5);
          break;
        case "6_MONTHS":
          nextBillDate.setMonth(nextBillDate.getMonth() + 6);
          break;
        case "7_MONTHS":
          nextBillDate.setMonth(nextBillDate.getMonth() + 7);
          break;
        case "8_MONTHS":
          nextBillDate.setMonth(nextBillDate.getMonth() + 8);
          break;
        case "9_MONTHS":
          nextBillDate.setMonth(nextBillDate.getMonth() + 9);
          break;
        case "10_MONTHS":
          nextBillDate.setMonth(nextBillDate.getMonth() + 10);
          break;
        case "11_MONTHS":
          nextBillDate.setMonth(nextBillDate.getMonth() + 11);
          break;
        case "ANNUALLY":
          nextBillDate.setFullYear(nextBillDate.getFullYear() + 1);
          break;
        case "NO_NEXT":
          nextBillDate = faker.date.future({ years: 1 });
          break;
      }
    }

    const createdAt = faker.date.between({ from: twoYearsAgo, to: new Date() });

    // Create the bill
    const bill = await prisma.bill.create({
      data: {
        title: `${billType} Bill`,
        description: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.7 }),
        type: billType,
        amount: amount,
        nextBillDate: nextBillDate,
        duration: duration,
        notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.4 }),
        createdAt: createdAt,
        updatedAt: createdAt,
      },
    });

    bills.push(bill);

    // Create payments for this bill (distribute remaining payments to first bills)
    const currentPayments = paymentsPerBill + (i < remainingPayments ? 1 : 0);
    await createBillPayments(prisma, bill, twoYearsAgo, currentPayments);
  }

  console.log(`   - ${bills.length} bills created`);
  console.log(`   - 1 overdue bill, 1 due soon bill`);
  
  // Count total payments created
  const totalPaymentsCreated = await prisma.billPayment.count();
  console.log(`   - ${totalPaymentsCreated} bill payments created (distributed across ${totalBills} bills)`);

  return bills;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function addMonths(d: Date, months: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
}

function toISODate(d: Date) {
  return new Date(d.getTime()).toISOString().slice(0, 10);
}

async function seedSalaryBills(prisma: PrismaClient, twoYearsAgo: Date) {
  console.log("💼 Creating salary bills (3 employees, 2 years of payments)...");

  const from = startOfDay(twoYearsAgo);
  const to = startOfDay(new Date());
  const days = Math.max(
    1,
    Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)),
  );

  // Pull sales profit for the last 2 years and aggregate by day (centimes).
  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: from, lt: addDays(to, 1) } },
    select: { createdAt: true, totalProfit: true },
  });
  const profitCentimesByISO = new Map<string, number>();
  for (const s of sales) {
    const key = toISODate(s.createdAt);
    profitCentimesByISO.set(key, (profitCentimesByISO.get(key) ?? 0) + (s.totalProfit ?? 0));
  }

  const now = new Date();

  // Employee 1: Daily 30% of profit
  const empPctName = "Employee Profit 30%";
  const empPct = await prisma.bill.create({
    data: {
      title: empPctName,
      type: "SALARY",
      amount: 0,
      duration: "1_DAY",
      nextBillDate: addDays(now, 1),
      notes: "SALARY_RULE|period=DAILY",
      createdAt: from,
      updatedAt: from,
    },
  });

  // Employee 2: Daily fixed 2000 DA
  const empDailyName = "Employee Daily 2000";
  const empDaily = await prisma.bill.create({
    data: {
      title: empDailyName,
      type: "SALARY",
      amount: 2000 * 100,
      duration: "1_DAY",
      nextBillDate: addDays(now, 1),
      notes: "SALARY_RULE|period=DAILY",
      createdAt: from,
      updatedAt: from,
    },
  });

  // Employee 3: Monthly fixed 34000 DA
  const empMonthlyName = "Employee Monthly 34000";
  const empMonthly = await prisma.bill.create({
    data: {
      title: empMonthlyName,
      type: "SALARY",
      amount: 34000 * 100,
      duration: "1_MONTH",
      nextBillDate: addMonths(now, 1),
      notes: "SALARY_RULE|period=MONTHLY",
      createdAt: from,
      updatedAt: from,
    },
  });

  // Payments: createMany for performance.
  const salaryPayments: any[] = [];

  // Daily employees: one payment per day for 2 years.
  for (let i = 0; i < days; i++) {
    const d = addDays(from, i);
    d.setHours(12, 0, 0, 0);
    const iso = toISODate(d);

    const profitCentimes = profitCentimesByISO.get(iso) ?? 0;
    const profitDA = Math.floor(profitCentimes / 100);
    const amountDA30 = Math.max(0, Math.round((profitDA * 30) / 100));
    const amountCentimes30 = amountDA30 * 100;

    salaryPayments.push({
      billId: empPct.id,
      amount: Math.max(0, amountCentimes30),
      paidDate: d,
      notes: `Salary | Daily | ${iso} | 30% of profit`,
      createdAt: d,
    });

    salaryPayments.push({
      billId: empDaily.id,
      amount: 2000 * 100,
      paidDate: d,
      notes: `Salary | Daily | ${iso} | By Amount`,
      createdAt: d,
    });
  }

  // Monthly employee: one payment per month for 2 years (24 months).
  const months = 24;
  for (let m = 0; m < months; m++) {
    const d = addMonths(from, m);
    d.setHours(12, 0, 0, 0);
    const iso = toISODate(d);
    salaryPayments.push({
      billId: empMonthly.id,
      amount: 34000 * 100,
      paidDate: d,
      notes: `Salary | Monthly | ${iso} | By Amount`,
      createdAt: d,
    });
  }

  await prisma.billPayment.createMany({
    data: salaryPayments,
  });

  console.log(`   - Salary bills created: 3`);
  console.log(`   - Salary payments created: ${salaryPayments.length}`);
}

async function createBillPayments(prisma: PrismaClient, bill: Bill, startDate: Date, paymentsPerBill: number) {
  const payments = [];
  const billAmount = bill.amount;
  // Generate DA price total paid amount (last digit 0)
  const totalPaidAmount = generateDAPrice(
    Math.floor(billAmount / 100 * 0.3), // At least 30% paid (convert from centimes to DA)
    Math.floor(billAmount / 100 * 2) // Up to 200% paid (convert from centimes to DA)
  ); // Returns in centimes with last digit 0

  // Distribute the total paid amount across paymentsPerBill payments
  let remainingAmount = totalPaidAmount;
  
  for (let i = 0; i < paymentsPerBill; i++) {
    let paymentAmount: number;
    
    if (i === paymentsPerBill - 1) {
      // Last payment gets the remaining amount
      paymentAmount = remainingAmount;
    } else {
      // Random amount, but ensure we don't exceed remaining
      const maxPayment = Math.floor(remainingAmount / (paymentsPerBill - i));
      const minPayment = Math.floor(maxPayment * 0.1);
      paymentAmount = generateDAPrice(
        Math.max(1, Math.floor(minPayment / 100)), // Convert to DA, min 1 DA
        Math.floor(maxPayment / 100) // Convert to DA
      ); // Returns in centimes with last digit 0
    }

    // Ensure payment amount is positive and in DA format (last digit 0)
    paymentAmount = Math.max(100, paymentAmount); // Min 1 DA (100 centimes)
    remainingAmount -= paymentAmount;

    // Generate payment date (spread over time since bill creation)
    const paymentDate = faker.date.between({
      from: startDate,
      to: new Date()
    });

    const payment = await prisma.billPayment.create({
      data: {
        billId: bill.id,
        amount: paymentAmount,
        paidDate: paymentDate,
        notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
        createdAt: paymentDate,
      },
    });

    payments.push(payment);
  }

  return payments;
}
