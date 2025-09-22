import { PrismaClient, Seller } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { generateUniqueSellerName } from "../utils/generators";

export async function seedSellers(prisma: PrismaClient): Promise<Seller[]> {
  console.log("🏪 Creating sellers...");

  const usedSellerNames = new Set<string>();
  const sellers: Seller[] = [];

  for (let i = 0; i < 180; i++) {
    let sellerName: string;
    do {
      sellerName = generateUniqueSellerName();
    } while (usedSellerNames.has(sellerName));

    usedSellerNames.add(sellerName);

    const seller = await prisma.seller.create({
      data: {
        name: sellerName,
        phone: faker.helpers.maybe(() => faker.phone.number(), {
          probability: 0.8,
        }),
        email: faker.helpers.maybe(() => faker.internet.email(), {
          probability: 0.7,
        }),
        address: faker.helpers.maybe(
          () => faker.location.streetAddress({ useFullAddress: true }),
          { probability: 0.6 },
        ),
        notes: faker.helpers.maybe(() => faker.lorem.sentence(), {
          probability: 0.4,
        }),
      },
    });

    sellers.push(seller);
  }

  console.log(`   - ${sellers.length} sellers created`);
  return sellers;
}
