import { PrismaClient, Product, Seller } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { predefinedCategories } from "../data/index";
import {
  generateUniqueProductName,
  generateProductPhoto,
  generateDAPrice,
} from "../utils/generators";

export async function seedProducts(
  prisma: PrismaClient,
  sellers: Seller[],
): Promise<Product[]> {
  console.log("📦 Generating products and purchases...");

  const usedProductNames = new Set<string>();
  const products: Product[] = [];
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  // Mobile phone shop: 2000 products
  const totalProducts = 2000;
  // Increase purchases to ensure most products get quantities (at least 1 purchase per product on average)
  const totalPurchases = 2500; // More purchases to ensure products get stock
  const batchSize = 500; // Process in batches for better performance
  
  console.log(`   - Creating ${totalProducts} mobile phone shop products in batches of ${batchSize}...`);
  console.log(`   - Will create approximately ${totalPurchases} purchases total...`);
  console.log(`   - After purchases, will set exactly 10 products to 0 qty, 20 products to qty < 3...`);

  // First, create all products without purchases
  for (let batchStart = 0; batchStart < totalProducts; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, totalProducts);
    const currentBatchSize = batchEnd - batchStart;
    
    console.log(`   - Processing batch ${Math.floor(batchStart / batchSize) + 1}/${Math.ceil(totalProducts / batchSize)} (${currentBatchSize} products)...`);

    // Prepare batch data
    const productsData: any[] = [];

    for (let i = 0; i < currentBatchSize; i++) {
      let productName: string;
      do {
        productName = generateUniqueProductName();
      } while (usedProductNames.has(productName));

      usedProductNames.add(productName);

      const category = faker.helpers.arrayElement(predefinedCategories);
      // Mobile phone shop prices: phones 5000-200000, accessories 100-5000
      const isPhone = category === "Phone";
      const boughtPrice = isPhone
        ? generateDAPrice(5000, 200000) // 5000-200000 DA in centimes (last digit 0)
        : generateDAPrice(100, 5000); // 100-5000 DA in centimes (last digit 0)
      
      const markupPercentage = faker.number.float({ min: 1.15, max: 1.5 }); // 15-50% markup
      const sellingPrice = Math.round(Math.floor(boughtPrice * markupPercentage) / 10) * 10; // Ensure last digit is 0

      // Set initial quantity to 0, will be updated after purchases
      // Max qty is 100 for all products
      const initialQuantity = 0; // Will be set after purchases, but we'll ensure specific quantities

      // Prepare product data for bulk insert
      productsData.push({
        name: productName,
        categoryName: category,
        quantity: initialQuantity,
        boughtPrice: boughtPrice,
        sellingPrice: sellingPrice,
        codebar: faker.string.numeric(12),
        photo: generateProductPhoto(),
      });
    }

    // Bulk create products
    await prisma.product.createMany({
      data: productsData as any,
    });

    // Get the created products for this batch
    const batchProducts = await prisma.product.findMany({
      where: {
        name: { in: productsData.map(p => p.name) }
      },
      orderBy: { createdAt: 'desc' },
      take: currentBatchSize,
    });

    products.push(...batchProducts);
  }

  // Now create purchases distributed across products
  console.log(`   - Creating approximately ${totalPurchases} purchases...`);
  const purchasesData: any[] = [];
  const purchaseItemsData: any[] = [];
  const productUpdates = new Map<string, number>();

  for (let i = 0; i < totalPurchases; i++) {
    // Select a random product from all created products
    const randomProduct = faker.helpers.arrayElement(products);
    const seller = faker.helpers.maybe(
      () => faker.helpers.arrayElement(sellers),
      { probability: 0.85 },
    );

    const isPhone = randomProduct.categoryName === "Phone";
    const purchaseQuantity = isPhone
      ? faker.number.int({ min: 1, max: 5 }) // Phones: 1-5
      : faker.number.int({ min: 5, max: 100 }); // Accessories: 5-100
    
    const purchaseDate = faker.date.between({
      from: twoYearsAgo,
      to: new Date(),
    });

    purchasesData.push({
      sellerId: seller?.id || null,
      createdAt: purchaseDate,
      updatedAt: purchaseDate,
    });

    purchaseItemsData.push({
      productId: randomProduct.id,
      purchaseIndex: i,
      quantity: purchaseQuantity,
      price: randomProduct.boughtPrice,
      createdAt: purchaseDate,
      updatedAt: purchaseDate,
    });

    // Track quantity changes for bulk update
    const currentChange = productUpdates.get(randomProduct.id) || 0;
    productUpdates.set(randomProduct.id, currentChange + purchaseQuantity);
  }

  // Bulk create purchases
  await prisma.purchase.createMany({
    data: purchasesData.map(p => ({
      sellerId: p.sellerId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })) as any,
  });

  // Get the created purchases
  const createdPurchases = await prisma.purchase.findMany({
    where: {
      createdAt: { gte: twoYearsAgo }
    },
    orderBy: { createdAt: 'desc' },
    take: totalPurchases,
  });

  // Bulk create purchase items
  const purchaseItemsToCreate = purchaseItemsData.map(item => ({
    productId: item.productId,
    purchaseId: createdPurchases[item.purchaseIndex].id,
    quantity: item.quantity,
    price: item.price,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));

  await prisma.purchaseItem.createMany({
    data: purchaseItemsToCreate as any,
  });

  // Update product quantities based on purchases
  for (const [productId, quantityChange] of productUpdates) {
    await prisma.product.update({
      where: { id: productId },
      data: { quantity: { increment: quantityChange } },
    });
  }

  // Ensure specific quantity requirements:
  // - Exactly 10 products with 0 qty
  // - Exactly 20 products with qty < 3 (but not 0)
  // - Max qty is 100 for all others
  const allProducts = await prisma.product.findMany();
  
  // First, ensure products that didn't get purchases have at least some quantity
  // Give them a random quantity between 3-50 so they're not 0
  for (const product of allProducts) {
    if (product.quantity === 0) {
      // Give it a base quantity so we can later set specific ones to 0
      const baseQty = faker.number.int({ min: 3, max: 50 });
      await prisma.product.update({
        where: { id: product.id },
        data: { quantity: baseQty },
      });
      product.quantity = baseQty; // Update local copy
    }
  }
  
  // Refresh products to get updated quantities
  const updatedProducts = await prisma.product.findMany();
  
  // Set exactly 10 products to 0 qty
  const zeroQtyProducts = faker.helpers.arrayElements(updatedProducts, 10);
  for (const product of zeroQtyProducts) {
    await prisma.product.update({
      where: { id: product.id },
      data: { quantity: 0 },
    });
  }

  // Set exactly 20 products to qty < 3 (but not 0, and not in zeroQtyProducts)
  const remainingProducts = updatedProducts.filter(p => !zeroQtyProducts.some(z => z.id === p.id));
  const lowQtyProducts = faker.helpers.arrayElements(remainingProducts, 20);
  for (const product of lowQtyProducts) {
    const lowQty = faker.number.int({ min: 1, max: 2 });
    await prisma.product.update({
      where: { id: product.id },
      data: { quantity: lowQty },
    });
  }

  // Ensure no product has qty > 100
  const finalProducts = await prisma.product.findMany();
  for (const product of finalProducts) {
    if (product.quantity > 100) {
      await prisma.product.update({
        where: { id: product.id },
        data: { quantity: 100 },
      });
    }
  }
  
  // Verify counts
  const zeroCount = await prisma.product.count({ where: { quantity: 0 } });
  const lowCount = await prisma.product.count({ where: { quantity: { gte: 1, lt: 3 } } });
  console.log(`   - Verification: ${zeroCount} products with 0 qty, ${lowCount} products with qty < 3`);

  console.log(`   - ${products.length} products created`);

  // Count total purchases created
  const totalPurchasesCreated = await prisma.purchase.count();
  console.log(`   - ${totalPurchasesCreated} purchases created`);

  // Count total purchase items created
  const totalPurchaseItems = await prisma.purchaseItem.count();
  console.log(`   - ${totalPurchaseItems} purchase items created`);

  return products;
}
