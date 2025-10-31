import { PrismaClient, Product, Seller } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { predefinedCategories } from "../data/index";
import {
  generateUniqueProductName,
  generateProductPhoto,
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

  // Realistic store data for testing: 100 products
  const totalProducts = 100;
  const totalPurchases = 200; // Exactly 200 purchases as requested
  const batchSize = 100; // Process in batches for better performance
  
  console.log(`   - Creating ${totalProducts} products in batches of ${batchSize}...`);
  console.log(`   - Will create exactly ${totalPurchases} purchases total...`);

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
      const boughtPrice = faker.commerce.price({
        min: 50,
        max: 2000,
        dec: 0,
      });
      const markupPercentage = faker.number.float({ min: 1.1, max: 1.8 });
      const sellingPrice = Math.floor(Number(boughtPrice) * markupPercentage);

      // Set initial quantity to 0, will be updated after purchases
      const initialQuantity = faker.number.int({ min: 0, max: 20 });

      // Prepare product data for bulk insert
      productsData.push({
        name: productName,
        categoryName: category,
        quantity: initialQuantity,
        boughtPrice: Number(boughtPrice),
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

  // Now create exactly 200 purchases distributed across all products
  console.log(`   - Creating exactly ${totalPurchases} purchases...`);
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

    const purchaseQuantity = faker.number.int({ min: 5, max: 50 });
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

  console.log(`   - ${products.length} products created`);

  // Count total purchases created
  const totalPurchasesCreated = await prisma.purchase.count();
  console.log(`   - ${totalPurchasesCreated} purchases created`);

  // Count total purchase items created
  const totalPurchaseItems = await prisma.purchaseItem.count();
  console.log(`   - ${totalPurchaseItems} purchase items created`);

  return products;
}