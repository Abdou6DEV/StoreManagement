import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { generateDAPrice } from "../utils/generators";

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

  // Get services - should only be "réparation" and "flash"
  const services = await prisma.service.findMany({
    where: {
      name: { in: ["réparation", "flash"] }
    }
  });

  if (services.length === 0) {
    console.log("⚠️  Services 'réparation' and 'flash' not found. Please seed services first.");
    return;
  }

  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  // Create service appointments:
  // - 100 completed services that WILL be sold (through 3 years of sales)
  // - 5 incomplete services
  // - 2 completed but NOT sold services
  const completedAndSoldCount = 100;
  const incompleteCount = 5;
  const completedNotSoldCount = 2;
  const totalAppointments = completedAndSoldCount + incompleteCount + completedNotSoldCount;

  console.log(`   - Creating ${incompleteCount} incomplete service appointments...`);
  const incompleteAppointments = [];
  
  for (let i = 0; i < incompleteCount; i++) {
    const service = faker.helpers.arrayElement(services);
    const dueDate = faker.date.future({ years: 1 });
    const randomClient = faker.helpers.arrayElement(clients);

    incompleteAppointments.push({
      name: `${service.name} #${i + 1}`,
      serviceType: service.name,
      description: faker.helpers.arrayElement(phoneNames),
      costPrice: generateDAPrice(20, 200), // 20-200 DA in centimes (last digit 0)
      servicePrice: generateDAPrice(30, 300), // 30-300 DA in centimes (last digit 0)
      clientId: randomClient.id,
      dueDate: dueDate,
      notes: faker.helpers.maybe(() => faker.helpers.arrayElement(phoneProblems), {
        probability: 0.8,
      }),
      isCompleted: false,
      createdAt: faker.date.between({ from: threeYearsAgo, to: new Date() }),
    });
  }

  await prisma.serviceAppointment.createMany({
    data: incompleteAppointments,
  });

  // Create 2 completed but NOT sold services FIRST (so they're not picked up when we associate)
  console.log(`   - Creating ${completedNotSoldCount} completed but NOT sold service appointments...`);
  const completedNotSoldAppointments = [];
  
  for (let i = 0; i < completedNotSoldCount; i++) {
    const service = faker.helpers.arrayElement(services);
    const completedDate = faker.date.between({ from: threeYearsAgo, to: new Date() });
    const dueDate = faker.date.between({ 
      from: new Date(completedDate.getTime() - 7 * 24 * 60 * 60 * 1000),
      to: completedDate 
    });
    const randomClient = faker.helpers.arrayElement(clients);

    completedNotSoldAppointments.push({
      name: `${service.name} NOT SOLD #${i + 1}`,
      serviceType: service.name,
      description: faker.helpers.arrayElement(phoneNames),
      costPrice: generateDAPrice(20, 200),
      servicePrice: generateDAPrice(30, 300),
      clientId: randomClient.id,
      dueDate: dueDate,
      notes: faker.helpers.maybe(() => faker.helpers.arrayElement(phoneProblems), {
        probability: 0.8,
      }),
      isCompleted: true,
      completedAt: completedDate,
      createdAt: faker.date.between({ from: threeYearsAgo, to: completedDate }),
    });
  }

  await prisma.serviceAppointment.createMany({
    data: completedNotSoldAppointments,
  });

  // Create 100 completed services that WILL be sold (distributed across 3 years)
  console.log(`   - Creating ${completedAndSoldCount} completed service appointments (will be sold through 3 years of sales)...`);
  const completedAndSoldAppointments = [];
  
  for (let i = 0; i < completedAndSoldCount; i++) {
    const service = faker.helpers.arrayElement(services);
    // Distribute completion dates across 3 years
    const completedDate = faker.date.between({ from: threeYearsAgo, to: new Date() });
    const dueDate = faker.date.between({ 
      from: new Date(completedDate.getTime() - 7 * 24 * 60 * 60 * 1000),
      to: completedDate 
    });
    const randomClient = faker.helpers.arrayElement(clients);

    completedAndSoldAppointments.push({
      name: `${service.name} TO SELL #${i + 1}`,
      serviceType: service.name,
      description: faker.helpers.arrayElement(phoneNames),
      costPrice: generateDAPrice(20, 200),
      servicePrice: generateDAPrice(30, 300),
      clientId: randomClient.id,
      dueDate: dueDate,
      notes: faker.helpers.maybe(() => faker.helpers.arrayElement(phoneProblems), {
        probability: 0.8,
      }),
      isCompleted: true,
      completedAt: completedDate,
      createdAt: faker.date.between({ from: threeYearsAgo, to: completedDate }),
    });
  }

  await prisma.serviceAppointment.createMany({
    data: completedAndSoldAppointments,
  });

  console.log(`   - ${totalAppointments} service appointments created`);
  console.log(`   - ${completedAndSoldCount} completed and sold`);
  console.log(`   - ${incompleteCount} incomplete`);
  console.log(`   - ${completedNotSoldCount} completed but not sold`);
  console.log(`   - All appointments use only 'réparation' and 'flash' service types`);
}

