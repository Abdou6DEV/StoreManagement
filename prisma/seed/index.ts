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
    console.log(`📊 Created (mobile phone shop data):`);
    console.log(`   - Mobile phone shop categories`);
    console.log(`   - Sellers`);
    console.log(`   - 7,000 mobile phone products`);
    console.log(`   - 100 clients`);
    console.log(`   - 2 services (réparation & flash)`);
    console.log(`   - 100 service appointments (only réparation & flash)`);
    console.log(`   - 10,000 sales (1% with clients = 100 sales with clients)`);
    console.log(`   - 10 credit/versement payments`);
    console.log(`   - 5 bills with 100 payments total (20 per bill)`);
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
