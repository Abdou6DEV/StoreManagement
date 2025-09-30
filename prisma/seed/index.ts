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
    console.log(`📊 Created:`);
    console.log(`   - Categories`);
    console.log(`   - 180 sellers`);
    console.log(`   - 6,000 products with purchases`);
    console.log(`   - 300 clients`);
    console.log(`   - 48 services`);
    console.log(`   - 40 service appointments (20 incomplete, 20 completed)`);
    console.log(
      `   - 1,200 sales with items (including manual products and services)`,
    );
    console.log(`   - Multiple payments`);
    console.log(`   - 20 bills with 200 payments`);
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
