import { PrismaClient } from "@prisma/client";
import path from "path";
import { app } from "electron";
import logger from "../logger";

const isDev = process.env.NODE_ENV === "development";
const dbPath = isDev
  ? path.join(process.cwd(), "prisma", "dev.db")
  : path.join(app.getPath("userData"), "database.db");

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${dbPath}`,
    },
  },
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
