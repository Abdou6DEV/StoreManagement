import path from "path";
import { app } from "electron";
import logger from "../logger";

const isDev = process.env.NODE_ENV === "development";
const dbPath = isDev
  ? path.join(process.cwd(), "prisma", "dev.db")
  : path.join(app.getPath("userData"), "database.db");

// Global variables for Prisma
let PrismaClientClass: typeof import("@prisma/client").PrismaClient | null = null;
let prismaClientInstance: import("@prisma/client").PrismaClient | null = null;
let isInitialized = false;
let initializationPromise: Promise<import("@prisma/client").PrismaClient> | null = null;

// Function to initialize database schema
async function initializeDatabase() {
  if (!prismaClientInstance) {
    throw new Error("Prisma client not initialized");
  }

  try {
    console.log("🔍 Checking database schema...");
    logger.info("Checking database schema...", "Database");
    
    // Try to connect and check if tables exist
    await prismaClientInstance.$connect();
    
    // Try a simple query to check if the User table exists
    try {
      await prismaClientInstance.user.findFirst();
      console.log("✅ Database schema already exists");
      logger.info("Database schema already exists", "Database");
    } catch (error) {
      // If the query fails, it likely means tables don't exist
      console.log("🔍 Database schema not found, creating tables...");
      logger.info("Database schema not found, creating tables...", "Database");
      
      // Push the database schema
      try {
        // In production, we'll use a more direct approach
        await prismaClientInstance.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "User" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "username" TEXT NOT NULL UNIQUE,
            "email" TEXT,
            "password" TEXT NOT NULL,
            "role" TEXT NOT NULL DEFAULT 'USER',
            "isActive" BOOLEAN NOT NULL DEFAULT true,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);
        
        await prismaClientInstance.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "UserPermissions" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "userId" TEXT NOT NULL UNIQUE,
            "canAccessCashier" BOOLEAN NOT NULL DEFAULT false,
            "canAccessStock" BOOLEAN NOT NULL DEFAULT false,
            "canAccessClients" BOOLEAN NOT NULL DEFAULT false,
            "canAccessBills" BOOLEAN NOT NULL DEFAULT false,
            "canAccessHistory" BOOLEAN NOT NULL DEFAULT false,
            "canAccessDashboard" BOOLEAN NOT NULL DEFAULT false,
            "canManageUsers" BOOLEAN NOT NULL DEFAULT false,
            "canViewLogs" BOOLEAN NOT NULL DEFAULT false,
            "canManageSettings" BOOLEAN NOT NULL DEFAULT false,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
          );
        `);

        // Create other essential tables
        await prismaClientInstance.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "Category" (
            "name" TEXT NOT NULL PRIMARY KEY,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await prismaClientInstance.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "Product" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "name" TEXT NOT NULL UNIQUE,
            "categoryName" TEXT NOT NULL,
            "quantity" INTEGER NOT NULL,
            "boughtPrice" INTEGER NOT NULL,
            "sellingPrice" INTEGER NOT NULL,
            "codebar" TEXT,
            "photo" TEXT,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY ("categoryName") REFERENCES "Category"("name") ON DELETE CASCADE ON UPDATE CASCADE
          );
        `);

        await prismaClientInstance.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "Client" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "name" TEXT NOT NULL UNIQUE,
            "phone" TEXT,
            "address" TEXT,
            "notes" TEXT,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await prismaClientInstance.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "Sale" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "clientId" TEXT,
            "discount" INTEGER NOT NULL DEFAULT 0,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE
          );
        `);

        await prismaClientInstance.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "ManualProduct" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "name" TEXT NOT NULL,
            "type" TEXT NOT NULL,
            "costPrice" INTEGER NOT NULL DEFAULT 0,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE("name", "type")
          );
        `);

        await prismaClientInstance.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "Service" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "name" TEXT NOT NULL UNIQUE,
            "description" TEXT,
            "costPrice" INTEGER NOT NULL DEFAULT 0,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await prismaClientInstance.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "SaleItem" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "productId" TEXT,
            "manualProductId" TEXT,
            "serviceId" TEXT,
            "saleId" TEXT NOT NULL,
            "quantity" INTEGER NOT NULL,
            "price" INTEGER NOT NULL,
            "boughtPrice" INTEGER,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY ("manualProductId") REFERENCES "ManualProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE,
            UNIQUE("productId", "saleId"),
            UNIQUE("manualProductId", "saleId"),
            UNIQUE("serviceId", "saleId")
          );
        `);

        await prismaClientInstance.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "Payment" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "saleId" TEXT UNIQUE,
            "clientId" TEXT NOT NULL,
            "givenAmount" INTEGER NOT NULL,
            "dueDate" DATETIME NOT NULL,
            "paidDate" DATETIME,
            "type" TEXT NOT NULL,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE
          );
        `);

        await prismaClientInstance.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "Seller" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "name" TEXT NOT NULL UNIQUE,
            "phone" TEXT,
            "email" TEXT,
            "address" TEXT,
            "notes" TEXT,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await prismaClientInstance.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "Purchase" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "sellerId" TEXT,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE SET NULL ON UPDATE CASCADE
          );
        `);

        await prismaClientInstance.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "PurchaseItem" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "productId" TEXT NOT NULL,
            "purchaseId" TEXT NOT NULL,
            "quantity" INTEGER NOT NULL,
            "price" INTEGER NOT NULL,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE
          );
        `);

        await prismaClientInstance.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "Bill" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "title" TEXT NOT NULL,
            "description" TEXT,
            "type" TEXT NOT NULL,
            "amount" INTEGER NOT NULL,
            "nextBillDate" DATETIME NOT NULL,
            "duration" TEXT NOT NULL,
            "notes" TEXT,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await prismaClientInstance.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "BillPayment" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "billId" TEXT NOT NULL,
            "amount" INTEGER NOT NULL,
            "paidDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "notes" TEXT,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE
          );
        `);

        await prismaClientInstance.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "Option" (
            "key" TEXT NOT NULL PRIMARY KEY,
            "value" TEXT NOT NULL,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);

        logger.info("Database schema created successfully", "Database");
      } catch (schemaError) {
        logger.error("Failed to create database schema", "Database", schemaError);
        throw schemaError;
      }
    }
  } catch (error) {
    logger.error("Database initialization failed", "Database", error);
    throw error;
  }
}

// Simplified initialization that avoids import bundling issues
async function initializePrismaClient() {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      console.log("🔍 Initializing Prisma client...");
      console.log("🔍 Environment:", isDev ? "development" : "production");
      console.log("🔍 Database path:", dbPath);

      // Create a basic client that will work in both dev and production
      // Use dynamic require to avoid bundling issues
      const moduleName = "@prisma/client";
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const prismaModule = require(moduleName);
      PrismaClientClass = prismaModule.PrismaClient;
      
      // Create the instance
      prismaClientInstance = new PrismaClientClass({
  datasources: {
    db: {
      url: `file:${dbPath}`,
    },
  },
      });

      console.log("✅ Prisma client created");

      // Initialize the database schema if needed
      console.log("🔍 Initializing database...");
      await initializeDatabase();
      console.log("✅ Database initialization complete");
      
      isInitialized = true;
      return prismaClientInstance;
    } catch (error) {
      console.error("❌ Failed to initialize Prisma client:", error);
      logger.error("Failed to initialize Prisma client", "Database", error);
      throw error;
    }
  })();

  return initializationPromise;
}

// Export a promise that resolves to the Prisma client
export const prismaPromise = initializePrismaClient();

// Export a synchronous getter (will throw if called before initialization)
export const getPrisma = () => {
  if (!prismaClientInstance || !isInitialized) {
    throw new Error("Prisma client not initialized yet. Use await prismaPromise first.");
  }
  return prismaClientInstance;
};

// For backward compatibility, export prisma as a getter
export const prisma = new Proxy({} as import("@prisma/client").PrismaClient, {
  get(target, prop) {
    if (!prismaClientInstance || !isInitialized) {
      throw new Error("Prisma client not initialized yet. Use await prismaPromise first.");
    }
    return (prismaClientInstance as import("@prisma/client").PrismaClient)[prop as keyof import("@prisma/client").PrismaClient];
  }
});

export async function initializePrisma() {
  try {
    await prisma.$connect();
    logger.info("Database connected successfully", "Database");
  } catch (error) {
    logger.error("Database connection failed", "Database", error);
  }
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
