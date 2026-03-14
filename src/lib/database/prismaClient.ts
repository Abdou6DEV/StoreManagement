import path from "path";
import { app } from "electron";
import logger from "../logger";

const isDev = process.env.NODE_ENV === "development";
const dbPath = isDev
  ? path.join(process.cwd(), "prisma", "dev.db")
  : path.join(app.getPath("userData"), "store_management.db");

// Global variables for Prisma
let PrismaClientClass: typeof import("@prisma/client").PrismaClient | null = null;
let prismaClientInstance: import("@prisma/client").PrismaClient | null = null;
let isInitialized = false;
let initializationPromise: Promise<import("@prisma/client").PrismaClient> | null = null;

// Manual table creation as fallback
async function createTablesManually(client: any) {
  console.log("🔍 Creating tables manually...");
  console.log("🔍 Client type:", typeof client);
  console.log("🔍 Client has $executeRawUnsafe:", typeof client.$executeRawUnsafe);
  
  // Simple table creation without complex constraints
  const tables = [
    `CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT PRIMARY KEY,
      "username" TEXT UNIQUE NOT NULL,
      "email" TEXT,
      "password" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'USER',
      "isActive" INTEGER NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS "UserPermissions" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT UNIQUE NOT NULL,
      "canAccessCashier" INTEGER NOT NULL DEFAULT 0,
      "canAccessStock" INTEGER NOT NULL DEFAULT 0,
      "canAccessClients" INTEGER NOT NULL DEFAULT 0,
      "canAccessBills" INTEGER NOT NULL DEFAULT 0,
      "canAccessHistory" INTEGER NOT NULL DEFAULT 0,
      "canAccessServices" INTEGER NOT NULL DEFAULT 0,
      "canAccessDashboard" INTEGER NOT NULL DEFAULT 0,
      "canAccessZakat" INTEGER NOT NULL DEFAULT 0,
      "canManageUsers" INTEGER NOT NULL DEFAULT 0,
      "canViewLogs" INTEGER NOT NULL DEFAULT 0,
      "canManageSettings" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS "Category" (
      "name" TEXT PRIMARY KEY,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS "Product" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT UNIQUE NOT NULL,
      "categoryName" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      "boughtPrice" INTEGER NOT NULL,
      "sellingPrice" INTEGER NOT NULL,
      "codebar" TEXT,
      "photo" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS "Client" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT UNIQUE NOT NULL,
      "phone" TEXT,
      "address" TEXT,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS "Sale" (
      "id" TEXT PRIMARY KEY,
      "clientId" TEXT,
      "discount" INTEGER NOT NULL DEFAULT 0,
      "totalAmount" INTEGER NOT NULL DEFAULT 0,
      "totalAmountWithDiscount" INTEGER NOT NULL DEFAULT 0,
      "totalItems" INTEGER NOT NULL DEFAULT 0,
      "totalCost" INTEGER NOT NULL DEFAULT 0,
      "totalProfit" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS "ManualProduct" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "costPrice" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS "Service" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT UNIQUE NOT NULL,
      "description" TEXT,
      "costPrice" INTEGER NOT NULL DEFAULT 0,
      "serviceAppointmentId" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS "SaleItem" (
      "id" TEXT PRIMARY KEY,
      "productId" TEXT,
      "manualProductId" TEXT,
      "serviceId" TEXT,
      "saleId" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      "price" INTEGER NOT NULL,
      "boughtPrice" INTEGER,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS "Payment" (
      "id" TEXT PRIMARY KEY,
      "saleId" TEXT,
      "clientId" TEXT NOT NULL,
      "givenAmount" INTEGER NOT NULL,
      "creditAmount" INTEGER,
      "dueDate" DATETIME NOT NULL,
      "paidDate" DATETIME,
      "type" TEXT NOT NULL,
      "pendingSaleItems" TEXT,
      "discount" INTEGER,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS "Seller" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT UNIQUE NOT NULL,
      "phone" TEXT,
      "email" TEXT,
      "address" TEXT,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS "Purchase" (
      "id" TEXT PRIMARY KEY,
      "sellerId" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS "PurchaseItem" (
      "id" TEXT PRIMARY KEY,
      "productId" TEXT NOT NULL,
      "purchaseId" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      "price" INTEGER NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS "Bill" (
      "id" TEXT PRIMARY KEY,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "type" TEXT NOT NULL,
      "amount" INTEGER NOT NULL,
      "nextBillDate" DATETIME NOT NULL,
      "duration" TEXT NOT NULL,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS "BillPayment" (
      "id" TEXT PRIMARY KEY,
      "billId" TEXT NOT NULL,
      "amount" INTEGER NOT NULL,
      "paidDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS "Option" (
      "key" TEXT PRIMARY KEY,
      "value" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS "ServiceAppointment" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "serviceType" TEXT NOT NULL,
      "description" TEXT,
      "costPrice" INTEGER NOT NULL DEFAULT 0,
      "servicePrice" INTEGER NOT NULL DEFAULT 0,
      "clientId" TEXT,
      "dueDate" DATETIME NOT NULL,
      "notes" TEXT,
      "isCompleted" INTEGER NOT NULL DEFAULT 0,
      "completedAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS "ActivityLog" (
      "id" TEXT PRIMARY KEY,
      "username" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "details" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  for (const sql of tables) {
    try {
      console.log("🔍 Executing SQL:", sql.substring(0, 100) + "...");
      await client.$executeRawUnsafe(sql);
      console.log("✅ Created table");
    } catch (tableError) {
      console.error("❌ Failed to create table:", tableError);
      console.error("❌ SQL:", sql);
      // Continue with other tables
    }
  }

  // Create indexes for performance
  const indexes = [
    `CREATE INDEX IF NOT EXISTS "idx_sale_clientId" ON "Sale"("clientId")`,
    `CREATE INDEX IF NOT EXISTS "idx_sale_createdAt" ON "Sale"("createdAt")`,
    `CREATE INDEX IF NOT EXISTS "idx_sale_clientId_createdAt" ON "Sale"("clientId", "createdAt")`,
    `CREATE INDEX IF NOT EXISTS "idx_product_categoryName" ON "Product"("categoryName")`,
    `CREATE INDEX IF NOT EXISTS "idx_product_name" ON "Product"("name")`,
    `CREATE INDEX IF NOT EXISTS "idx_saleitem_productId" ON "SaleItem"("productId")`,
    `CREATE INDEX IF NOT EXISTS "idx_saleitem_saleId" ON "SaleItem"("saleId")`,
    `CREATE INDEX IF NOT EXISTS "idx_saleitem_serviceId" ON "SaleItem"("serviceId")`,
    `CREATE INDEX IF NOT EXISTS "idx_serviceappointment_isCompleted" ON "ServiceAppointment"("isCompleted")`,
    `CREATE INDEX IF NOT EXISTS "idx_serviceappointment_completedAt" ON "ServiceAppointment"("completedAt")`,
    `CREATE INDEX IF NOT EXISTS "idx_serviceappointment_clientId" ON "ServiceAppointment"("clientId")`,
    `CREATE INDEX IF NOT EXISTS "idx_service_serviceAppointmentId" ON "Service"("serviceAppointmentId")`,
    `CREATE INDEX IF NOT EXISTS "idx_activitylog_username" ON "ActivityLog"("username")`,
    `CREATE INDEX IF NOT EXISTS "idx_activitylog_createdAt" ON "ActivityLog"("createdAt")`,
    `CREATE INDEX IF NOT EXISTS "idx_activitylog_username_createdAt" ON "ActivityLog"("username", "createdAt")`
  ];

  for (const sql of indexes) {
    try {
      console.log("🔍 Creating index:", sql);
      await client.$executeRawUnsafe(sql);
      console.log("✅ Created index");
    } catch (indexError) {
      console.error("❌ Failed to create index:", indexError);
      // Continue with other indexes
    }
  }
  
  console.log("✅ Manual table creation completed");
  logger.info("Database schema created manually", "Database");
}

// Ensure ActivityLog table exists (for existing DBs that didn't run migration)
async function ensureActivityLogTable(client: import("@prisma/client").PrismaClient) {
  try {
    await client.$queryRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "ActivityLog" (
        "id" TEXT PRIMARY KEY,
        "username" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "details" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
    );
    await client.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "idx_activitylog_username" ON "ActivityLog"("username")`
    );
    await client.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "idx_activitylog_createdAt" ON "ActivityLog"("createdAt")`
    );
  } catch (err) {
    console.error("ensureActivityLogTable:", err);
  }
}

// Ensure canAccessZakat column exists in UserPermissions (run first after connect)
async function ensureCanAccessZakatColumn(client: import("@prisma/client").PrismaClient) {
  try {
    const tableInfo = await client.$queryRawUnsafe<Array<Record<string, unknown>>>(
      'PRAGMA table_info("UserPermissions")'
    );
    if (!Array.isArray(tableInfo) || tableInfo.length === 0) return; // Table doesn't exist yet
    const hasColumn = tableInfo.some(
      (row) => String(row.name ?? row.NAME ?? "").toLowerCase() === "canaccesszakat"
    );
    if (hasColumn) {
      console.log("✅ canAccessZakat column already exists");
      return;
    }
    console.log("🔍 Adding canAccessZakat column to UserPermissions...");
    await client.$executeRawUnsafe(`
      ALTER TABLE "UserPermissions" ADD COLUMN "canAccessZakat" INTEGER NOT NULL DEFAULT 0
    `);
    console.log("✅ Successfully added canAccessZakat column");
    logger.info("Added canAccessZakat column to UserPermissions", "Database");
  } catch (err) {
    console.error("❌ ensureCanAccessZakatColumn:", err);
    logger.error("Failed to add canAccessZakat column", "Database", err);
  }
}

/** Delete payments whose client no longer exists (e.g. client was deleted without cascade). Runs on app start. */
async function repairOrphanPayments(
  prisma: import("@prisma/client").PrismaClient
): Promise<void> {
  try {
    const clientIds = await prisma.client.findMany({ select: { id: true } });
    const validIds = new Set(clientIds.map((c) => c.id));
    const payments = await prisma.payment.findMany({
      select: { id: true, clientId: true },
    });
    const orphanIds = payments
      .filter((p) => !validIds.has(p.clientId))
      .map((p) => p.id);
    if (orphanIds.length > 0) {
      await prisma.payment.deleteMany({ where: { id: { in: orphanIds } } });
      console.log(
        `✅ Repaired database: removed ${orphanIds.length} orphan payment(s) (client no longer exists)`
      );
      logger.info(
        `Removed ${orphanIds.length} orphan payment(s)`,
        "Database"
      );
    }
  } catch (err) {
    console.warn("Orphan payments repair skipped or failed:", err);
    logger.warn("Orphan payments repair skipped or failed", "Database", err);
  }
}

/** Delete BillPayments whose bill no longer exists. Runs on app start. */
async function repairOrphanBillPayments(
  prisma: import("@prisma/client").PrismaClient
): Promise<void> {
  try {
    const billIds = await prisma.bill.findMany({ select: { id: true } });
    const validIds = new Set(billIds.map((b) => b.id));
    const billPayments = await prisma.billPayment.findMany({
      select: { id: true, billId: true },
    });
    const orphanIds = billPayments
      .filter((p) => !validIds.has(p.billId))
      .map((p) => p.id);
    if (orphanIds.length > 0) {
      await prisma.billPayment.deleteMany({ where: { id: { in: orphanIds } } });
      console.log(
        `✅ Repaired database: removed ${orphanIds.length} orphan bill payment(s)`
      );
      logger.info(`Removed ${orphanIds.length} orphan bill payment(s)`, "Database");
    }
  } catch (err) {
    console.warn("Orphan bill payments repair skipped or failed:", err);
    logger.warn("Orphan bill payments repair skipped or failed", "Database", err);
  }
}

/** Delete PurchaseItems whose purchase or product no longer exists. Runs on app start. */
async function repairOrphanPurchaseItems(
  prisma: import("@prisma/client").PrismaClient
): Promise<void> {
  try {
    const [purchaseIds, productIds] = await Promise.all([
      prisma.purchase.findMany({ select: { id: true } }),
      prisma.product.findMany({ select: { id: true } }),
    ]);
    const validPurchaseIds = new Set(purchaseIds.map((p) => p.id));
    const validProductIds = new Set(productIds.map((p) => p.id));
    const items = await prisma.purchaseItem.findMany({
      select: { id: true, purchaseId: true, productId: true },
    });
    const orphanIds = items
      .filter(
        (i) => !validPurchaseIds.has(i.purchaseId) || !validProductIds.has(i.productId)
      )
      .map((i) => i.id);
    if (orphanIds.length > 0) {
      await prisma.purchaseItem.deleteMany({ where: { id: { in: orphanIds } } });
      console.log(
        `✅ Repaired database: removed ${orphanIds.length} orphan purchase item(s)`
      );
      logger.info(`Removed ${orphanIds.length} orphan purchase item(s)`, "Database");
    }
  } catch (err) {
    console.warn("Orphan purchase items repair skipped or failed:", err);
    logger.warn("Orphan purchase items repair skipped or failed", "Database", err);
  }
}

/** Delete UserPermissions whose user no longer exists. Runs on app start. */
async function repairOrphanUserPermissions(
  prisma: import("@prisma/client").PrismaClient
): Promise<void> {
  try {
    const userIds = await prisma.user.findMany({ select: { id: true } });
    const validIds = new Set(userIds.map((u) => u.id));
    const perms = await prisma.userPermissions.findMany({
      select: { id: true, userId: true },
    });
    const orphanIds = perms
      .filter((p) => !validIds.has(p.userId))
      .map((p) => p.id);
    if (orphanIds.length > 0) {
      await prisma.userPermissions.deleteMany({ where: { id: { in: orphanIds } } });
      console.log(
        `✅ Repaired database: removed ${orphanIds.length} orphan user permission(s)`
      );
      logger.info(`Removed ${orphanIds.length} orphan user permission(s)`, "Database");
    }
  } catch (err) {
    console.warn("Orphan user permissions repair skipped or failed:", err);
    logger.warn("Orphan user permissions repair skipped or failed", "Database", err);
  }
}

// Function to initialize database schema
async function initializeDatabase() {
  if (!prismaClientInstance) {
    throw new Error("Prisma client not initialized");
  }

  try {
    console.log("🔍 Checking database schema...");
    logger.info("Checking database schema...", "Database");
    
    // Try to connect and check if tables exist
    console.log("🔍 Connecting to database...");
    await prismaClientInstance.$connect();
    console.log("✅ Database connected successfully");

    // Run canAccessZakat migration first so user.create never fails
    await ensureCanAccessZakatColumn(prismaClientInstance);
    await ensureActivityLogTable(prismaClientInstance);
    // Remove orphan records (parent was deleted without cascade) so queries don't fail
    await repairOrphanPayments(prismaClientInstance);
    await repairOrphanBillPayments(prismaClientInstance);
    await repairOrphanPurchaseItems(prismaClientInstance);
    await repairOrphanUserPermissions(prismaClientInstance);

    // Try a simple query to check if the User table exists
    try {
      await prismaClientInstance.user.findFirst();
      console.log("✅ Database schema already exists");
      logger.info("Database schema already exists", "Database");
    } catch (error) {
      // If the query fails, it likely means tables don't exist
      console.log("🔍 Database schema not found, running migrations...");
      console.log("🔍 Error details:", error);
      logger.info("Database schema not found, running migrations...", "Database");
      
      try {
        // Use Prisma's db push functionality
        console.log("🔍 Running Prisma db push...");
        
        // Import and execute Prisma CLI programmatically
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { execSync } = require('child_process');
        const schemaPath = path.join(__dirname, '../../../prisma/schema.prisma');
        
        // Set the database URL environment variable
        process.env.DATABASE_URL = `file:${dbPath}`;
        
        // Run prisma db push
        try {
          execSync('npx prisma db push --force-reset --accept-data-loss', {
            cwd: process.cwd(),
            stdio: 'pipe',
            env: { ...process.env, DATABASE_URL: `file:${dbPath}` }
          });
          console.log("✅ Prisma db push completed successfully");
          logger.info("Database schema created via Prisma push", "Database");
        } catch (pushError) {
          console.error("❌ Prisma db push failed, trying manual schema creation...");
          console.error("❌ Push error details:", pushError);
          
          // Fallback to manual table creation with proper error handling
          await createTablesManually(prismaClientInstance);
        }
      } catch (schemaError) {
        console.error("❌ Failed to create database schema:", schemaError);
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
      console.log("🔍 Process CWD:", process.cwd());
      console.log("🔍 App userData path:", app.getPath("userData"));

      // Create a basic client that will work in both dev and production
      // Use dynamic require to avoid bundling issues
      const moduleName = "@prisma/client";
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const prismaModule = require(moduleName);
      PrismaClientClass = prismaModule.PrismaClient;
      
      // Create the instance
      const databaseUrl = `file:${dbPath}`;
      console.log("🔍 Database URL:", databaseUrl);
      
      prismaClientInstance = new PrismaClientClass({
        datasources: {
          db: {
            url: databaseUrl,
          },
        },
        log: ['error', 'warn'],
        errorFormat: 'pretty',
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
