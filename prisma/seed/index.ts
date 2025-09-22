import { PrismaClient } from "@prisma/client";
import { seedCategories } from "./seeders/categoriesSeeder";
import { seedClients } from "./seeders/clientsSeeder";
import { seedPayments } from "./seeders/paymentsSeeder";
import { seedProducts } from "./seeders/productsSeeder";
import { seedSales } from "./seeders/salesSeeder";
import { seedSellers } from "./seeders/sellersSeeder";
import { seedBills } from "./seeders/billsSeeder";
import { seedUsers } from "./usersSeeder";
import { seedServices } from "./data/services";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  try {
    // Seed users first (required for authentication)
    await seedUsers();

    // Seed in order of dependencies
    await seedCategories(prisma);
    const sellers = await seedSellers(prisma);
    const products = await seedProducts(prisma, sellers);
    await seedClients(prisma);
    await seedServices(prisma);
    const sales = await seedSales(prisma, products);
    await seedPayments(prisma, sales);
    await seedBills(prisma);

    console.log("✅ Seed completed successfully!");
    console.log(`📊 Created:`);
    console.log(`   - Users (admin and regular)`);
    console.log(`   - Categories`);
    console.log(`   - 180 sellers`);
    console.log(`   - 6,000 products with purchases`);
    console.log(`   - 300 clients`);
    console.log(`   - 48 services`);
    console.log(
      `   - 1,200 sales with items (including manual products and services)`,
    );
    console.log(`   - Multiple payments`);
    console.log(`   - 20 bills with 200 payments`);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  }
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
