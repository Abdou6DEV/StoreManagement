import { PrismaClient, Product } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { manualProductTypes, manualProductNames } from "../data/index";

export async function seedSales(prisma: PrismaClient, products: Product[]) {
  console.log("🛒 Creating sample sales...");

  const clients = await prisma.client.findMany();
  const services = await prisma.service.findMany();
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
    // Decide if this sale should include services (30% chance)
    const includeServices = faker.datatype.boolean({ probability: 0.3 });
    
    let manualProductsAdded = 0;
    let servicesAdded = 0;
    const maxManualProducts = faker.number.int({ min: 1, max: 3 });
    const maxServices = faker.number.int({ min: 1, max: 2 });

    // Filter products that have stock available
    const availableProducts = products.filter(
      (product) => product.quantity > 0,
    );
    
    // Calculate how many regular products to include
    let regularProductCount = saleItemsCount;
    if (includeManualProducts) regularProductCount = Math.max(0, regularProductCount - 2);
    if (includeServices) regularProductCount = Math.max(0, regularProductCount - 1);

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

        // Create or find the manual product
        const manualProduct = await prisma.manualProduct.upsert({
          where: {
            name_type: {
              name: manualProductName,
              type: manualProductType,
            },
          },
          update: {},
          create: {
            name: manualProductName,
            type: manualProductType,
          },
        });

        await prisma.saleItem.create({
          data: {
            productId: null, // Manual products don't have a productId
            manualProductId: manualProduct.id,
            saleId: sale.id,
            quantity,
            price: Number(manualProductPrice),
          },
        });

        manualProductsAdded++;
      }
    }

    // Add services if decided
    if (includeServices && servicesAdded < maxServices && services.length > 0) {
      const serviceCount = faker.number.int({ min: 1, max: 2 });
      const selectedServices = faker.helpers.arrayElements(
        services,
        Math.min(serviceCount, services.length)
      );

      for (const service of selectedServices) {
        const servicePrice = faker.commerce.price({
          min: 20,
          max: 500,
          dec: 0,
        });
        const quantity = 1; // Services typically have quantity of 1

        await prisma.saleItem.create({
          data: {
            productId: null,
            manualProductId: null,
            serviceId: service.id,
            saleId: sale.id,
            quantity,
            price: Number(servicePrice),
          },
        });

        servicesAdded++;
      }
    }
  }

  console.log(`   - ${sales.length} sales created`);

  // Count total sale items created
  const totalSaleItems = await prisma.saleItem.count();
  console.log(`   - ${totalSaleItems} total sale items created`);

  // Count different types of sale items
  const regularSaleItems = await prisma.saleItem.count({
    where: { 
      productId: { not: null },
      manualProductId: null,
      serviceId: null
    },
  });
  const manualSaleItems = await prisma.saleItem.count({
    where: { 
      productId: null,
      manualProductId: { not: null },
      serviceId: null
    },
  });
  const serviceSaleItems = await prisma.saleItem.count({
    where: { 
      productId: null,
      manualProductId: null,
      serviceId: { not: null }
    },
  });
  
  console.log(`   - ${regularSaleItems} regular product items`);
  console.log(`   - ${manualSaleItems} manual product items`);
  console.log(`   - ${serviceSaleItems} service items`);

  return sales;
}
