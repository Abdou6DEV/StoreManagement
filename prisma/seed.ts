import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Generate unique categories using Faker's commerce departments
  const categories = Array.from(
    new Set(Array.from({ length: 10 }, () => faker.commerce.department())),
  );

  console.log("📂 Creating categories...");
  // Create categories
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
  // Generate 1,000 realistic test products
  for (let i = 0; i < 1000; i++) {
    const category = faker.helpers.arrayElement(categories);

    // Use Faker's predefined commerce product names
    const productName = faker.commerce.productName();

    const boughtPrice = faker.commerce.price({
      min: 50,
      max: 2000,
      dec: 0,
    });
    const markupPercentage = faker.number.float({ min: 1.1, max: 1.8 }); // 10-80% markup
    const sellingPrice = Math.floor(Number(boughtPrice) * markupPercentage);

    await prisma.product.create({
      data: {
        name: productName,
        categoryName: category,
        quantity: faker.number.int({ min: 1, max: 150 }),
        bought: Number(boughtPrice),
        selling: sellingPrice,
        codebar: faker.string.numeric(12), // 12-digit barcode
      },
    });

    // Update progress every 100 products
    if ((i + 1) % 100 === 0) {
      console.log(`Generated ${i + 1} products...`);
    }
  }

  console.log("👥 Creating sample clients...");
  // Generate some sample clients
  for (let i = 0; i < 50; i++) {
    await prisma.client.create({
      data: {
        name: faker.person.fullName(),
        phone: faker.phone.number(),
        address: faker.location.streetAddress({ useFullAddress: true }),
        notes: faker.helpers.maybe(() => faker.lorem.sentence(), {
          probability: 0.3,
        }),
      },
    });
  }

  console.log("🛒 Creating sample sales...");
  // Generate some sample sales
  const clients = await prisma.client.findMany();
  const products = await prisma.product.findMany();
  const sales = [];

  for (let i = 0; i < 200; i++) {
    const client = faker.helpers.maybe(
      () => faker.helpers.arrayElement(clients),
      { probability: 0.7 },
    );
    const saleItemsCount = faker.number.int({ min: 1, max: 5 });

    const sale = await prisma.sale.create({
      data: {
        clientId: client?.id,
        discount: faker.number.int({ min: 0, max: 20 }),
      },
    });
    sales.push({ ...sale, clientId: client?.id });

    // Add items to the sale
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

  // === Generate random payments for some sales ===
  console.log("💳 Creating random payments...");
  let paymentCount = 0;
  for (const sale of sales) {
    // Only create payments for sales with a client
    if (!sale.clientId) continue;
    // 60% of sales get a payment
    if (faker.datatype.boolean() && faker.datatype.boolean()) continue;
    // Only one payment per sale
    const paidAmount = faker.number.int({ min: 100, max: 10000 });
    const type = faker.helpers.arrayElement(["CREDIT", "VERSEMENT"]);
    const dueDate = faker.date.soon({ days: 30 });
    // 50% chance paidAt is set, and always between now and dueDate
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
