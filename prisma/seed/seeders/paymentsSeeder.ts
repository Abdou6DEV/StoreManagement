import { PrismaClient, Sale } from "@prisma/client";
import { faker } from "@faker-js/faker";

export async function seedPayments(prisma: PrismaClient, sales: Sale[]) {
  console.log("💳 Creating random payments...");

  // Get all existing payments to avoid duplicates
  const existingPayments = await prisma.payment.findMany({
    select: { saleId: true },
  });
  const existingSaleIds = new Set(existingPayments.map(p => p.saleId).filter(Boolean));

  let paymentCount = 0;
  for (const sale of sales) {
    if (!sale.clientId) continue;
    
    // Skip if this sale already has a payment
    if (existingSaleIds.has(sale.id)) continue;
    
    if (faker.datatype.boolean() && faker.datatype.boolean()) continue;
    const saleItems = await prisma.saleItem.findMany({
      where: { saleId: sale.id },
    });
    const saleTotal =
      saleItems.reduce((sum, item) => sum + item.price * item.quantity, 0) -
      sale.discount;
    const givenAmount =
      saleTotal > 0 ? faker.number.int({ min: 0, max: saleTotal }) : 0;
    const type = faker.helpers.arrayElement(["CREDIT", "VERSEMENT"]);
    const dueDate = faker.date.soon({ days: 30 });
    let paidDate = null;
    if (faker.datatype.boolean()) {
      paidDate = faker.date.between({ from: new Date(), to: dueDate });
    }
    await prisma.payment.create({
      data: {
        saleId: sale.id,
        clientId: sale.clientId,
        givenAmount,
        dueDate: dueDate,
        paidDate,
        type,
      },
    });
    paymentCount++;
    
    // Add this sale to the existing set to prevent duplicates in the same run
    existingSaleIds.add(sale.id);
  }

  console.log(`   - ${paymentCount} payments created`);
}
