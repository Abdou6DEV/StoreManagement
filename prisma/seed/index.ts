import { PrismaClient } from "@prisma/client";
import { seedCategories } from "./seeders/categoriesSeeder";
import { seedClients } from "./seeders/clientsSeeder";
import { seedPayments } from "./seeders/paymentsSeeder";
import { seedProducts } from "./seeders/productsSeeder";
import { seedSales } from "./seeders/salesSeeder";
import { seedSellers } from "./seeders/sellersSeeder";
import { seedBills } from "./seeders/billsSeeder";
import { seedServices } from "./data/services";
import { seedServiceAppointments, associateCompletedServicesWithSales } from "./seeders/serviceAppointmentsSeeder";

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
    await associateCompletedServicesWithSales(prisma); // Associate completed services with sales
    await seedPayments(prisma, sales);
    await seedBills(prisma);

    console.log("✅ Seed completed successfully!");
    console.log(`📊 Created (mobile phone shop data):`);
    console.log(`   - 17 mobile phone shop categories`);
    console.log(`   - Sellers`);
    console.log(`   - 2,000 mobile phone products`);
    console.log(`   - 100 clients (Algerian names)`);
    console.log(`   - 2 services (réparation & flash)`);
    console.log(`   - 107 service appointments (100 completed+sold, 5 incomplete, 2 completed+not sold)`);
    console.log(`   - 3 years of sales (3-4 sales/day, 5-6 items/sale, 30% with clients)`);
    console.log(`   - 10 credit/versement payments`);
    console.log(`   - 7 bills with 100 payments total (1 overdue, 1 due soon)`);
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
