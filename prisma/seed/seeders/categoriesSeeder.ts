import { PrismaClient } from "@prisma/client";
import { predefinedCategories } from "../data/index";

export async function seedCategories(prisma: PrismaClient) {
  console.log("📂 Creating categories...");

  for (const categoryName of predefinedCategories) {
    await prisma.category.upsert({
      where: { name: categoryName },
      update: {},
      create: {
        name: categoryName,
      },
    });
  }

  console.log(`   - ${predefinedCategories.length} categories created`);
}
