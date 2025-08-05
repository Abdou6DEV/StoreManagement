import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { generateUniqueClientName } from "../utils/generators";

export async function seedClients(prisma: PrismaClient) {
  console.log("👥 Creating sample clients...");

  const usedClientNames = new Set<string>();
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  for (let i = 0; i < 50; i++) {
    let clientName: string;
    do {
      clientName = generateUniqueClientName();
    } while (usedClientNames.has(clientName));

    usedClientNames.add(clientName);

    await prisma.client.create({
      data: {
        name: clientName,
        phone: faker.phone.number(),
        address: faker.location.streetAddress({ useFullAddress: true }),
        notes: faker.helpers.maybe(() => faker.lorem.sentence(), {
          probability: 0.3,
        }),
        createdAt: faker.date.between({ from: twoYearsAgo, to: new Date() }),
      },
    });
  }

  console.log(`   - 50 clients created`);
}
