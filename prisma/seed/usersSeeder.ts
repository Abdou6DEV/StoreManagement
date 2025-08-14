import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const seedUsers = async () => {
  console.log("🌱 Seeding users...");

  try {
    // Check if users already exist
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      console.log("Users already exist, skipping user seeding");
      return;
    }

    // Create admin user
    const adminPassword = await bcrypt.hash("admin123", 10);
    const adminUser = await prisma.user.create({
      data: {
        username: "admin",
        email: "admin@store.com",
        password: adminPassword,
        role: UserRole.ADMIN,
        isActive: true,
      },
    });

    // Create regular user
    const userPassword = await bcrypt.hash("user123", 10);
    const regularUser = await prisma.user.create({
      data: {
        username: "user",
        email: "user@store.com",
        password: userPassword,
        role: UserRole.USER,
        isActive: true,
      },
    });

    console.log(`✅ Created admin user: ${adminUser.username}`);
    console.log(`✅ Created regular user: ${regularUser.username}`);
    console.log("🎉 User seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding users:", error);
    throw error;
  }
};
