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
      console.log("Database connected successfully");
    } catch (error) {
      console.error("Database connection failed:", error);
    }
  }

  static async disconnect() {
    await prisma.$disconnect();
  }

  static get client() {
    return prisma;
  }
}
