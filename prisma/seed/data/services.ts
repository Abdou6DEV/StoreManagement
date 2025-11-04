import { PrismaClient } from "@prisma/client";

// Only 2 services for mobile phone shop: réparation and flash
export async function seedServices(prisma: PrismaClient) {
  const services = [
    {
      name: "réparation",
      description: "Phone repair service - fixing broken screens, batteries, charging ports, and other hardware issues",
    },
    {
      name: "flash",
      description: "Phone flashing service - installing custom ROMs, firmware updates, and unlocking phones",
    },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { name: service.name },
      update: service,
      create: service,
    });
  }

  console.log("✅ 2 services seeded successfully (réparation & flash)");
}
