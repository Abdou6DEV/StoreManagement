import { PrismaClient } from "@prisma/client";

export async function seedServices(prisma: PrismaClient) {
  const services = [
    {
      name: "Haircut",
      description: "Professional haircut service",
    },
    {
      name: "Hair Coloring",
      description: "Hair coloring and dyeing service",
    },
    {
      name: "Hair Styling",
      description: "Professional hair styling for special occasions",
    },
    {
      name: "Manicure",
      description: "Nail care and manicure service",
    },
    {
      name: "Pedicure",
      description: "Foot care and pedicure service",
    },
    {
      name: "Facial Treatment",
      description: "Professional facial care and treatment",
    },
    {
      name: "Massage",
      description: "Relaxing massage service",
    },
    {
      name: "Consultation",
      description: "Professional consultation service",
    },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { name: service.name },
      update: service,
      create: service,
    });
  }

  console.log("✅ Services seeded successfully");
}
