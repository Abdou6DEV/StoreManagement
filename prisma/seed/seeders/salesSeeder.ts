import { PrismaClient, Product } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { generateDAPrice } from "../utils/generators";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

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

  const fromDay = startOfDay(threeYearsAgo);
  const toDay = startOfDay(new Date());
  const days = Math.max(
    1,
    Math.ceil((toDay.getTime() - fromDay.getTime()) / (1000 * 60 * 60 * 24)),
  );

  // USER REQUEST: 5–17 items sold per day (including services).
  // We interpret "items" as total quantities sold (service counts as 1 item).
  console.log(`   - Creating ~${days} days of sales, 5–17 items/day (including services)...`);

  let totalSaleItemsCreated = 0;

  // Keep a mutable pool to avoid filtering 2000 products for each sale.
  const productById = new Map(products.map((p) => [p.id, p]));
  const availableProductIds = products.filter((p) => p.quantity > 0).map((p) => p.id);

  const pickAvailableProduct = (): Product | null => {
    while (availableProductIds.length > 0) {
      const idx = faker.number.int({ min: 0, max: availableProductIds.length - 1 });
      const id = availableProductIds[idx];
      const p = productById.get(id);
      if (!p || p.quantity <= 0) {
        availableProductIds.splice(idx, 1);
        continue;
      }
      return p;
    }
    return null;
  };

  let saleCount = 0;
  let salesWithClientsCount = 0;

  for (let dayIndex = 0; dayIndex < days; dayIndex++) {
    const dayStart = addDays(fromDay, dayIndex);
    const dayEnd = addDays(dayStart, 1);

    let remainingItemsForDay = faker.number.int({ min: 5, max: 17 });
    const salesTodayTarget = Math.min(
      faker.number.int({ min: 1, max: 4 }),
      remainingItemsForDay,
    );

    for (let s = 0; s < salesTodayTarget; s++) {
      if (remainingItemsForDay <= 0) break;

      saleCount++;
      if (saleCount % 500 === 0) {
        console.log(
          `   - Progress: ${saleCount} sales, ${totalSaleItemsCreated} items...`,
        );
      }

      const client =
        clients.length > 0 && faker.number.float({ min: 0, max: 1 }) < 0.3
          ? faker.helpers.arrayElement(clients)
          : null;
      if (client) salesWithClientsCount++;

      // Random time within the day (avoid timezone edge cases).
      const saleCreatedAt = faker.date.between({ from: dayStart, to: dayEnd });

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

      // Decide how many items this sale will carry from the day's remaining pool.
      // Keep individual sales small so the "items/day" constraint is easy to respect.
      const maxItemsThisSale = Math.min(6, remainingItemsForDay);
      let itemsThisSaleTarget = faker.number.int({ min: 1, max: maxItemsThisSale });

      // Optionally include 1 service item (counts as 1 item).
      const includeService =
        services.length > 0 &&
        itemsThisSaleTarget > 0 &&
        faker.number.float({ min: 0, max: 1 }) < 0.25;

      let totalAmount = 0;
      let totalCost = 0;
      let totalItems = 0;

      if (includeService && itemsThisSaleTarget > 0) {
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
        itemsThisSaleTarget -= 1;
      }

      // Product items: use quantity=1 so "items" == total sold units.
      const usedProductIds = new Set<string>();
      for (let k = 0; k < itemsThisSaleTarget; k++) {
        const p = pickAvailableProduct();
        if (!p) break;
        if (usedProductIds.has(p.id)) continue;
        usedProductIds.add(p.id);

        await prisma.saleItem.create({
          data: {
            saleId: sale.id,
            productId: p.id,
            quantity: 1,
            price: p.sellingPrice,
            boughtPrice: p.boughtPrice,
          },
        });

        totalAmount += p.sellingPrice;
        totalCost += p.boughtPrice ?? 0;
        totalItems += 1;
        totalSaleItemsCreated++;
        p.quantity -= 1;
      }

      // Ensure at least one item exists.
      if (totalItems === 0) {
        const p = pickAvailableProduct();
        if (p) {
          await prisma.saleItem.create({
            data: {
              saleId: sale.id,
              productId: p.id,
              quantity: 1,
              price: p.sellingPrice,
              boughtPrice: p.boughtPrice,
            },
          });
          totalAmount += p.sellingPrice;
          totalCost += p.boughtPrice ?? 0;
          totalItems += 1;
          totalSaleItemsCreated++;
          p.quantity -= 1;
        }
      }

      const discountPercentage = faker.number.float({
        min: 0,
        max: 0.15,
        fractionDigits: 2,
      });
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

      // Persist stock changes for products used in this sale.
      for (const productId of usedProductIds) {
        const p = productById.get(productId);
        if (!p) continue;
        await prisma.product.update({
          where: { id: productId },
          data: { quantity: p.quantity },
        });
      }

      remainingItemsForDay -= totalItems;
      sales.push({
        ...sale,
        totalAmount,
        totalAmountWithDiscount,
        totalItems,
        totalCost,
        totalProfit,
      });
    }
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
