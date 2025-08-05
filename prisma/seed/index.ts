import { PrismaClient } from "@prisma/client";
import { seedCategories } from "./seeders/categoriesSeeder";
import { seedSellers } from "./seeders/sellersSeeder";
import { seedProducts } from "./seeders/productsSeeder";
import { seedClients } from "./seeders/clientsSeeder";
import { seedSales } from "./seeders/salesSeeder";
import { seedPayments } from "./seeders/paymentsSeeder";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Seed in order of dependencies
  await seedCategories(prisma);
  const sellers = await seedSellers(prisma);
  const products = await seedProducts(prisma, sellers);
  await seedClients(prisma);
  const sales = await seedSales(prisma, products);
  await seedPayments(prisma, sales);

  console.log("✅ Seed completed successfully!");
  console.log(`📊 Created:`);
  console.log(`   - Categories`);
  console.log(`   - 30 sellers`);
  console.log(`   - 1,000 products with purchases`);
  console.log(`   - 50 clients`);
  console.log(`   - 200 sales with items (including manual products)`);
  console.log(`   - Multiple payments`);
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
