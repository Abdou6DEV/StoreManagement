import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { generateUniqueClientName } from "../utils/generators";

export async function seedClients(prisma: PrismaClient) {
  console.log("👥 Creating sample clients...");

  const usedClientNames = new Set<string>();
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  // Realistic store data for testing: ~2,000 clients
  const totalClients = 2000;
  const batchSize = 200; // Process in batches for better performance
  
  console.log(`   - Creating ${totalClients} clients in batches of ${batchSize}...`);

  for (let batchStart = 0; batchStart < totalClients; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, totalClients);
    const currentBatchSize = batchEnd - batchStart;
    
    console.log(`   - Processing batch ${Math.floor(batchStart / batchSize) + 1}/${Math.ceil(totalClients / batchSize)} (${currentBatchSize} clients)...`);

    // Prepare batch data
    const clientsData: any[] = [];

    for (let i = 0; i < currentBatchSize; i++) {
      let clientName: string;
      do {
        clientName = generateUniqueClientName();
      } while (usedClientNames.has(clientName));

      usedClientNames.add(clientName);

      clientsData.push({
        name: clientName,
        phone: faker.phone.number(),
        address: faker.location.streetAddress({ useFullAddress: true }),
        notes: faker.helpers.maybe(() => faker.lorem.sentence(), {
          probability: 0.3,
        }),
        createdAt: faker.date.between({ from: twoYearsAgo, to: new Date() }),
      });
    }

    // Bulk create clients
    await prisma.client.createMany({
      data: clientsData as any,
    });
  }

  console.log(`   - ${totalClients} clients created`);
}
