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

  for (let i = 0; i < 6000; i++) {
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

    // Wrap product creation, purchases, and quantity update in a transaction
    const createdProduct = await prisma.$transaction(async (tx) => {
      // Create the product with initial quantity of 0
      const createdProduct = await tx.product.create({
        data: {
          name: productName,
          categoryName: category,
          quantity: 0,
          boughtPrice: Number(boughtPrice),
          sellingPrice: sellingPrice,
          codebar: faker.string.numeric(12),
          photo: generateProductPhoto(),
        },
      });

      // Create multiple purchases for the product
      const numPurchases = faker.number.int({ min: 1, max: 4 });
      let currentQuantity = 0;

      for (let j = 0; j < numPurchases; j++) {
        const seller = faker.helpers.maybe(
          () => faker.helpers.arrayElement(sellers),
          { probability: 0.85 }, // 85% chance to have a seller, 15% chance for no seller
        );

        const purchaseQuantity = faker.number.int({ min: 5, max: 50 });
        currentQuantity += purchaseQuantity;

        const purchaseDate = faker.date.between({
          from: twoYearsAgo,
          to: new Date(),
        });

        // Create a purchase with PurchaseItems
        await tx.purchase.create({
          data: {
            sellerId: seller?.id || null,
            createdAt: purchaseDate,
            updatedAt: purchaseDate,
            PurchaseItems: {
              create: [
                {
                  productId: createdProduct.id,
                  quantity: purchaseQuantity,
                  price: Number(boughtPrice),
                  createdAt: purchaseDate,
                  updatedAt: purchaseDate,
                },
              ],
            },
          },
        });

        // Update product quantity after each purchase
        await tx.product.update({
          where: { id: createdProduct.id },
          data: { quantity: currentQuantity },
        });
      }

      // Sometimes create purchases with multiple products (multi-item purchases)
      if (faker.datatype.boolean(0.2)) {
        // 20% chance for multi-item purchase
        const otherProducts = await tx.product.findMany({
          take: faker.number.int({ min: 2, max: 4 }),
          skip: Math.max(0, i - 50), // Get some recently created products
        });

        if (otherProducts.length > 0) {
          const seller = faker.helpers.maybe(
            () => faker.helpers.arrayElement(sellers),
            { probability: 0.85 },
          );

          const purchaseDate = faker.date.between({
            from: twoYearsAgo,
            to: new Date(),
          });

          // Create a multi-item purchase
          const purchaseItems = otherProducts.map((product) => ({
            productId: product.id,
            quantity: faker.number.int({ min: 1, max: 10 }),
            price: product.boughtPrice,
            createdAt: purchaseDate,
            updatedAt: purchaseDate,
          }));

          await tx.purchase.create({
            data: {
              sellerId: seller?.id || null,
              createdAt: purchaseDate,
              updatedAt: purchaseDate,
              PurchaseItems: {
                create: purchaseItems,
              },
            },
          });

          // Update quantities for all products in the multi-item purchase
          for (const item of purchaseItems) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                quantity: {
                  increment: item.quantity,
                },
              },
            });
          }
        }
      }

      // Return the created product with updated quantity
      return await tx.product.findUnique({
        where: { id: createdProduct.id },
      });
    });

    // Add the created product to our products array
    if (createdProduct) {
      products.push(createdProduct);
    }

    if ((i + 1) % 100 === 0) {
      console.log(`   - Generated ${i + 1} products with purchases...`);
    }
  }

  console.log(`   - ${6000} products with purchases created`);
  console.log(`   - Products array contains ${products.length} products`);

  // Check how many products have stock
  const productsWithStock = products.filter((p) => p.quantity > 0);
  console.log(`   - ${productsWithStock.length} products have stock available`);

  // Log some statistics about the purchases
  const totalPurchases = await prisma.purchase.count();
  const totalPurchaseItems = await prisma.purchaseItem.count();
  console.log(`   - Created ${totalPurchases} purchase records`);
  console.log(`   - Created ${totalPurchaseItems} purchase items`);

  return products;
}
