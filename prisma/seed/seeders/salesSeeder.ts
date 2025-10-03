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

  // Realistic store data for testing: ~5,000 sales (realistic for testing)
  const totalSales = 5000;
  const batchSize = 500; // Larger batches for better performance
  
  console.log(`   - Creating ${totalSales} sales in batches of ${batchSize}...`);

  for (let batchStart = 0; batchStart < totalSales; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, totalSales);
    const currentBatchSize = batchEnd - batchStart;
    
    console.log(`   - Processing batch ${Math.floor(batchStart / batchSize) + 1}/${Math.ceil(totalSales / batchSize)} (${currentBatchSize} sales)...`);

    // Prepare batch data for bulk operations
    const salesData: any[] = [];
    const saleItemsData: any[] = [];
    const productUpdates = new Map<string, number>();

    for (let i = 0; i < currentBatchSize; i++) {
      const client = faker.helpers.maybe(
        () => faker.helpers.arrayElement(clients),
        { probability: 0.7 }
      );
      const saleItemsCount = faker.number.int({ min: 1, max: 5 });
      const saleCreatedAt = faker.date.between({
        from: fiveYearsAgo,
        to: new Date(),
      });

      // Prepare sale data
      salesData.push({
        clientId: client?.id,
        discount: 0, // Will calculate later
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
        (product) => product.quantity > 0
      );

      // Calculate how many regular products to include
      let regularProductCount = saleItemsCount;
      if (includeManualProducts)
        regularProductCount = Math.max(0, regularProductCount - 2);
      if (includeServices)
        regularProductCount = Math.max(0, regularProductCount - 1);

      const saleProducts =
        availableProducts.length > 0
          ? faker.helpers.arrayElements(
              availableProducts,
              Math.min(regularProductCount, availableProducts.length)
            )
          : [];

      // Add regular product items (prepare for bulk insert)
      // Use Set to ensure no duplicate products in the same sale
      const usedProductIds = new Set<string>();
      
      for (const product of saleProducts) {
        // Skip if this product is already added to this sale
        if (usedProductIds.has(product.id)) {
          continue;
        }
        
        usedProductIds.add(product.id);
        
        const maxQuantity = Math.min(5, product.quantity); // Don't sell more than available
        if (maxQuantity <= 0) continue; // Skip if no stock

        const quantity = faker.number.int({ min: 1, max: maxQuantity });

        // Prepare sale item data
        saleItemsData.push({
          productId: product.id,
          saleId: sale.id,
          quantity,
          price: product.sellingPrice,
          boughtPrice: product.boughtPrice,
        });

        // Track quantity changes for bulk update
        const currentChange = productUpdates.get(product.id) || 0;
        productUpdates.set(product.id, currentChange - quantity);
        
        // Update local product object
        product.quantity -= quantity;
      }

      // Add manual products if decided (prepare for bulk insert)
      if (includeManualProducts && manualProductsAdded < maxManualProducts) {
        const manualProductCount = faker.number.int({ min: 1, max: 2 });
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
            min: 5,
            max: 200,
            dec: 0,
          });
          const quantity = faker.number.int({ min: 1, max: 3 });

          // Prepare manual product data (will handle upsert later)
          saleItemsData.push({
            productId: null,
            manualProductId: null, // Will be set after upsert
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

      // Add services if decided (prepare for bulk insert)
      if (includeServices && servicesAdded < maxServices && services.length > 0) {
        const serviceCount = faker.number.int({ min: 1, max: 2 });
        const selectedServices = faker.helpers.arrayElements(
          services,
          Math.min(serviceCount, services.length)
        );

        // Use Set to ensure no duplicate services in the same sale
        const usedServiceIds = new Set<string>();
        
        for (const service of selectedServices) {
          // Skip if this service is already added to this sale
          if (usedServiceIds.has(service.id)) {
            continue;
          }
          
          usedServiceIds.add(service.id);
          
          const servicePrice = faker.commerce.price({
            min: 20,
            max: 500,
            dec: 0,
          });
          const quantity = 1;

          // Prepare service sale item data
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
      // Get unique manual product combinations
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

      // Upsert all unique manual products
      const manualProductMap = new Map<string, string>();
      for (const [key, { name, type }] of uniqueManualProducts) {
        const manualProduct = await prisma.manualProduct.upsert({
          where: { name_type: { name, type } },
          update: {},
          create: { name, type },
        });
        manualProductMap.set(key, manualProduct.id);
      }

      // Update sale items with manual product IDs
      manualProductItems.forEach(item => {
        const key = `${item.manualProductName}-${item.manualProductType}`;
        item.manualProductId = manualProductMap.get(key);
        delete item.manualProductName;
        delete item.manualProductType;
      });
    }

    // Deduplicate sale items before bulk insert to prevent unique constraint violations
    const uniqueSaleItems = new Map<string, any>();
    for (const item of saleItemsData) {
      // Create a unique key based on the type of item and sale ID
      let key: string;
      if (item.productId) {
        key = `product-${item.productId}-${item.saleId}`;
      } else if (item.manualProductId) {
        key = `manual-${item.manualProductId}-${item.saleId}`;
      } else if (item.serviceId) {
        key = `service-${item.serviceId}-${item.saleId}`;
      } else {
        continue; // Skip invalid items
      }
      
      // Skip if this combination already exists in the database or in current batch
      if (existingCombinations.has(key) || uniqueSaleItems.has(key)) {
        continue;
      }
      
      // Add to unique items
      uniqueSaleItems.set(key, item);
    }

    // Bulk insert all unique sale items
    const finalSaleItemsData = Array.from(uniqueSaleItems.values());
    if (finalSaleItemsData.length > 0) {
      await prisma.saleItem.createMany({
        data: finalSaleItemsData as any,
      });
      
      // Add the newly created combinations to the existing set to prevent future conflicts
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

    // Calculate and update discounts for this batch
    const salesToUpdate: any[] = [];
    for (const sale of batchSales) {
      const saleItems = await prisma.saleItem.findMany({
        where: { saleId: sale.id },
      });

      const saleTotal = saleItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      const discountPercentage = faker.number.float({
        min: 0,
        max: 0.2,
        fractionDigits: 2,
      });
      const calculatedDiscount = Math.floor(saleTotal * discountPercentage);

      salesToUpdate.push({
        id: sale.id,
        discount: calculatedDiscount,
      });
    }

    // Bulk update discounts
    for (const saleUpdate of salesToUpdate) {
      await prisma.sale.update({
        where: { id: saleUpdate.id },
        data: { discount: saleUpdate.discount },
      });
    }

    sales.push(...batchSales);
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
