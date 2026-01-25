import { PrismaClient, Sale } from "@prisma/client";
import { faker } from "@faker-js/faker";

export async function seedPayments(prisma: PrismaClient, sales: Sale[]) {
  console.log("💳 Creating payments...");

  // Get all existing payments to avoid duplicates
  const existingPayments = await prisma.payment.findMany({
    select: { saleId: true },
  });
  const existingSaleIds = new Set(existingPayments.map(p => p.saleId).filter(Boolean));

  // Create 10 credit or versement payments total
  // 1 overdue, 1 due soon, 8 normal
  const totalPaymentsToCreate = 10;
  const salesWithClients = sales.filter(sale => sale.clientId && !existingSaleIds.has(sale.id));
  
  if (salesWithClients.length === 0) {
    console.log("   ⚠️  No sales with clients found. Skipping payments.");
    return;
  }

  // Select random sales with clients (need at least 10)
  const selectedSales = faker.helpers.arrayElements(
    salesWithClients,
    Math.min(totalPaymentsToCreate, salesWithClients.length)
  );

  let paymentCount = 0;
  let overdueCreated = false;
  let dueSoonCreated = false;

  for (let i = 0; i < selectedSales.length; i++) {
    const sale = selectedSales[i];
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
    
    let dueDate: Date;
    let paidDate: Date | null = null;
    
    // Create 1 overdue payment
    if (!overdueCreated && i === 0) {
      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() - 5); // 5 days ago (overdue)
      overdueCreated = true;
    }
    // Create 1 due soon payment
    else if (!dueSoonCreated && i === 1) {
      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + faker.number.int({ min: 1, max: 2 })); // 1-2 days from now (due soon)
      dueSoonCreated = true;
    }
    // Normal payments
    else {
      dueDate = faker.date.soon({ days: 30 });
      if (faker.datatype.boolean()) {
        paidDate = faker.date.between({ from: new Date(), to: dueDate });
      }
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

  console.log(`   - ${paymentCount} payments created`);
  console.log(`   - 1 overdue payment, 1 due soon payment`);
}
