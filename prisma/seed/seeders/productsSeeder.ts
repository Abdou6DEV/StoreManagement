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

  // Realistic store data for testing: ~2,000 products
  const totalProducts = 2000;
  const batchSize = 500; // Process in batches for better performance
  
  console.log(`   - Creating ${totalProducts} products in batches of ${batchSize}...`);

  for (let batchStart = 0; batchStart < totalProducts; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, totalProducts);
    const currentBatchSize = batchEnd - batchStart;
    
    console.log(`   - Processing batch ${Math.floor(batchStart / batchSize) + 1}/${Math.ceil(totalProducts / batchSize)} (${currentBatchSize} products)...`);

    // Prepare batch data
    const productsData: any[] = [];
    const purchasesData: any[] = [];
    const purchaseItemsData: any[] = [];

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

      // Calculate total quantity from purchases
      const numPurchases = faker.number.int({ min: 1, max: 4 });
      let currentQuantity = 0;

      for (let j = 0; j < numPurchases; j++) {
        const purchaseQuantity = faker.number.int({ min: 5, max: 50 });
        currentQuantity += purchaseQuantity;
      }

      // Prepare product data for bulk insert
      productsData.push({
        name: productName,
        categoryName: category,
        quantity: currentQuantity,
        boughtPrice: Number(boughtPrice),
        sellingPrice: sellingPrice,
        codebar: faker.string.numeric(12),
        photo: generateProductPhoto(),
      });

      // Prepare purchase data for this product
      for (let j = 0; j < numPurchases; j++) {
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
          productIndex: i,
        });

        purchaseItemsData.push({
          productIndex: i,
          purchaseIndex: purchasesData.length - 1,
          quantity: purchaseQuantity,
          price: Number(boughtPrice),
          createdAt: purchaseDate,
          updatedAt: purchaseDate,
        });
      }
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

    // Bulk create purchases
    await prisma.purchase.createMany({
      data: purchasesData.map(p => ({
        sellerId: p.sellerId,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })) as any,
    });

    // Get the created purchases for this batch
    const batchPurchases = await prisma.purchase.findMany({
      where: {
        createdAt: { gte: twoYearsAgo }
      },
      orderBy: { createdAt: 'desc' },
      take: purchasesData.length,
    });

    // Bulk create purchase items
    const purchaseItemsToCreate = purchaseItemsData.map(item => ({
      productId: batchProducts[item.productIndex].id,
      purchaseId: batchPurchases[item.purchaseIndex].id,
      quantity: item.quantity,
      price: item.price,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    await prisma.purchaseItem.createMany({
      data: purchaseItemsToCreate as any,
    });

    products.push(...batchProducts);
  }

  console.log(`   - ${products.length} products created`);

  // Count total purchases created
  const totalPurchases = await prisma.purchase.count();
  console.log(`   - ${totalPurchases} purchases created`);

  // Count total purchase items created
  const totalPurchaseItems = await prisma.purchaseItem.count();
  console.log(`   - ${totalPurchaseItems} purchase items created`);

  return products;
}