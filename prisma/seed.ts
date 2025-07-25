import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  const categories = Array.from(
    new Set(Array.from({ length: 50 }, () => faker.commerce.department())),
  );

  console.log("📂 Creating categories...");
  for (const categoryName of categories) {
    await prisma.category.upsert({
      where: { name: categoryName },
      update: {},
      create: {
        name: categoryName,
      },
    });
  }

  console.log("📦 Generating products...");
  for (let i = 0; i < 1000; i++) {
    const category = faker.helpers.arrayElement(categories);
    const productName = `${faker.commerce.productName()} ${faker.string.alphanumeric(4)}`;
    const boughtPrice = faker.commerce.price({
      min: 50,
      max: 2000,
      dec: 0,
    });
    const markupPercentage = faker.number.float({ min: 1.1, max: 1.8 });
    const sellingPrice = Math.floor(Number(boughtPrice) * markupPercentage);
    await prisma.product.create({
      data: {
        name: productName,
        categoryName: category,
        quantity: faker.number.int({ min: 1, max: 150 }),
        bought: Number(boughtPrice),
        selling: sellingPrice,
        codebar: faker.string.numeric(12),
      },
    });
    if ((i + 1) % 100 === 0) {
      console.log(`Generated ${i + 1} products...`);
    }
  }

  console.log("👥 Creating sample clients...");
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  for (let i = 0; i < 50; i++) {
    await prisma.client.create({
      data: {
        name: `${faker.person.fullName()} ${faker.string.alphanumeric(3)}`,
        phone: faker.phone.number(),
        address: faker.location.streetAddress({ useFullAddress: true }),
        notes: faker.helpers.maybe(() => faker.lorem.sentence(), {
          probability: 0.3,
        }),
        createdAt: faker.date.between({ from: twoYearsAgo, to: new Date() }),
      },
    });
  }

  console.log("🛒 Creating sample sales...");
  const clients = await prisma.client.findMany();
  const products = await prisma.product.findMany();
  const sales = [];

  for (let i = 0; i < 200; i++) {
    const client = faker.helpers.maybe(
      () => faker.helpers.arrayElement(clients),
      { probability: 0.7 },
    );
    const saleItemsCount = faker.number.int({ min: 1, max: 5 });
    const saleCreatedAt = faker.date.between({
      from: twoYearsAgo,
      to: new Date(),
    });
    const sale = await prisma.sale.create({
      data: {
        clientId: client?.id,
        discount: faker.number.int({ min: 0, max: 20 }),
        createdAt: saleCreatedAt,
      },
    });
    sales.push({ ...sale, clientId: client?.id });
    const saleProducts = faker.helpers.arrayElements(products, saleItemsCount);
    for (const product of saleProducts) {
      const quantity = faker.number.int({ min: 1, max: 5 });
      await prisma.saleItem.create({
        data: {
          productId: product.id,
          saleId: sale.id,
          quantity,
          price: product.selling,
        },
      });
    }
  }

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
    const paidAmount =
      saleTotal > 0 ? faker.number.int({ min: 0, max: saleTotal }) : 0;
    const type = faker.helpers.arrayElement(["CREDIT", "VERSEMENT"]);
    const dueDate = faker.date.soon({ days: 30 });
    let paidAt = null;
    if (faker.datatype.boolean()) {
      paidAt = faker.date.between({ from: new Date(), to: dueDate });
    }
    await prisma.payment.create({
      data: {
        saleId: sale.id,
        clientId: sale.clientId,
        paidAmount,
        dueAt: dueDate,
        paidAt,
        type,
      },
    });
    paymentCount++;
  }
  console.log(`   - ${paymentCount} payments`);

  console.log("✅ Seed completed successfully!");
  console.log(`📊 Created:`);
  console.log(`   - ${categories.length} categories`);
  console.log(`   - 1,000 products`);
  console.log(`   - 50 clients`);
  console.log(`   - 200 sales with items`);
  console.log(`   - ${paymentCount} payments`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
