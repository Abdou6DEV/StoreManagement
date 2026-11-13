export async function ensureOrdersSchema(client: { $executeRawUnsafe: (query: string) => Promise<unknown> }) {
  await client.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CustomerOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productName" TEXT NOT NULL,
    "details" TEXT,
    "quantity" INTEGER NOT NULL,
    "clientId" TEXT,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT,
    "dueDate" TEXT NOT NULL,
    "paidAmount" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerOrder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`);
  await client.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CustomerOrder_status_dueDate_idx" ON "CustomerOrder"("status", "dueDate")');
  await client.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CustomerOrder_clientId_idx" ON "CustomerOrder"("clientId")');
}