import { PrismaClient, Sale } from "@prisma/client";
import { faker } from "@faker-js/faker";

export async function seedPayments(prisma: PrismaClient, sales: Sale[]) {
  console.log("💳 Creating random payments...");

  let paymentCount = 0;
  for (const sale of sales) {
    if (!sale.clientId) continue;
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
  }

  console.log(`   - ${paymentCount} payments created`);
}
