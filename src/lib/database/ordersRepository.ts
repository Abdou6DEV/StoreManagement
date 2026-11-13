import type { PrismaClient } from "@prisma/client";
import type { OrderInput, OrderRecord, OrderStatus } from "./orderTypes";

function validateOrder(input: OrderInput) {
  if (!input || typeof input.productName !== "string" || !input.productName.trim() || input.productName.trim().length > 500) throw new Error("Invalid product name");
  if (typeof input.details !== "string" || input.details.length > 2000) throw new Error("Invalid order details");
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 2147483647) throw new Error("Invalid quantity");
  if (input.paidAmount !== null && (!Number.isInteger(input.paidAmount) || input.paidAmount < 0 || input.paidAmount > 2147483647)) throw new Error("Invalid paid amount");
  if (typeof input.dueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) throw new Error("Invalid due date");
  const date = new Date(`${input.dueDate}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input.dueDate) throw new Error("Invalid due date");
  if (input.clientId !== null && (typeof input.clientId !== "string" || !input.clientId)) throw new Error("Invalid client");
}

export function createOrdersRepository(database: PrismaClient) {
  const getAll = async (): Promise<OrderRecord[]> => {
    const orders = await database.customerOrder.findMany({ orderBy: { createdAt: "desc" } });
    return orders.map((order) => ({ ...order, details: order.details ?? "", status: order.status as OrderStatus }));
  };

  const save = async (input: OrderInput, id?: string): Promise<OrderRecord> => {
    validateOrder(input);
    return database.$transaction(async (transaction) => {
      const previous = id ? await transaction.customerOrder.findUnique({ where: { id } }) : null;
      if (id && (!previous || previous.status === "completed")) throw new Error("Order cannot be edited");
      if (!id && !input.clientId) throw new Error("A client is required");
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      if (input.dueDate < today && input.dueDate !== previous?.dueDate) throw new Error("Due date cannot be in the past");
      const client = input.clientId ? await transaction.client.findUnique({ where: { id: input.clientId } }) : null;
      if (input.clientId && !client) throw new Error("Client no longer exists");
      const data = {
        productName: input.productName.trim(), details: input.details.trim() || null,
        quantity: input.quantity, clientId: input.clientId,
        clientName: client?.name ?? previous?.clientName ?? "",
        clientPhone: client ? client.phone : previous?.clientPhone ?? null,
        dueDate: input.dueDate, paidAmount: input.paidAmount,
      };
      if (id) {
        const result = await transaction.customerOrder.updateMany({ where: { id, status: { not: "completed" } }, data });
        if (result.count !== 1) throw new Error("Order cannot be edited");
        const updated = await transaction.customerOrder.findUniqueOrThrow({ where: { id } });
        return { ...updated, details: updated.details ?? "", status: updated.status as OrderStatus };
      }
      const created = await transaction.customerOrder.create({ data });
      return { ...created, details: created.details ?? "", status: created.status as OrderStatus };
    });
  };

  const setStatus = async (id: string, status: OrderStatus) => {
    const previous = status === "stocked" ? "pending" : status === "completed" ? "stocked" : null;
    if (!previous) throw new Error("Invalid status transition");
    const result = await database.customerOrder.updateMany({ where: { id, status: previous }, data: { status } });
    if (result.count !== 1) throw new Error("Order status changed or order no longer exists");
  };

  const remove = async (id: string) => {
    const result = await database.customerOrder.deleteMany({ where: { id } });
    if (result.count !== 1) throw new Error("Order no longer exists");
  };

  const cancelCompletion = async (id: string) => {
    const result = await database.customerOrder.updateMany({ where: { id, status: "completed" }, data: { status: "stocked" } });
    if (result.count !== 1) throw new Error("Order status changed or order no longer exists");
  };

  const cancelStocked = async (id: string) => {
    const result = await database.customerOrder.updateMany({ where: { id, status: "stocked" }, data: { status: "pending" } });
    if (result.count !== 1) throw new Error("Order status changed or order no longer exists");
  };

  return { getAll, save, setStatus, cancelCompletion, cancelStocked, remove };
}