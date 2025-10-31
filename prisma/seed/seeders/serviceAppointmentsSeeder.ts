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

const phoneNames = [
  "iPhone 15 Pro Max",
  "iPhone 15 Pro",
  "iPhone 15",
  "iPhone 14 Pro Max",
  "iPhone 14 Pro",
  "iPhone 14",
  "iPhone 13 Pro Max",
  "iPhone 13 Pro",
  "iPhone 13",
  "iPhone 12 Pro Max",
  "iPhone 12 Pro",
  "iPhone 12",
  "iPhone 11 Pro Max",
  "iPhone 11 Pro",
  "iPhone 11",
  "iPhone XS Max",
  "iPhone XS",
  "iPhone XR",
  "Samsung Galaxy S24 Ultra",
  "Samsung Galaxy S24+",
  "Samsung Galaxy S24",
  "Samsung Galaxy S23 Ultra",
  "Samsung Galaxy S23+",
  "Samsung Galaxy S23",
  "Samsung Galaxy S22 Ultra",
  "Samsung Galaxy S22+",
  "Samsung Galaxy S22",
  "Samsung Galaxy Note 20",
  "Samsung Galaxy Note 10",
  "Samsung Galaxy A54",
  "Samsung Galaxy A34",
  "Samsung Galaxy A14",
  "Samsung Galaxy Z Fold 5",
  "Samsung Galaxy Z Flip 5",
  "Google Pixel 8 Pro",
  "Google Pixel 8",
  "Google Pixel 7 Pro",
  "Google Pixel 7",
  "Google Pixel 6 Pro",
  "Google Pixel 6",
  "OnePlus 12",
  "OnePlus 11",
  "OnePlus 10 Pro",
  "OnePlus 9 Pro",
  "Xiaomi 14 Pro",
  "Xiaomi 14",
  "Xiaomi 13 Pro",
  "Xiaomi 13",
  "Xiaomi Redmi Note 13",
  "Xiaomi Redmi Note 12",
  "Huawei P60 Pro",
  "Huawei P50 Pro",
  "Huawei Mate 60 Pro",
  "Huawei Mate 50 Pro",
  "Oppo Find X6 Pro",
  "Oppo Find X5 Pro",
  "Oppo Reno 11",
  "Vivo X100 Pro",
  "Vivo X90 Pro",
  "Realme GT 5",
  "Realme GT 4",
  "Motorola Edge 40",
  "Motorola Edge 30",
  "Sony Xperia 1 V",
  "Sony Xperia 5 V",
];

const phoneProblems = [
  "Screen cracked",
  "Battery not charging",
  "Screen black but phone turns on",
  "Touch screen not working",
  "Water damage",
  "Speaker not working",
  "Microphone not working",
  "Camera not focusing",
  "Camera blurry",
  "Back camera broken",
  "Front camera broken",
  "Charging port damaged",
  "Phone won't turn on",
  "Phone keeps restarting",
  "Screen flickering",
  "Screen dead pixels",
  "Back glass cracked",
  "Home button not working",
  "Volume buttons stuck",
  "Power button not working",
  "Headphone jack not working",
  "SIM card slot not reading",
  "Phone overheating",
  "Battery draining fast",
  "WiFi not connecting",
  "Bluetooth not working",
  "Network signal issues",
  "App crashes",
  "Phone slow/freezing",
  "Storage full",
  "Face ID not working",
  "Fingerprint sensor not working",
  "No sound from speaker",
  "Low sound volume",
  "Screen unresponsive",
  "Buttons not responding",
  "Phone gets hot while charging",
  "Won't hold charge",
  "Back cover coming off",
  "Display colors distorted",
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
      description: faker.helpers.arrayElement(phoneNames),
      costPrice: faker.number.int({ min: 20, max: 200 }) * 100,
      servicePrice: faker.number.int({ min: 30, max: 300 }) * 100,
      clientId: randomClient.id,
      dueDate: dueDate,
      notes: faker.helpers.maybe(() => faker.helpers.arrayElement(phoneProblems), {
        probability: 0.8,
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
      description: faker.helpers.arrayElement(phoneNames),
      costPrice: faker.number.int({ min: 20, max: 200 }) * 100,
      servicePrice: faker.number.int({ min: 30, max: 300 }) * 100,
      clientId: randomClient.id,
      dueDate: dueDate,
      notes: faker.helpers.maybe(() => faker.helpers.arrayElement(phoneProblems), {
        probability: 0.8,
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

