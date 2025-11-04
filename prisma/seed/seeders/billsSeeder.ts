import { PrismaClient, Bill } from "@prisma/client";
import { faker } from "@faker-js/faker";

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

  // Create only 5 bills with 100 payments total (20 payments per bill)
  const totalBills = 5;
  const paymentsPerBill = 20;

  for (let i = 0; i < totalBills; i++) {
    const billType = faker.helpers.arrayElement(billTypes);
    // Generate clean integer amounts (100, 200, 360, etc.) - no decimals
    const amount = Math.round(faker.number.int({ min: 10000, max: 500000 }) / 100) * 100; // Round to nearest 100
    const duration = faker.helpers.arrayElement(durations);
    
    // Calculate next bill date based on duration
    let nextBillDate = new Date();
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

    // Create paymentsPerBill (20) payments for this bill
    await createBillPayments(prisma, bill, twoYearsAgo, paymentsPerBill);
  }

  console.log(`   - ${bills.length} bills created`);
  
  // Count total payments created
  const totalPayments = await prisma.billPayment.count();
  console.log(`   - ${totalPayments} bill payments created (${paymentsPerBill} per bill)`);

  return bills;
}

async function createBillPayments(prisma: PrismaClient, bill: Bill, startDate: Date, paymentsPerBill: number) {
  const payments = [];
  const billAmount = bill.amount;
  // Generate clean integer total paid amount
  const totalPaidAmount = Math.round(faker.number.int({ 
    min: Math.floor(billAmount * 0.3), // At least 30% paid
    max: billAmount * 2 // Up to 200% paid (overpaid)
  }) / 100) * 100; // Round to nearest 100

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
      paymentAmount = Math.round(faker.number.int({ 
        min: Math.floor(maxPayment * 0.1), // At least 10% of max
        max: maxPayment 
      }) / 100) * 100; // Round to nearest 100
    }

    // Ensure payment amount is positive and rounded to nearest 100
    paymentAmount = Math.max(100, Math.round(paymentAmount / 100) * 100);
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