/**
 * Associate completed service appointments with sales by creating saleItems
 * This should be called after sales are created
 */
export async function associateCompletedServicesWithSales(prisma: PrismaClient) {
  console.log("🔗 Associating completed services with sales...");

  // Get only the 100 completed services that should be sold (the ones with "TO SELL" in name)
  const completedServices = await prisma.serviceAppointment.findMany({
    where: {
      isCompleted: true,
      name: { contains: "TO SELL" }
    },
    orderBy: { completedAt: 'desc' },
  });

  if (completedServices.length === 0) {
    console.log("   - No completed services found");
    return;
  }

  // Get all sales to associate with
  const allSales = await prisma.sale.findMany({
    select: { id: true },
    orderBy: { createdAt: 'desc' },
  });

  if (allSales.length === 0) {
    console.log("   - No sales found, skipping service-sale associations");
    return;
  }

  // Get existing saleItems with services to avoid duplicates
  const existingServiceSaleItems = await prisma.saleItem.findMany({
    where: {
      serviceId: { not: null }
    },
    select: {
      serviceId: true,
      saleId: true,
    }
  });

  // Create a Set of existing combinations for quick lookup
  const existingCombinations = new Set<string>();
  existingServiceSaleItems.forEach(item => {
    if (item.serviceId) {
      existingCombinations.add(`${item.serviceId}-${item.saleId}`);
    }
  });

  // Only process the services that should be sold (marked with "TO SELL")
  const servicesToSell = completedServices.filter(s => s.name.includes("TO SELL"));
  
  // Create Service records for each appointment that should be sold
  // Each Service must have serviceAppointmentId set to link back to the appointment
  const serviceRecords = new Map<string, { id: string; appointmentId: string }>();
  
  for (const appointment of servicesToSell) {
    // Check if a Service already exists for this appointment
    const existingService = await prisma.service.findFirst({
      where: { serviceAppointmentId: appointment.id }
    });
    
    if (existingService) {
      serviceRecords.set(appointment.id, { id: existingService.id, appointmentId: appointment.id });
    } else {
      // Create a new Service record linked to this appointment
      // The name must be unique, so we append the appointment ID (like the app does)
      const uniqueServiceName = `${appointment.serviceType} (${appointment.id.slice(-8)})`;
      
      const newService = await prisma.service.create({
        data: {
          name: uniqueServiceName,
          description: appointment.description || undefined,
          costPrice: appointment.costPrice,
          serviceAppointmentId: appointment.id,
        }
      });
      
      serviceRecords.set(appointment.id, { id: newService.id, appointmentId: appointment.id });
    }
  }

  const saleItemsToCreate: any[] = [];
  const usedCombinations = new Set<string>(); // Track combinations we're creating in this batch
  let saleIndex = 0;
  
  for (let i = 0; i < servicesToSell.length; i++) {
    const appointment = servicesToSell[i];
    const serviceRecord = serviceRecords.get(appointment.id);
    
    if (!serviceRecord) continue;

    // Find a sale that doesn't already have this service
    let attempts = 0;
    let sale = null;
    let combinationKey = '';
    
    while (attempts < allSales.length * 2) { // Try multiple times to find a unique combination
      sale = allSales[saleIndex % allSales.length];
      combinationKey = `${serviceRecord.id}-${sale.id}`;
      
      // Check both existing combinations and ones we're about to create
      if (!existingCombinations.has(combinationKey) && !usedCombinations.has(combinationKey)) {
        // Found a unique combination
        usedCombinations.add(combinationKey);
        break;
      }
      
      saleIndex++;
      attempts++;
    }

    if (!sale || existingCombinations.has(combinationKey) || usedCombinations.has(combinationKey)) {
      // Skip if we couldn't find a unique combination
      continue;
    }
    
    saleItemsToCreate.push({
      serviceId: serviceRecord.id,
      saleId: sale.id,
      quantity: 1,
      price: appointment.servicePrice,
      boughtPrice: appointment.costPrice,
      createdAt: appointment.completedAt || appointment.createdAt,
    });

    saleIndex++;
  }

  if (saleItemsToCreate.length > 0) {
    await prisma.saleItem.createMany({
      data: saleItemsToCreate as any,
      skipDuplicates: true, // Extra safety
    });
    console.log(`   - Created ${serviceRecords.size} Service records linked to appointments`);
    console.log(`   - Created ${saleItemsToCreate.length} saleItems for completed services`);
  } else {
    console.log("   - No saleItems created (all combinations already exist)");
  }
}
