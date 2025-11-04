import { PrismaClient, Product } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { manualProductTypes, manualProductNames } from "../data/index";

export async function seedSales(prisma: PrismaClient, products: Product[]) {
  console.log("🛒 Creating sample sales...");

  const clients = await prisma.client.findMany();
  const services = await prisma.service.findMany();
  const sales: any[] = [];
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

  // Track all existing sale item combinations to prevent duplicates
  const existingSaleItems = await prisma.saleItem.findMany({
    select: {
      productId: true,
      manualProductId: true,
      serviceId: true,
      saleId: true,
    },
  });
  
  const existingCombinations = new Set<string>();
  existingSaleItems.forEach(item => {
    if (item.productId) {
      existingCombinations.add(`product-${item.productId}-${item.saleId}`);
    }
    if (item.manualProductId) {
      existingCombinations.add(`manual-${item.manualProductId}-${item.saleId}`);
    }
    if (item.serviceId) {
      existingCombinations.add(`service-${item.serviceId}-${item.saleId}`);
    }
  });

  // Mobile phone shop: 10000 sales, only 1% with clients (100 sales with clients, 9900 without)
  const totalSales = 10000;
  const salesWithClients = 100; // 1% of 10000
  const batchSize = 500; // Larger batches for better performance
  
  console.log(`   - Creating ${totalSales} sales in batches of ${batchSize}...`);
  console.log(`   - ${salesWithClients} sales will have clients (1%), ${totalSales - salesWithClients} will be without clients...`);

  let salesWithClientsCount = 0;

  for (let batchStart = 0; batchStart < totalSales; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, totalSales);
    const currentBatchSize = batchEnd - batchStart;
    
    console.log(`   - Processing batch ${Math.floor(batchStart / batchSize) + 1}/${Math.ceil(totalSales / batchSize)} (${currentBatchSize} sales)...`);

    // Prepare batch data for bulk operations
    const salesData: any[] = [];
    const saleItemsData: any[] = [];
    const productUpdates = new Map<string, number>();

    for (let i = 0; i < currentBatchSize; i++) {
      // Only 1% of sales should have clients
      const shouldHaveClient = salesWithClientsCount < salesWithClients && 
        faker.number.float({ min: 0, max: 1 }) < (salesWithClients - salesWithClientsCount) / (totalSales - batchStart);
      
      const client = shouldHaveClient && clients.length > 0
        ? faker.helpers.arrayElement(clients)
        : null;
      
      if (client) salesWithClientsCount++;

      const saleItemsCount = faker.number.int({ min: 1, max: 5 }); // 1-5 items per sale
      const saleCreatedAt = faker.date.between({
        from: fiveYearsAgo,
        to: new Date(),
      });

      // Prepare sale data
      salesData.push({
        clientId: client?.id || null,
        discount: 0, // Will calculate later
        totalAmount: 0, // Will calculate later
        totalAmountWithDiscount: 0, // Will calculate later
        totalItems: 0, // Will calculate later
        totalCost: 0, // Will calculate later
        totalProfit: 0, // Will calculate later
        createdAt: saleCreatedAt,
      });
    }

    // Bulk create sales
    await prisma.sale.createMany({
      data: salesData as any,
    });

    // Get the created sales for this batch
    const batchSales = await prisma.sale.findMany({
      orderBy: { createdAt: 'desc' },
      take: currentBatchSize,
    });

    // Process each sale in the batch
    for (let i = 0; i < currentBatchSize; i++) {
      const sale = batchSales[i];
      const saleItemsCount = faker.number.int({ min: 1, max: 5 });

      // Decide if this sale should include manual products (30% chance)
      const includeManualProducts = faker.datatype.boolean({ probability: 0.3 });
      // Decide if this sale should include services (20% chance)
      const includeServices = faker.datatype.boolean({ probability: 0.2 });

      let manualProductsAdded = 0;
      let servicesAdded = 0;
      const maxManualProducts = faker.number.int({ min: 1, max: 2 });
      const maxServices = 1;

      // Filter products that have stock available
      const availableProducts = products.filter(
        (product) => product.quantity > 0
      );

      // Calculate how many regular products to include
      let regularProductCount = saleItemsCount;
      if (includeManualProducts) {
        const manualCount = Math.min(1, saleItemsCount - 1);
        regularProductCount = Math.max(1, saleItemsCount - manualCount);
      }
      if (includeServices) {
        const serviceCount = Math.min(1, saleItemsCount - 1);
        regularProductCount = Math.max(1, regularProductCount - serviceCount);
      }

      const saleProducts =
        availableProducts.length > 0
          ? faker.helpers.arrayElements(
              availableProducts,
              Math.min(regularProductCount, availableProducts.length)
            )
          : [];

      // Add regular product items (prepare for bulk insert)
      const usedProductIds = new Set<string>();
      
      for (const product of saleProducts) {
        if (usedProductIds.has(product.id)) {
          continue;
        }
        
        usedProductIds.add(product.id);
        
        const maxQuantity = Math.min(3, product.quantity);
        if (maxQuantity <= 0) continue;

        const quantity = faker.number.int({ min: 1, max: maxQuantity });

        saleItemsData.push({
          productId: product.id,
          saleId: sale.id,
          quantity,
          price: product.sellingPrice,
          boughtPrice: product.boughtPrice,
        });

        const currentChange = productUpdates.get(product.id) || 0;
        productUpdates.set(product.id, currentChange - quantity);
        
        product.quantity -= quantity;
      }

      // Add manual products if decided
      if (includeManualProducts && manualProductsAdded < maxManualProducts) {
        const remainingSlots = saleItemsCount - usedProductIds.size;
        const manualProductCount = Math.min(1, Math.max(1, remainingSlots));
        const usedManualProducts = new Set<string>();

        for (let j = 0; j < manualProductCount; j++) {
          const manualProductName = faker.helpers.arrayElement(manualProductNames);
          const manualProductType = faker.helpers.arrayElement(manualProductTypes);
          
          const manualProductKey = `${manualProductName}-${manualProductType}`;
          
          if (usedManualProducts.has(manualProductKey)) {
            continue;
          }
          
          usedManualProducts.add(manualProductKey);
          
          const manualProductPrice = faker.commerce.price({
            min: 500,
            max: 5000,
            dec: 0,
          });
          const quantity = faker.number.int({ min: 1, max: 2 });

          saleItemsData.push({
            productId: null,
            manualProductId: null,
            serviceId: null,
            saleId: sale.id,
            quantity,
            price: Number(manualProductPrice),
            manualProductName,
            manualProductType,
          });

          manualProductsAdded++;
        }
      }

      // Add services if decided
      if (includeServices && servicesAdded < maxServices && services.length > 0) {
        const remainingSlots = saleItemsCount - usedProductIds.size - manualProductsAdded;
        const serviceCount = Math.min(1, Math.max(1, remainingSlots));
        const selectedServices = faker.helpers.arrayElements(
          services,
          Math.min(serviceCount, services.length)
        );

        const usedServiceIds = new Set<string>();
        
        for (const service of selectedServices) {
          if (usedServiceIds.has(service.id)) {
            continue;
          }
          
          usedServiceIds.add(service.id);
          
          const servicePrice = faker.commerce.price({
            min: 2000,
            max: 10000,
            dec: 0,
          });
          const quantity = 1;

          saleItemsData.push({
            productId: null,
            manualProductId: null,
            serviceId: service.id,
            saleId: sale.id,
            quantity,
            price: Number(servicePrice),
          });

          servicesAdded++;
        }
      }

    }

    // Handle manual products upsert and update sale items
    const manualProductItems = saleItemsData.filter(item => item.manualProductName);
    if (manualProductItems.length > 0) {
      const uniqueManualProducts = new Map<string, { name: string; type: string }>();
      manualProductItems.forEach(item => {
        const key = `${item.manualProductName}-${item.manualProductType}`;
        if (!uniqueManualProducts.has(key)) {
          uniqueManualProducts.set(key, {
            name: item.manualProductName,
            type: item.manualProductType,
          });
        }
      });

      const manualProductMap = new Map<string, string>();
      for (const [key, { name, type }] of uniqueManualProducts) {
        const manualProduct = await prisma.manualProduct.upsert({
          where: { name_type: { name, type } },
          update: {},
          create: { name, type },
        });
        manualProductMap.set(key, manualProduct.id);
      }

      manualProductItems.forEach(item => {
        const key = `${item.manualProductName}-${item.manualProductType}`;
        item.manualProductId = manualProductMap.get(key);
        delete item.manualProductName;
        delete item.manualProductType;
      });
    }

    // Deduplicate sale items before bulk insert
    const uniqueSaleItems = new Map<string, any>();
    for (const item of saleItemsData) {
      let key: string;
      if (item.productId) {
        key = `product-${item.productId}-${item.saleId}`;
      } else if (item.manualProductId) {
        key = `manual-${item.manualProductId}-${item.saleId}`;
      } else if (item.serviceId) {
        key = `service-${item.serviceId}-${item.saleId}`;
      } else {
        continue;
      }
      
      if (existingCombinations.has(key) || uniqueSaleItems.has(key)) {
        continue;
      }
      
      uniqueSaleItems.set(key, item);
    }

    // Bulk insert all unique sale items
    const finalSaleItemsData = Array.from(uniqueSaleItems.values());
    if (finalSaleItemsData.length > 0) {
      await prisma.saleItem.createMany({
        data: finalSaleItemsData as any,
      });
      
      finalSaleItemsData.forEach(item => {
        let key: string;
        if (item.productId) {
          key = `product-${item.productId}-${item.saleId}`;
        } else if (item.manualProductId) {
          key = `manual-${item.manualProductId}-${item.saleId}`;
        } else if (item.serviceId) {
          key = `service-${item.serviceId}-${item.saleId}`;
        } else {
          return;
        }
        existingCombinations.add(key);
      });
    }

    // Bulk update product quantities
    for (const [productId, quantityChange] of productUpdates) {
      await prisma.product.update({
        where: { id: productId },
        data: { quantity: { increment: quantityChange } },
      });
    }

    // Calculate and update discounts and pre-calculated totals for this batch
    const salesToUpdate: any[] = [];
    for (const sale of batchSales) {
      const saleItems = await prisma.saleItem.findMany({
        where: { saleId: sale.id },
      });

      if (saleItems.length === 0) {
        continue;
      }

      const totalAmount = saleItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      const discountPercentage = faker.number.float({
        min: 0,
        max: 0.15,
        fractionDigits: 2,
      });
      const calculatedDiscount = Math.floor(totalAmount * discountPercentage);
      const totalAmountWithDiscount = totalAmount - calculatedDiscount;
      
      const totalItems = saleItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );

      const totalCost = saleItems.reduce((sum, item) => {
        let boughtPrice = 0;
        
        if (item.productId && item.boughtPrice !== undefined && item.boughtPrice !== null) {
          boughtPrice = item.boughtPrice;
        } else if (item.manualProductId) {
          boughtPrice = Math.floor(item.price * 0.4);
        } else if (item.serviceId) {
          boughtPrice = Math.floor(item.price * 0.5);
        }
        
        return sum + (boughtPrice * item.quantity);
      }, 0);

      const totalProfit = totalAmountWithDiscount - totalCost;

      salesToUpdate.push({
        id: sale.id,
        discount: calculatedDiscount,
        totalAmount,
        totalAmountWithDiscount,
        totalItems,
        totalCost,
        totalProfit,
      });
    }

    // Bulk update discounts and pre-calculated totals
    for (const saleUpdate of salesToUpdate) {
      await prisma.sale.update({
        where: { id: saleUpdate.id },
        data: {
          discount: saleUpdate.discount,
          totalAmount: saleUpdate.totalAmount,
          totalAmountWithDiscount: saleUpdate.totalAmountWithDiscount,
          totalItems: saleUpdate.totalItems,
          totalCost: saleUpdate.totalCost,
          totalProfit: saleUpdate.totalProfit,
        },
      });
    }

    sales.push(...batchSales);
  }

  console.log(`   - ${sales.length} sales created`);
  console.log(`   - ${salesWithClientsCount} sales with clients (${((salesWithClientsCount / sales.length) * 100).toFixed(2)}%)`);

  // Count total sale items created
  const totalSaleItems = await prisma.saleItem.count();
  console.log(`   - ${totalSaleItems} total sale items created`);

  // Count different types of sale items
  const regularSaleItems = await prisma.saleItem.count({
    where: {
      productId: { not: null },
      manualProductId: null,
      serviceId: null,
    },
  });
  const manualSaleItems = await prisma.saleItem.count({
    where: {
      productId: null,
      manualProductId: { not: null },
      serviceId: null,
    },
  });
  const serviceSaleItems = await prisma.saleItem.count({
    where: {
      productId: null,
      manualProductId: null,
      serviceId: { not: null },
    },
  });

  console.log(`   - ${regularSaleItems} regular product items`);
  console.log(`   - ${manualSaleItems} manual product items`);
  console.log(`   - ${serviceSaleItems} service items`);

  return sales;
}
