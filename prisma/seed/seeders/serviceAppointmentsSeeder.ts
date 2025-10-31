import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const serviceTypes = [
  "Haircut",
  "Hair Coloring", 
  "Hair Styling",
  "Manicure",
  "Pedicure",
  "Facial Treatment",
  "Massage",
  "Consultation",
  "Hair Wash",
  "Hair Treatment",
  "Eyebrow Shaping",
  "Eyelash Extension",
  "Makeup Application",
  "Skin Analysis",
  "Acne Treatment",
  "Anti-Aging Treatment",
  "Body Scrub",
  "Body Wrap",
  "Hot Stone Massage",
  "Deep Tissue Massage",
  "Swedish Massage",
  "Aromatherapy",
  "Reflexology",
  "Nail Art",
  "Gel Manicure",
  "Acrylic Nails",
  "Nail Repair",
  "Cuticle Care",
  "Hair Extensions",
  "Hair Perm",
  "Hair Straightening",
  "Hair Highlights",
  "Hair Lowlights",
  "Hair Ombre",
  "Hair Balayage",
  "Hair Bleaching",
  "Hair Toning",
  "Hair Glossing",
  "Hair Keratin Treatment",
  "Hair Brazilian Blowout",
  "Hair Scalp Treatment",
  "Hair Dandruff Treatment",
  "Hair Loss Treatment",
  "Hair Growth Treatment",
  "Hair Color Correction",
  "Hair Consultation",
  "Hair Styling for Events",
  "Bridal Hair",
  "Hair Updo",
  "Hair Braiding",
];

const serviceDescriptions = [
  "Professional service with high quality materials",
  "Expert treatment using premium products",
  "Comprehensive service with detailed consultation",
  "Specialized treatment for optimal results",
  "Customized service based on client needs",
  "Advanced technique for best outcomes",
  "Thorough treatment with follow-up care",
  "Professional service with modern equipment",
  "Personalized approach for each client",
  "Expert care with attention to detail",
];

export async function seedServiceAppointments(prisma: PrismaClient) {
  console.log("📅 Creating service appointments...");

  // Get all clients for random assignment
  const clients = await prisma.client.findMany({
    select: { id: true }
  });

  if (clients.length === 0) {
    console.log("⚠️  No clients found. Please seed clients first.");
    return;
  }

  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  // Create a larger number of service appointments
  console.log("   - Creating 5 incomplete service appointments...");
  const incompleteAppointments = [];
  
  for (let i = 0; i < 5; i++) {
    const serviceName = faker.helpers.arrayElement(serviceTypes);
    const dueDate = faker.date.future({ years: 1 });
    const randomClient = faker.helpers.arrayElement(clients);

    incompleteAppointments.push({
      name: `${serviceName} #${i + 1}`,
      serviceType: serviceName,
      description: faker.helpers.arrayElement(serviceDescriptions),
      costPrice: faker.number.int({ min: 20, max: 200 }) * 100,
      servicePrice: faker.number.int({ min: 30, max: 300 }) * 100,
      clientId: randomClient.id,
      dueDate: dueDate,
      notes: faker.helpers.maybe(() => faker.lorem.sentence(), {
        probability: 0.4,
      }),
      isCompleted: false,
      createdAt: faker.date.between({ from: twoYearsAgo, to: new Date() }),
    });
  }

  await prisma.serviceAppointment.createMany({
    data: incompleteAppointments,
  });

  console.log("   - Creating 95 completed service appointments...");
  const completedAppointments = [];
  
  for (let i = 0; i < 95; i++) {
    const serviceName = faker.helpers.arrayElement(serviceTypes);
    const completedDate = faker.date.between({ from: oneYearAgo, to: new Date() });
    const dueDate = faker.date.between({ 
      from: new Date(completedDate.getTime() - 7 * 24 * 60 * 60 * 1000),
      to: completedDate 
    });
    const randomClient = faker.helpers.arrayElement(clients);

    completedAppointments.push({
      name: `${serviceName} #${i + 1}`,
      serviceType: serviceName,
      description: faker.helpers.arrayElement(serviceDescriptions),
      costPrice: faker.number.int({ min: 20, max: 200 }) * 100,
      servicePrice: faker.number.int({ min: 30, max: 300 }) * 100,
      clientId: randomClient.id,
      dueDate: dueDate,
      notes: faker.helpers.maybe(() => faker.lorem.sentence(), {
        probability: 0.4,
      }),
      isCompleted: true,
      completedAt: completedDate,
      createdAt: faker.date.between({ from: twoYearsAgo, to: completedDate }),
    });
  }

  await prisma.serviceAppointment.createMany({
    data: completedAppointments,
  });

  console.log(`   - 100 service appointments created (5 incomplete, 95 completed)`);
}

