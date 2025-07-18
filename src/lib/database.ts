import { PrismaClient } from "@prisma/client";
import path from "path";
import { app } from "electron";

// Get the user data path for storing the database
const isDev = process.env.NODE_ENV === "development";
const dbPath = isDev
  ? path.join(process.cwd(), "prisma", "dev.db")
  : path.join(app.getPath("userData"), "database.db");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${dbPath}`,
    },
  },
});

export class DatabaseService {
  static async initialize() {
    try {
      await prisma.$connect();
      console.log("Database connected successfully!");
    } catch (error) {
      console.error("Database connection failed: ", error);
    }
  }

  static async disconnect() {
    await prisma.$disconnect();
  }

  static get client() {
    return prisma;
  }

  static async getAllCategories() {
    return await prisma.category.findMany();
  }

  static async ensureCategory(name: string) {
    let category = await prisma.category.findUnique({ where: { name } });
    if (!category) {
      category = await prisma.category.create({ data: { name } });
    }
    return category;
  }

  static async createClient(data: {
    name: string;
    phone?: string;
    address?: string;
    notes?: string;
  }) {
    return await prisma.client.create({ data });
  }

  static async createSale(data: {
    clientId?: string;
    items: { productId: string; quantity: number; price: number }[];
    discount?: number;
  }) {
    // Create sale and sale items in a transaction, and decrement product quantities
    return await prisma.$transaction(async (tx) => {
      // Decrement stock, but do not allow negative quantities
      for (const item of data.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (product) {
          const newQty = Math.max(0, product.quantity - item.quantity);
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: newQty },
          });
        }
      }
      
      // Create sale
      const sale = await tx.sale.create({
        data: {
          clientId: data.clientId,
          discount: data.discount ?? 0,
          saleItems: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
      });
      return sale;
    });
  }

  static async getAllClients() {
    return await prisma.client.findMany();
  }
}
