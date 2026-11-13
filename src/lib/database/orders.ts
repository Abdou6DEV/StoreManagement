import { prisma } from "./prismaClient";
import { createOrdersRepository } from "./ordersRepository";

export const orders = createOrdersRepository(prisma);