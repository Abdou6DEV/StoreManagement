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

  for (let i = 0; i < 1000; i++) {
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

        await tx.purchase.create({
          data: {
            productId: createdProduct.id,
            sellerId: seller?.id || null,
            quantity: purchaseQuantity,
            price: Number(boughtPrice),
            createdAt: purchaseDate,
            updatedAt: purchaseDate,
          },
        });

        // Update product quantity after each purchase
        await tx.product.update({
          where: { id: createdProduct.id },
          data: { quantity: currentQuantity },
        });
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

  console.log(`   - ${1000} products with purchases created`);
  console.log(`   - Products array contains ${products.length} products`);

  // Check how many products have stock
  const productsWithStock = products.filter((p) => p.quantity > 0);
  console.log(`   - ${productsWithStock.length} products have stock available`);

  return products;
}
