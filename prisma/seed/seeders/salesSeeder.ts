import { PrismaClient, Product } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { manualProductTypes, manualProductNames } from "../data/index";

export async function seedSales(prisma: PrismaClient, products: Product[]) {
  console.log("🛒 Creating sample sales...");

  const clients = await prisma.client.findMany();
  const sales = [];
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  for (let i = 0; i < 200; i++) {
    const client = faker.helpers.maybe(
      () => faker.helpers.arrayElement(clients),
      { probability: 0.7 },
    );
    const saleItemsCount = faker.number.int({ min: 1, max: 5 });
    const saleCreatedAt = faker.date.between({
      from: twoYearsAgo,
      to: new Date(),
    });
    const sale = await prisma.sale.create({
      data: {
        clientId: client?.id,
        discount: faker.number.int({ min: 0, max: 20 }),
        createdAt: saleCreatedAt,
      },
    });
    sales.push({ ...sale, clientId: client?.id });

    // Decide if this sale should include manual products (40% chance)
    const includeManualProducts = faker.datatype.boolean({ probability: 0.4 });
    let manualProductsAdded = 0;
    const maxManualProducts = faker.number.int({ min: 1, max: 3 });

    // Filter products that have stock available
    const availableProducts = products.filter(
      (product) => product.quantity > 0,
    );
    const regularProductCount = includeManualProducts
      ? faker.number.int({ min: 0, max: Math.min(3, saleItemsCount) }) // Fewer regular products if manual products included
      : saleItemsCount;

    const saleProducts =
      availableProducts.length > 0
        ? faker.helpers.arrayElements(
            availableProducts,
            Math.min(regularProductCount, availableProducts.length),
          )
        : [];

    // Add regular product items
    for (const product of saleProducts) {
      const maxQuantity = Math.min(5, product.quantity); // Don't sell more than available
      if (maxQuantity <= 0) continue; // Skip if no stock

      const quantity = faker.number.int({ min: 1, max: maxQuantity });

      // Use transaction to create sale item and update product quantity
      await prisma.$transaction(async (tx) => {
        await tx.saleItem.create({
          data: {
            productId: product.id,
            saleId: sale.id,
            quantity,
            price: product.sellingPrice,
          },
        });

        // Update product quantity by reducing it
        await tx.product.update({
          where: { id: product.id },
          data: {
            quantity: {
              decrement: quantity,
            },
          },
        });

        // Update local product object to reflect new quantity
        product.quantity -= quantity;
      });
    }

    // Add manual products if decided
    if (includeManualProducts && manualProductsAdded < maxManualProducts) {
      const manualProductCount = faker.number.int({ min: 1, max: 2 });

      for (let j = 0; j < manualProductCount; j++) {
        const manualProductName =
          faker.helpers.arrayElement(manualProductNames);
        const manualProductType =
          faker.helpers.arrayElement(manualProductTypes);
        const manualProductPrice = faker.commerce.price({
          min: 5,
          max: 200,
          dec: 0,
        });
        const quantity = faker.number.int({ min: 1, max: 3 });

        await prisma.saleItem.create({
          data: {
            productId: null, // Manual products don't have a productId
            saleId: sale.id,
            quantity,
            price: Number(manualProductPrice),
            manualProductName,
            manualProductType,
          },
        });

        manualProductsAdded++;
      }
    }
  }

  console.log(`   - ${sales.length} sales created`);

  // Count total sale items created
  const totalSaleItems = await prisma.saleItem.count();
  console.log(`   - ${totalSaleItems} total sale items created`);

  // Count manual vs regular sale items
  const manualSaleItems = await prisma.saleItem.count({
    where: { productId: null },
  });
  const regularSaleItems = totalSaleItems - manualSaleItems;
  console.log(`   - ${regularSaleItems} regular product items`);
  console.log(`   - ${manualSaleItems} manual product items`);

  return sales;
}
