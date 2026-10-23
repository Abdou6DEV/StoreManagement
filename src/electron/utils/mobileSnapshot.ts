import type { PrismaClient } from "@prisma/client";

export type MobileSyncSnapshot = {
  users: Record<string, unknown>[];
  permissions: Record<string, unknown>[];
  categories: Record<string, unknown>[];
  products: Record<string, unknown>[];
  manual_products: Record<string, unknown>[];
  suppliers: Record<string, unknown>[];
  purchases: Record<string, unknown>[];
  purchase_items: Record<string, unknown>[];
  clients: Record<string, unknown>[];
  services: Record<string, unknown>[];
  service_appointments: Record<string, unknown>[];
  sales: Record<string, unknown>[];
  sale_items: Record<string, unknown>[];
  payments: Record<string, unknown>[];
  bills: Record<string, unknown>[];
  bill_payments: Record<string, unknown>[];
  dashboard_daily: Record<string, unknown>[];
};

function iso(date: Date): string {
  return date.toISOString();
}

function localDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function emptyDay(day: string) {
  return {
    local_day: day,
    sales_count: 0,
    revenue: 0,
    profit: 0,
    total_items: 0,
    bill_payments: 0,
  };
}

function dashboardRows(
  sales: Array<{
    createdAt: Date;
    totalAmountWithDiscount: number;
    totalProfit: number;
    totalItems: number;
  }>,
  billPayments: Array<{ paidDate: Date; amount: number }>,
) {
  const days = new Map<string, ReturnType<typeof emptyDay>>();
  for (const sale of sales) {
    const key = localDay(sale.createdAt);
    const row = days.get(key) ?? emptyDay(key);
    row.sales_count += 1;
    row.revenue += sale.totalAmountWithDiscount;
    row.profit += sale.totalProfit;
    row.total_items += sale.totalItems;
    days.set(key, row);
  }
  for (const payment of billPayments) {
    const key = localDay(payment.paidDate);
    const row = days.get(key) ?? emptyDay(key);
    row.bill_payments += payment.amount;
    days.set(key, row);
  }
  return [...days.values()].sort((left, right) =>
    left.local_day.localeCompare(right.local_day),
  );
}

function validatePasswordHashes(
  users: Array<{ id: string; username: string; password: string; isActive: boolean }>,
): void {
  if (users.length === 0 || !users.some((user) => user.isActive)) {
    throw new Error("No active desktop users are available for mobile login.");
  }
  for (const user of users) {
    if (!/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(user.password)) {
      throw new Error("A stored desktop password is not a supported bcrypt hash.");
    }
  }
}

