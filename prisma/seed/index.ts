import { PrismaClient } from "@prisma/client";
import { seedCategories } from "./seeders/categoriesSeeder";
import { seedClients } from "./seeders/clientsSeeder";
import { seedPayments } from "./seeders/paymentsSeeder";
import { seedProducts } from "./seeders/productsSeeder";
import { seedSales } from "./seeders/salesSeeder";
import { seedSellers } from "./seeders/sellersSeeder";
import { seedBills } from "./seeders/billsSeeder";
import { seedServices } from "./data/services";
import { seedServiceAppointments } from "./seeders/serviceAppointmentsSeeder";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  try {
    // Note: Admin account (admin/admin) is hardcoded in the app
    // Additional users can be created through the Administrator panel

    // Seed in order of dependencies
    await seedCategories(prisma);
    const sellers = await seedSellers(prisma);
    const products = await seedProducts(prisma, sellers);
    await seedClients(prisma);
    await seedServices(prisma);
    await seedServiceAppointments(prisma);
    const sales = await seedSales(prisma, products);
    await seedPayments(prisma, sales);
    await seedBills(prisma);

    console.log("✅ Seed completed successfully!");
    console.log(`📊 Created (realistic store data for testing):`);
    console.log(`   - Categories`);
    console.log(`   - 180 sellers`);
    console.log(`   - 100 products with 200 purchases`);
    console.log(`   - 2,000 clients`);
    console.log(`   - 48 services`);
    console.log(`   - 100 service appointments (5 incomplete, 95 completed)`);
    console.log(
      `   - 100 sales with items (including manual products and services)`,
    );
    console.log(`   - Multiple payments`);
    console.log(`   - 100 bills with payments`);
    console.log(`   - Admin account (admin/admin) is hardcoded in the app`);
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
