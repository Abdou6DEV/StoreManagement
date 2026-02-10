import { PrismaClient, Product } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { generateDAPrice } from "../utils/generators";

/**
 * Create sales one-by-one and attach items immediately.
 * No createMany for sales, no "fetch batch by date" — each sale gets its id, then we create its items. Reliable.
 */
export async function seedSales(prisma: PrismaClient, products: Product[]) {
  console.log("🛒 Creating sample sales (one-by-one with items)...");

  const clients = await prisma.client.findMany();
  const services = await prisma.service.findMany();
  const sales: any[] = [];
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

  const daysInThreeYears = 1095;
  const salesPerDay = 3.5;
  const totalSales = Math.floor(daysInThreeYears * salesPerDay);
  const salesWithClients = Math.floor(totalSales * 0.3);

  console.log(`   - Creating ${totalSales} sales, 5-6 items each, 30% with clients...`);

  let salesWithClientsCount = 0;
  let totalSaleItemsCreated = 0;

  for (let i = 0; i < totalSales; i++) {
    if (i > 0 && i % 500 === 0) {
      console.log(`   - Progress: ${i}/${totalSales} sales, ${totalSaleItemsCreated} items...`);
    }

    const shouldHaveClient =
      salesWithClientsCount < salesWithClients &&
      faker.number.float({ min: 0, max: 1 }) <
        (salesWithClients - salesWithClientsCount) / (totalSales - i);
    const client =
      shouldHaveClient && clients.length > 0
        ? faker.helpers.arrayElement(clients)
        : null;
    if (client) salesWithClientsCount++;

    const saleCreatedAt = faker.date.between({
      from: threeYearsAgo,
      to: new Date(),
    });

    const sale = await prisma.sale.create({
      data: {
        clientId: client?.id ?? null,
        discount: 0,
        totalAmount: 0,
        totalAmountWithDiscount: 0,
        totalItems: 0,
        totalCost: 0,
        totalProfit: 0,
        createdAt: saleCreatedAt,
        updatedAt: saleCreatedAt,
      },
    });

    const saleItemsCount = faker.number.int({ min: 5, max: 6 });
    const includeServices = faker.datatype.boolean({ probability: 0.2 });

    const availableProducts = products.filter((p) => p.quantity > 0);
    let regularProductCount = saleItemsCount;
    if (includeServices) regularProductCount = Math.max(1, regularProductCount - 1);
    const targetProductCount =
      availableProducts.length > 0
        ? Math.max(1, Math.min(regularProductCount, availableProducts.length))
        : 0;

    const saleProducts =
      availableProducts.length > 0
        ? faker.helpers.arrayElements(availableProducts, targetProductCount)
        : [];

    const usedProductIds = new Set<string>();
    let totalAmount = 0;
    let totalCost = 0;
    let totalItems = 0;
    let fallbackProductUsed: Product | null = null;

    for (const product of saleProducts) {
      if (usedProductIds.has(product.id)) continue;
      usedProductIds.add(product.id);
      const maxQty = Math.min(3, product.quantity);
      if (maxQty <= 0) continue;
      const quantity = faker.number.int({ min: 1, max: maxQty });

      await prisma.saleItem.create({
        data: {
          saleId: sale.id,
          productId: product.id,
          quantity,
          price: product.sellingPrice,
          boughtPrice: product.boughtPrice,
        },
      });
      totalAmount += product.sellingPrice * quantity;
      totalCost += (product.boughtPrice ?? 0) * quantity;
      totalItems += quantity;
      product.quantity -= quantity;
      totalSaleItemsCreated++;
    }

    if (includeServices && services.length > 0) {
      const service = faker.helpers.arrayElement(services);
      const servicePrice = generateDAPrice(500, 27000);
      await prisma.saleItem.create({
        data: {
          saleId: sale.id,
          serviceId: service.id,
          quantity: 1,
          price: servicePrice,
          boughtPrice: Math.floor(servicePrice * 0.5),
        },
      });
      totalAmount += servicePrice;
      totalCost += Math.floor(servicePrice * 0.5);
      totalItems += 1;
      totalSaleItemsCreated++;
    }

    // Guarantee every sale has at least one item (for dashboard/history): use a real product
    if (totalItems === 0 && availableProducts.length > 0) {
      const fallbackProduct = faker.helpers.arrayElement(availableProducts);
      const fallbackQty = Math.min(1, fallbackProduct.quantity);
      if (fallbackQty >= 1) {
        await prisma.saleItem.create({
          data: {
            saleId: sale.id,
            productId: fallbackProduct.id,
            quantity: fallbackQty,
            price: fallbackProduct.sellingPrice,
            boughtPrice: fallbackProduct.boughtPrice,
          },
        });
        totalAmount = fallbackProduct.sellingPrice * fallbackQty;
        totalCost = (fallbackProduct.boughtPrice ?? 0) * fallbackQty;
        totalItems = fallbackQty;
        totalSaleItemsCreated++;
        fallbackProduct.quantity -= fallbackQty;
        usedProductIds.add(fallbackProduct.id);
        fallbackProductUsed = fallbackProduct;
      }
    }

    const discountPercentage = faker.number.float({ min: 0, max: 0.15, fractionDigits: 2 });
    const discount = Math.round(Math.floor(totalAmount * discountPercentage) / 10) * 10;
    const totalAmountWithDiscount = Math.round((totalAmount - discount) / 10) * 10;
    const totalProfit = Math.round((totalAmountWithDiscount - totalCost) / 10) * 10;

    await prisma.sale.update({
      where: { id: sale.id },
      data: {
        discount,
        totalAmount,
        totalAmountWithDiscount,
        totalItems,
        totalCost,
        totalProfit,
      },
    });

    for (const product of saleProducts) {
      if (usedProductIds.has(product.id)) {
        await prisma.product.update({
          where: { id: product.id },
          data: { quantity: product.quantity },
        });
      }
    }
    if (fallbackProductUsed) {
      await prisma.product.update({
        where: { id: fallbackProductUsed.id },
        data: { quantity: fallbackProductUsed.quantity },
      });
    }

    sales.push({ ...sale, totalAmount, totalAmountWithDiscount, totalItems, totalCost, totalProfit });
  }

  console.log(`   - ${sales.length} sales created`);
  console.log(`   - ${salesWithClientsCount} sales with clients`);
  console.log(`   - ${totalSaleItemsCreated} sale items created`);

  const regularCount = await prisma.saleItem.count({
    where: { productId: { not: null }, manualProductId: null, serviceId: null },
  });
  const serviceCount = await prisma.saleItem.count({
    where: { productId: null, manualProductId: null, serviceId: { not: null } },
  });
  console.log(`   - ${regularCount} product items, ${serviceCount} service items`);

  const sampleSale = await prisma.sale.findFirst({
    include: { saleItems: true },
    orderBy: { createdAt: "desc" },
  });
  if (sampleSale) {
    console.log(`   - Verify: one sale has ${sampleSale.saleItems.length} items (totalItems=${sampleSale.totalItems})`);
  }

  return sales;
}