export async function buildMobileSyncSnapshot(
  db: PrismaClient,
  customerId: string,
): Promise<MobileSyncSnapshot> {
  const [
    users,
    permissions,
    categories,
    products,
    manualProducts,
    suppliers,
    purchases,
    purchaseItems,
    clients,
    services,
    serviceAppointments,
    sales,
    saleItems,
    payments,
    bills,
    billPayments,
  ] = await Promise.all([
    db.user.findMany(),
    db.userPermissions.findMany(),
    db.category.findMany(),
    db.product.findMany(),
    db.manualProduct.findMany(),
    db.seller.findMany(),
    db.purchase.findMany(),
    db.purchaseItem.findMany(),
    db.client.findMany(),
    db.service.findMany(),
    db.serviceAppointment.findMany(),
    db.sale.findMany(),
    db.saleItem.findMany(),
    db.payment.findMany(),
    db.bill.findMany(),
    db.billPayment.findMany(),
  ]);

  validatePasswordHashes(users);

  return {
    users: users.map((user) => ({
      customer_id: customerId,
      source_id: user.id,
      username: user.username,
      email: user.email,
      password_hash: user.password,
      role: user.role,
      is_active: user.isActive,
      source_created_at: iso(user.createdAt),
      source_updated_at: iso(user.updatedAt),
    })),
    permissions: permissions.map((permission) => ({
      customer_id: customerId,
      source_id: permission.id,
      user_source_id: permission.userId,
      can_access_cashier: permission.canAccessCashier,
      can_access_stock: permission.canAccessStock,
      can_access_clients: permission.canAccessClients,
      can_access_bills: permission.canAccessBills,
      can_access_history: permission.canAccessHistory,
      can_access_dashboard: permission.canAccessDashboard,
      can_access_services: permission.canAccessServices,
      can_access_zakat: permission.canAccessZakat,
      can_manage_users: permission.canManageUsers,
      can_view_logs: permission.canViewLogs,
      can_manage_settings: permission.canManageSettings,
      source_updated_at: iso(permission.updatedAt),
    })),
    categories: categories.map((category) => ({
      customer_id: customerId,
      source_id: category.name,
      name: category.name,
      source_updated_at: iso(category.updatedAt),
    })),
    products: products.map((product) => ({
      customer_id: customerId,
      source_id: product.id,
      name: product.name,
      category_name: product.categoryName,
      quantity: product.quantity,
      bought_price: product.boughtPrice,
      selling_price: product.sellingPrice,
      codebar: product.codebar,
      source_created_at: iso(product.createdAt),
      source_updated_at: iso(product.updatedAt),
    })),
    manual_products: manualProducts.map((item) => ({
      customer_id: customerId, source_id: item.id, name: item.name, type: item.type,
      cost_price: item.costPrice, source_created_at: iso(item.createdAt), source_updated_at: iso(item.updatedAt),
    })),
    suppliers: suppliers.map((seller) => ({
      customer_id: customerId, source_id: seller.id, name: seller.name, phone: seller.phone,
      email: seller.email, address: seller.address, notes: seller.notes,
      source_created_at: iso(seller.createdAt), source_updated_at: iso(seller.updatedAt),
    })),
    purchases: purchases.map((purchase) => ({
      customer_id: customerId, source_id: purchase.id, supplier_source_id: purchase.sellerId,
      source_created_at: iso(purchase.createdAt), source_updated_at: iso(purchase.updatedAt),
    })),
    purchase_items: purchaseItems.map((item) => ({
      customer_id: customerId, source_id: item.id, purchase_source_id: item.purchaseId,
      product_source_id: item.productId, quantity: item.quantity, price: item.price,
      source_created_at: iso(item.createdAt), source_updated_at: iso(item.updatedAt),
    })),
    clients: clients.map((client) => ({
      customer_id: customerId,
      source_id: client.id,
      name: client.name,
      phone: client.phone,
      address: client.address,
      notes: client.notes,
      source_created_at: iso(client.createdAt),
      source_updated_at: iso(client.updatedAt),
    })),
    services: services.map((service) => ({
      customer_id: customerId,
      source_id: service.id,
      name: service.name,
      description: service.description,
      cost_price: service.costPrice,
      source_updated_at: iso(service.updatedAt),
    })),
    service_appointments: serviceAppointments.map((appointment) => ({
      customer_id: customerId,
      source_id: appointment.id,
      name: appointment.name,
      service_type: appointment.serviceType,
      description: appointment.description,
      cost_price: appointment.costPrice,
      service_price: appointment.servicePrice,
      client_source_id: appointment.clientId,
      due_date: iso(appointment.dueDate),
      notes: appointment.notes,
      is_completed: appointment.isCompleted,
      completed_at: appointment.completedAt
        ? iso(appointment.completedAt)
        : null,
      source_created_at: iso(appointment.createdAt),
      source_updated_at: iso(appointment.updatedAt),
    })),
    sales: sales.map((sale) => ({
      customer_id: customerId,
      source_id: sale.id,
      client_source_id: sale.clientId,
      discount: sale.discount,
      total_amount: sale.totalAmount,
      total_amount_with_discount: sale.totalAmountWithDiscount,
      total_items: sale.totalItems,
      total_cost: sale.totalCost,
      total_profit: sale.totalProfit,
      source_created_at: iso(sale.createdAt),
      source_updated_at: iso(sale.updatedAt),
    })),
    sale_items: saleItems.map((item) => ({
      customer_id: customerId,
      source_id: item.id,
      sale_source_id: item.saleId,
      product_source_id: item.productId,
      manual_product_source_id: item.manualProductId,
      service_source_id: item.serviceId,
      quantity: item.quantity,
      price: item.price,
      bought_price: item.boughtPrice,
      source_updated_at: iso(item.updatedAt),
    })),
    payments: payments.map((payment) => ({
      customer_id: customerId,
      source_id: payment.id,
      sale_source_id: payment.saleId,
      client_source_id: payment.clientId,
      given_amount: payment.givenAmount,
      credit_amount: payment.creditAmount,
      reason: payment.reason,
      due_date: iso(payment.dueDate),
      paid_date: payment.paidDate ? iso(payment.paidDate) : null,
      type: payment.type,
      pending_sale_items: payment.pendingSaleItems,
      discount: payment.discount,
      source_created_at: iso(payment.createdAt),
      source_updated_at: iso(payment.updatedAt),
    })),
    bills: bills.map((bill) => ({
      customer_id: customerId,
      source_id: bill.id,
      title: bill.title,
      description: bill.description,
      type: bill.type,
      amount: bill.amount,
      next_bill_date: iso(bill.nextBillDate),
      duration: bill.duration,
      notes: bill.notes,
      source_created_at: iso(bill.createdAt),
      source_updated_at: iso(bill.updatedAt),
    })),
    bill_payments: billPayments.map((payment) => ({
      customer_id: customerId,
      source_id: payment.id,
      bill_source_id: payment.billId,
      amount: payment.amount,
      paid_date: iso(payment.paidDate),
      notes: payment.notes,
      source_created_at: iso(payment.createdAt),
      source_updated_at: iso(payment.createdAt),
    })),
    dashboard_daily: dashboardRows(sales, billPayments).map((row) => ({
      customer_id: customerId,
      ...row,
    })),
  };
}
