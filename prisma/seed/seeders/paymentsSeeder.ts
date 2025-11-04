import { PrismaClient, Sale } from "@prisma/client";
import { faker } from "@faker-js/faker";

export async function seedPayments(prisma: PrismaClient, sales: Sale[]) {
  console.log("💳 Creating payments...");

  // Get all existing payments to avoid duplicates
  const existingPayments = await prisma.payment.findMany({
    select: { saleId: true },
  });
  const existingSaleIds = new Set(existingPayments.map(p => p.saleId).filter(Boolean));

  // Only create 10 credit or versement payments total
  const totalPaymentsToCreate = 10;
  const salesWithClients = sales.filter(sale => sale.clientId && !existingSaleIds.has(sale.id));
  
  if (salesWithClients.length === 0) {
    console.log("   ⚠️  No sales with clients found. Skipping payments.");
    return;
  }

  // Select random sales with clients (up to 10)
  const selectedSales = faker.helpers.arrayElements(
    salesWithClients,
    Math.min(totalPaymentsToCreate, salesWithClients.length)
  );

  let paymentCount = 0;
  for (const sale of selectedSales) {
    if (!sale.clientId) continue;
    if (existingSaleIds.has(sale.id)) continue;
    
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
    
    existingSaleIds.add(sale.id);
  }

  console.log(`   - ${paymentCount} payments created (${totalPaymentsToCreate} requested)`);
}
