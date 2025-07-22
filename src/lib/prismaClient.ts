import { PrismaClient } from "@prisma/client";
import path from "path";
import { app } from "electron";

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
    console.log("Database connected successfully!");
  } catch (error) {
    console.error("Database connection failed: ", error);
  }
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
} 