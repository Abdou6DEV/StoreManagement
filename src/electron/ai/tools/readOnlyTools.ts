/**
 * READ-ONLY AI TOOLS
 * 
 * This module exports a registry of safe, read-only database query tools
 * that the AI assistant can call to retrieve store data.
 * 
 * ⚠️  NO MUTATIONS: These tools only READ data. No modifications to the database.
 */

import * as salesDb from "../../../lib/database/sales";
import * as productsDb from "../../../lib/database/products";
import * as clientsDb from "../../../lib/database/clients";
import * as paymentsDb from "../../../lib/database/payments";
import * as purchasesDb from "../../../lib/database/purchases";
import * as servicesDb from "../../../lib/database/services";
import * as serviceAppointmentsDb from "../../../lib/database/serviceAppointments";
import * as billsDb from "../../../lib/database/bills";
import * as sellersDb from "../../../lib/database/sellers";
import * as categoriesDb from "../../../lib/database/categories";
import * as manualProductsDb from "../../../lib/database/manualProducts";
import * as activityLogsDb from "../../../lib/database/activityLogs";

export interface AIToolInput {
  [key: string]: any;
}

export interface AIToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

// ============================================================================
// SALES TOOLS
// ============================================================================

export async function tool_get_all_sales(): Promise<AIToolResult> {
  try {
    const sales = await salesDb.getAllSales();
    return {
      success: true,
      data: sales,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch sales: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_sales_by_date_range(input: {
  startDate: string | Date;
  endDate: string | Date;
}): Promise<AIToolResult> {
  try {
    // Debug logging
    console.log(
      `[TOOL] get_sales_by_date_range called with: startDate=${JSON.stringify(input.startDate)}, endDate=${JSON.stringify(input.endDate)}`
    );

    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    console.log(
      `[TOOL] Parsed dates: startDate=${startDate.toISOString()}, endDate=${endDate.toISOString()}`
    );

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error(
        `[TOOL] Invalid dates received: startDate=${input.startDate} (${startDate.getTime()}), endDate=${input.endDate} (${endDate.getTime()})`
      );
      return {
        success: false,
        error: `Invalid date format. Received: startDate="${input.startDate}", endDate="${input.endDate}". Use ISO string (YYYY-MM-DD) or Date object.`,
      };
    }

    const sales = await salesDb.getSalesByDateRange(startDate, endDate);
    return {
      success: true,
      data: sales,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch sales by date: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_sales_summary(input: {
  startDate: string | Date;
  endDate: string | Date;
}): Promise<AIToolResult> {
  try {
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return {
        success: false,
        error: "Invalid date format. Use ISO string (YYYY-MM-DD) or Date object.",
      };
    }

    const summary = await salesDb.getSalesSummary(startDate, endDate);
    return {
      success: true,
      data: summary,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch sales summary: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_recent_sales(input?: {
  limit?: number;
  offset?: number;
  days?: number;
}): Promise<AIToolResult> {
  try {
    const limit = input?.limit || 50;
    const offset = input?.offset || 0;
    const days = input?.days || 7;

    const sales = await salesDb.getRecentSales(limit, offset, days);
    return {
      success: true,
      data: sales,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch recent sales: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_sales_by_client(input: {
  clientId: string;
}): Promise<AIToolResult> {
  try {
    if (!input.clientId) {
      return {
        success: false,
        error: "clientId is required",
      };
    }

    const sales = await salesDb.getSalesByClient(input.clientId);
    return {
      success: true,
      data: sales,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch client sales: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_sale_by_id(input: {
  saleId: string;
}): Promise<AIToolResult> {
  try {
    if (!input.saleId) {
      return {
        success: false,
        error: "saleId is required",
      };
    }

    const sale = await salesDb.getSaleById(input.saleId);
    if (!sale) {
      return {
        success: false,
        error: `Sale not found: ${input.saleId}`,
      };
    }

    return {
      success: true,
      data: sale,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch sale: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_search_sales(input: {
  query: string;
  filters?: any;
}): Promise<AIToolResult> {
  try {
    if (!input.query) {
      return {
        success: false,
        error: "query is required",
      };
    }

    const sales = await salesDb.searchSales(input.query, input.filters);
    return {
      success: true,
      data: sales,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to search sales: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_product_sales_counts(): Promise<AIToolResult> {
  try {
    const counts = await salesDb.getProductSalesCounts();
    return {
      success: true,
      data: counts,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch product sales counts: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// PRODUCT TOOLS
// ============================================================================

export async function tool_get_all_products(): Promise<AIToolResult> {
  try {
    const products = await productsDb.getAllProducts();
    return {
      success: true,
      data: products,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch products: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_find_product_by_barcode(input: {
  barcode: string;
}): Promise<AIToolResult> {
  try {
    if (!input.barcode) {
      return {
        success: false,
        error: "barcode is required",
      };
    }

    const product = await productsDb.findProductByBarcode(input.barcode);
    if (!product) {
      return {
        success: false,
        error: `Product not found with barcode: ${input.barcode}`,
      };
    }

    return {
      success: true,
      data: product,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to find product by barcode: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_product_with_purchase_history(input: {
  productId: string;
}): Promise<AIToolResult> {
  try {
    if (!input.productId) {
      return {
        success: false,
        error: "productId is required",
      };
    }

    const product = await productsDb.getProductWithPurchaseHistory(input.productId);
    if (!product) {
      return {
        success: false,
        error: `Product not found: ${input.productId}`,
      };
    }

    return {
      success: true,
      data: product,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch product with purchase history: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_unused_products(input?: {
  periodMonths?: number;
}): Promise<AIToolResult> {
  try {
    const periodMonths = input?.periodMonths || 3;
    const products = await productsDb.getUnusedProducts(periodMonths);
    return {
      success: true,
      data: products,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch unused products: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// STOCK TOOLS (derived from products)
// ============================================================================

export async function tool_get_low_stock_products(input?: {
  threshold?: number;
}): Promise<AIToolResult> {
  try {
    const products = await productsDb.getAllProducts();
    const threshold = input?.threshold || 5;
    const lowStockProducts = products.filter((p) => p.quantity <= threshold);

    return {
      success: true,
      data: {
        threshold,
        count: lowStockProducts.length,
        products: lowStockProducts,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch low stock products: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_out_of_stock_products(): Promise<AIToolResult> {
  try {
    const products = await productsDb.getAllProducts();
    const outOfStock = products.filter((p) => p.quantity === 0);

    return {
      success: true,
      data: {
        count: outOfStock.length,
        products: outOfStock,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch out of stock products: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_total_inventory_value(): Promise<AIToolResult> {
  try {
    const products = await productsDb.getAllProducts();
    const totalValue = products.reduce(
      (sum, p) => sum + p.quantity * p.boughtPrice,
      0
    );

    return {
      success: true,
      data: {
        totalValue,
        productCount: products.length,
        products: products.map((p) => ({
          ...p,
          inventoryValue: p.quantity * p.boughtPrice,
        })),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to calculate inventory value: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// CLIENT TOOLS
// ============================================================================

export async function tool_get_all_clients(): Promise<AIToolResult> {
  try {
    const clients = await clientsDb.getAllClients();
    return {
      success: true,
      data: clients,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch clients: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_clients_with_totals(): Promise<AIToolResult> {
  try {
    const clients = await clientsDb.getAllClientsWithTotalPurchases();
    return {
      success: true,
      data: clients,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch clients with totals: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_find_client_by_name(input: {
  name: string;
}): Promise<AIToolResult> {
  try {
    if (!input.name) {
      return {
        success: false,
        error: "name is required",
      };
    }

    const client = await clientsDb.findClientByName(input.name);
    if (!client) {
      return {
        success: false,
        error: `Client not found: ${input.name}`,
      };
    }

    return {
      success: true,
      data: client,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to find client: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// PAYMENT TOOLS
// ============================================================================

export async function tool_get_all_payments(): Promise<AIToolResult> {
  try {
    const payments = await paymentsDb.getAllPaymentsWithClientInfo();
    return {
      success: true,
      data: payments,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch payments: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_payments_by_client(input: {
  clientId: string;
}): Promise<AIToolResult> {
  try {
    if (!input.clientId) {
      return {
        success: false,
        error: "clientId is required",
      };
    }

    const payments = await paymentsDb.getPaymentsByClientWithInfo(input.clientId);
    return {
      success: true,
      data: payments,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch payments by client: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_payments_by_date_range(input: {
  startDate: string | Date;
  endDate: string | Date;
}): Promise<AIToolResult> {
  try {
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return {
        success: false,
        error: "Invalid date format. Use ISO string (YYYY-MM-DD) or Date object.",
      };
    }

    const payments = await paymentsDb.getPaymentsByDateRange(startDate, endDate);
    return {
      success: true,
      data: payments,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch payments by date: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_overdue_payments(): Promise<AIToolResult> {
  try {
    const payments = await paymentsDb.getAllPaymentsWithClientInfo();
    const now = new Date();

    const overdue = payments.filter((p: any) => {
      if (p.paidDate) return false; // Already paid
      const dueDate = new Date(p.dueDate);
      return dueDate < now;
    });

    return {
      success: true,
      data: {
        count: overdue.length,
        payments: overdue,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch overdue payments: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_unpaid_payments(): Promise<AIToolResult> {
  try {
    const payments = await paymentsDb.getAllPaymentsWithClientInfo();
    const unpaid = payments.filter((p: any) => !p.paidDate);

    return {
      success: true,
      data: {
        count: unpaid.length,
        payments: unpaid,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch unpaid payments: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_payment_reasons(): Promise<AIToolResult> {
  try {
    const reasons = await paymentsDb.getPaymentReasonSuggestions();
    return {
      success: true,
      data: reasons,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch payment reasons: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// PURCHASE TOOLS
// ============================================================================

export async function tool_get_all_purchases(): Promise<AIToolResult> {
  try {
    const purchases = await purchasesDb.getAllPurchases();
    return {
      success: true,
      data: purchases,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch purchases: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_purchase_by_id(input: {
  purchaseId: string;
}): Promise<AIToolResult> {
  try {
    if (!input.purchaseId) {
      return {
        success: false,
        error: "purchaseId is required",
      };
    }

    const purchase = await purchasesDb.getPurchaseById(input.purchaseId);
    if (!purchase) {
      return {
        success: false,
        error: `Purchase not found: ${input.purchaseId}`,
      };
    }

    return {
      success: true,
      data: purchase,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch purchase: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_purchases_by_product(input: {
  productId: string;
}): Promise<AIToolResult> {
  try {
    if (!input.productId) {
      return {
        success: false,
        error: "productId is required",
      };
    }

    const purchases = await purchasesDb.getPurchasesByProduct(input.productId);
    return {
      success: true,
      data: purchases,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch purchases by product: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_purchases_by_seller(input: {
  sellerId: string;
}): Promise<AIToolResult> {
  try {
    if (!input.sellerId) {
      return {
        success: false,
        error: "sellerId is required",
      };
    }

    const purchases = await purchasesDb.getPurchasesBySeller(input.sellerId);
    return {
      success: true,
      data: purchases,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch purchases by seller: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_purchases_by_date_range(input: {
  startDate: string | Date;
  endDate: string | Date;
}): Promise<AIToolResult> {
  try {
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return {
        success: false,
        error: "Invalid date format. Use ISO string (YYYY-MM-DD) or Date object.",
      };
    }

    const purchases = await purchasesDb.getPurchasesByDateRange(
      startDate,
      endDate
    );
    return {
      success: true,
      data: purchases,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch purchases by date: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_purchase_items_by_purchase(input: {
  purchaseId: string;
}): Promise<AIToolResult> {
  try {
    if (!input.purchaseId) {
      return {
        success: false,
        error: "purchaseId is required",
      };
    }

    const items = await purchasesDb.getPurchaseItemsByPurchase(input.purchaseId);
    return {
      success: true,
      data: items,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch purchase items: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// SERVICE TOOLS
// ============================================================================

export async function tool_get_all_services(): Promise<AIToolResult> {
  try {
    const services = await servicesDb.getAllServices();
    return {
      success: true,
      data: services,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch services: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_search_services(input: {
  query: string;
}): Promise<AIToolResult> {
  try {
    if (!input.query) {
      return {
        success: false,
        error: "query is required",
      };
    }

    const services = await servicesDb.searchServices(input.query);
    return {
      success: true,
      data: services,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to search services: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_service_by_id(input: {
  serviceId: string;
}): Promise<AIToolResult> {
  try {
    if (!input.serviceId) {
      return {
        success: false,
        error: "serviceId is required",
      };
    }

    const service = await servicesDb.getServiceById(input.serviceId);
    if (!service) {
      return {
        success: false,
        error: `Service not found: ${input.serviceId}`,
      };
    }

    return {
      success: true,
      data: service,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch service: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// SERVICE APPOINTMENT TOOLS
// ============================================================================

export async function tool_get_all_service_appointments(): Promise<AIToolResult> {
  try {
    const appointments = await serviceAppointmentsDb.getAllServiceAppointments();
    return {
      success: true,
      data: appointments,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch service appointments: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_service_appointment_by_id(input: {
  appointmentId: string;
}): Promise<AIToolResult> {
  try {
    if (!input.appointmentId) {
      return {
        success: false,
        error: "appointmentId is required",
      };
    }

    const appointment =
      await serviceAppointmentsDb.getServiceAppointmentById(
        input.appointmentId
      );
    if (!appointment) {
      return {
        success: false,
        error: `Service appointment not found: ${input.appointmentId}`,
      };
    }

    return {
      success: true,
      data: appointment,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch service appointment: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_service_appointments_by_client(input: {
  clientId: string;
}): Promise<AIToolResult> {
  try {
    if (!input.clientId) {
      return {
        success: false,
        error: "clientId is required",
      };
    }

    const appointments =
      await serviceAppointmentsDb.getServiceAppointmentsByClient(
        input.clientId
      );
    return {
      success: true,
      data: appointments,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch appointments by client: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_upcoming_service_appointments(input?: {
  days?: number;
}): Promise<AIToolResult> {
  try {
    const days = input?.days || 7;
    const appointments =
      await serviceAppointmentsDb.getUpcomingServiceAppointments(days);
    return {
      success: true,
      data: {
        days,
        count: appointments.length,
        appointments,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch upcoming appointments: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_overdue_service_appointments(): Promise<AIToolResult> {
  try {
    const appointments =
      await serviceAppointmentsDb.getOverdueServiceAppointments();
    return {
      success: true,
      data: {
        count: appointments.length,
        appointments,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch overdue appointments: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_search_service_appointments(input: {
  query: string;
}): Promise<AIToolResult> {
  try {
    if (!input.query) {
      return {
        success: false,
        error: "query is required",
      };
    }

    const appointments =
      await serviceAppointmentsDb.searchServiceAppointments(input.query);
    return {
      success: true,
      data: appointments,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to search appointments: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_service_appointment_stats(): Promise<AIToolResult> {
  try {
    const stats = await serviceAppointmentsDb.getServiceAppointmentStats();
    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch appointment stats: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_service_types(): Promise<AIToolResult> {
  try {
    const types = await serviceAppointmentsDb.getServiceTypes();
    return {
      success: true,
      data: types,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch service types: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_service_names(): Promise<AIToolResult> {
  try {
    const names = await serviceAppointmentsDb.getServiceNames();
    return {
      success: true,
      data: names,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch service names: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_completed_services(): Promise<AIToolResult> {
  try {
    const services = await serviceAppointmentsDb.getCompletedServicesForCashier();
    return {
      success: true,
      data: services,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch completed services: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_service_history(): Promise<AIToolResult> {
  try {
    const history = await serviceAppointmentsDb.getServiceHistory();
    return {
      success: true,
      data: history,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch service history: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// BILL TOOLS
// ============================================================================

export async function tool_get_all_bills(): Promise<AIToolResult> {
  try {
    const bills = await billsDb.bills.getAll();
    return {
      success: true,
      data: bills,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch bills: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_bill_by_id(input: {
  billId: string;
}): Promise<AIToolResult> {
  try {
    if (!input.billId) {
      return {
        success: false,
        error: "billId is required",
      };
    }

    const bill = await billsDb.bills.getById(input.billId);
    if (!bill) {
      return {
        success: false,
        error: `Bill not found: ${input.billId}`,
      };
    }

    return {
      success: true,
      data: bill,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch bill: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// SELLER TOOLS
// ============================================================================

export async function tool_get_all_sellers(): Promise<AIToolResult> {
  try {
    const sellers = await sellersDb.getAllSellers();
    return {
      success: true,
      data: sellers,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch sellers: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_seller_by_id(input: {
  sellerId: string;
}): Promise<AIToolResult> {
  try {
    if (!input.sellerId) {
      return {
        success: false,
        error: "sellerId is required",
      };
    }

    const seller = await sellersDb.getSellerById(input.sellerId);
    if (!seller) {
      return {
        success: false,
        error: `Seller not found: ${input.sellerId}`,
      };
    }

    return {
      success: true,
      data: seller,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch seller: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// CATEGORY TOOLS
// ============================================================================

export async function tool_get_all_categories(): Promise<AIToolResult> {
  try {
    const categories = await categoriesDb.getAllCategories();
    return {
      success: true,
      data: categories,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch categories: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// MANUAL PRODUCT TOOLS
// ============================================================================

export async function tool_get_all_manual_products(): Promise<AIToolResult> {
  try {
    const products = await manualProductsDb.getAllManualProducts();
    return {
      success: true,
      data: products,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch manual products: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_search_manual_products(input: {
  query: string;
}): Promise<AIToolResult> {
  try {
    if (!input.query) {
      return {
        success: false,
        error: "query is required",
      };
    }

    const products = await manualProductsDb.searchManualProducts(input.query);
    return {
      success: true,
      data: products,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to search manual products: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_manual_product_by_id(input: {
  productId: string;
}): Promise<AIToolResult> {
  try {
    if (!input.productId) {
      return {
        success: false,
        error: "productId is required",
      };
    }

    const product = await manualProductsDb.getManualProductById(
      input.productId
    );
    if (!product) {
      return {
        success: false,
        error: `Manual product not found: ${input.productId}`,
      };
    }

    return {
      success: true,
      data: product,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch manual product: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// ACTIVITY LOG TOOLS
// ============================================================================

export async function tool_get_activity_logs(input?: {
  username?: string;
  dateFrom?: string | Date;
  dateTo?: string | Date;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<AIToolResult> {
  try {
    const filter: any = {};

    if (input?.username) {
      filter.username = input.username;
    }

    if (input?.dateFrom) {
      filter.dateFrom = new Date(input.dateFrom);
    }

    if (input?.dateTo) {
      filter.dateTo = new Date(input.dateTo);
    }

    if (input?.search) {
      filter.searchDetails = input.search;
    }

    if (input?.limit) {
      filter.limit = input.limit;
    }

    if (input?.offset) {
      filter.offset = input.offset;
    }

    const result = await activityLogsDb.getActivityLogs(filter);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch activity logs: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function tool_get_activity_log_usernames(): Promise<AIToolResult> {
  try {
    const usernames = await activityLogsDb.getActivityLogUsernames();
    return {
      success: true,
      data: usernames,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch usernames: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// TOOL REGISTRY
// ============================================================================

/**
 * All available AI tools with descriptions for the AI model.
 * Each tool is READ-ONLY and cannot modify the database.
 */
export const AI_TOOLS_REGISTRY = {
  // SALES
  get_all_sales: {
    name: "get_all_sales",
    description:
      "Retrieve all sales transactions with full details including items, clients, and amounts",
    fn: tool_get_all_sales,
    input_schema: {},
  },
  get_sales_by_date_range: {
    name: "get_sales_by_date_range",
    description:
      "Get sales within a specific date range (e.g., today, this week, last month)",
    fn: tool_get_sales_by_date_range,
    input_schema: {
      startDate: { type: "string | Date", description: "Start date (YYYY-MM-DD)" },
      endDate: { type: "string | Date", description: "End date (YYYY-MM-DD)" },
    },
  },
  get_sales_summary: {
    name: "get_sales_summary",
    description:
      "Get summary statistics for sales in a date range (total, count, average, profit)",
    fn: tool_get_sales_summary,
    input_schema: {
      startDate: { type: "string | Date", description: "Start date (YYYY-MM-DD)" },
      endDate: { type: "string | Date", description: "End date (YYYY-MM-DD)" },
    },
  },
  get_recent_sales: {
    name: "get_recent_sales",
    description: "Get recent sales from the last N days (default: 7 days)",
    fn: tool_get_recent_sales,
    input_schema: {
      limit: { type: "number", description: "Max results to return (default: 50)" },
      offset: { type: "number", description: "Pagination offset (default: 0)" },
      days: { type: "number", description: "Number of days to look back (default: 7)" },
    },
  },
  get_sales_by_client: {
    name: "get_sales_by_client",
    description: "Get all sales for a specific client",
    fn: tool_get_sales_by_client,
    input_schema: {
      clientId: { type: "string", description: "Client ID" },
    },
  },
  get_sale_by_id: {
    name: "get_sale_by_id",
    description: "Get details of a specific sale by ID",
    fn: tool_get_sale_by_id,
    input_schema: {
      saleId: { type: "string", description: "Sale ID" },
    },
  },
  search_sales: {
    name: "search_sales",
    description: "Search sales by query (e.g., product name, client name, amount)",
    fn: tool_search_sales,
    input_schema: {
      query: { type: "string", description: "Search query" },
      filters: { type: "any", description: "Optional filters" },
    },
  },
  get_product_sales_counts: {
    name: "get_product_sales_counts",
    description: "Get sales count for each product (best-sellers)",
    fn: tool_get_product_sales_counts,
    input_schema: {},
  },

  // PRODUCTS & STOCK
  get_all_products: {
    name: "get_all_products",
    description: "Get all products in inventory with quantities and prices",
    fn: tool_get_all_products,
    input_schema: {},
  },
  find_product_by_barcode: {
    name: "find_product_by_barcode",
    description: "Find a product by its barcode",
    fn: tool_find_product_by_barcode,
    input_schema: {
      barcode: { type: "string", description: "Product barcode" },
    },
  },
  get_product_with_purchase_history: {
    name: "get_product_with_purchase_history",
    description:
      "Get product details including purchase history and supplier information",
    fn: tool_get_product_with_purchase_history,
    input_schema: {
      productId: { type: "string", description: "Product ID" },
    },
  },
  get_unused_products: {
    name: "get_unused_products",
    description:
      "Get products that haven't been sold in a specified period (default: 3 months)",
    fn: tool_get_unused_products,
    input_schema: {
      periodMonths: { type: "number", description: "Period in months (default: 3)" },
    },
  },
  get_low_stock_products: {
    name: "get_low_stock_products",
    description: "Get products with stock below a threshold (default: 5 units)",
    fn: tool_get_low_stock_products,
    input_schema: {
      threshold: { type: "number", description: "Stock threshold (default: 5)" },
    },
  },
  get_out_of_stock_products: {
    name: "get_out_of_stock_products",
    description: "Get all products with zero quantity in stock",
    fn: tool_get_out_of_stock_products,
    input_schema: {},
  },
  get_total_inventory_value: {
    name: "get_total_inventory_value",
    description: "Calculate total value of inventory at cost price",
    fn: tool_get_total_inventory_value,
    input_schema: {},
  },

  // CLIENTS
  get_all_clients: {
    name: "get_all_clients",
    description: "Get all clients in the system",
    fn: tool_get_all_clients,
    input_schema: {},
  },
  get_clients_with_totals: {
    name: "get_clients_with_totals",
    description:
      "Get all clients with their total purchases, credits, and versements owed",
    fn: tool_get_clients_with_totals,
    input_schema: {},
  },
  find_client_by_name: {
    name: "find_client_by_name",
    description: "Find a client by name",
    fn: tool_find_client_by_name,
    input_schema: {
      name: { type: "string", description: "Client name" },
    },
  },

  // PAYMENTS
  get_all_payments: {
    name: "get_all_payments",
    description: "Get all payments including client information",
    fn: tool_get_all_payments,
    input_schema: {},
  },
  get_payments_by_client: {
    name: "get_payments_by_client",
    description: "Get all payments for a specific client",
    fn: tool_get_payments_by_client,
    input_schema: {
      clientId: { type: "string", description: "Client ID" },
    },
  },
  get_payments_by_date_range: {
    name: "get_payments_by_date_range",
    description: "Get payments within a date range",
    fn: tool_get_payments_by_date_range,
    input_schema: {
      startDate: { type: "string | Date", description: "Start date (YYYY-MM-DD)" },
      endDate: { type: "string | Date", description: "End date (YYYY-MM-DD)" },
    },
  },
  get_overdue_payments: {
    name: "get_overdue_payments",
    description: "Get payments that are overdue (past due date and not yet paid)",
    fn: tool_get_overdue_payments,
    input_schema: {},
  },
  get_unpaid_payments: {
    name: "get_unpaid_payments",
    description: "Get all unpaid payments (CREDIT and VERSEMENT)",
    fn: tool_get_unpaid_payments,
    input_schema: {},
  },
  get_payment_reasons: {
    name: "get_payment_reasons",
    description: "Get suggested payment reasons/descriptions",
    fn: tool_get_payment_reasons,
    input_schema: {},
  },

  // PURCHASES
  get_all_purchases: {
    name: "get_all_purchases",
    description: "Get all purchases from suppliers with items and details",
    fn: tool_get_all_purchases,
    input_schema: {},
  },
  get_purchase_by_id: {
    name: "get_purchase_by_id",
    description: "Get details of a specific purchase",
    fn: tool_get_purchase_by_id,
    input_schema: {
      purchaseId: { type: "string", description: "Purchase ID" },
    },
  },
  get_purchases_by_product: {
    name: "get_purchases_by_product",
    description:
      "Get all purchases containing a specific product (supplier history)",
    fn: tool_get_purchases_by_product,
    input_schema: {
      productId: { type: "string", description: "Product ID" },
    },
  },
  get_purchases_by_seller: {
    name: "get_purchases_by_seller",
    description: "Get all purchases from a specific supplier/seller",
    fn: tool_get_purchases_by_seller,
    input_schema: {
      sellerId: { type: "string", description: "Seller ID" },
    },
  },
  get_purchases_by_date_range: {
    name: "get_purchases_by_date_range",
    description: "Get purchases within a date range",
    fn: tool_get_purchases_by_date_range,
    input_schema: {
      startDate: { type: "string | Date", description: "Start date (YYYY-MM-DD)" },
      endDate: { type: "string | Date", description: "End date (YYYY-MM-DD)" },
    },
  },
  get_purchase_items_by_purchase: {
    name: "get_purchase_items_by_purchase",
    description: "Get all items in a specific purchase order",
    fn: tool_get_purchase_items_by_purchase,
    input_schema: {
      purchaseId: { type: "string", description: "Purchase ID" },
    },
  },

  // SERVICES
  get_all_services: {
    name: "get_all_services",
    description: "Get all available service templates",
    fn: tool_get_all_services,
    input_schema: {},
  },
  search_services: {
    name: "search_services",
    description: "Search services by name or description",
    fn: tool_search_services,
    input_schema: {
      query: { type: "string", description: "Search query" },
    },
  },
  get_service_by_id: {
    name: "get_service_by_id",
    description: "Get details of a specific service",
    fn: tool_get_service_by_id,
    input_schema: {
      serviceId: { type: "string", description: "Service ID" },
    },
  },

  // SERVICE APPOINTMENTS
  get_all_service_appointments: {
    name: "get_all_service_appointments",
    description:
      "Get all service appointments/bookings with their status and client info",
    fn: tool_get_all_service_appointments,
    input_schema: {},
  },
  get_service_appointment_by_id: {
    name: "get_service_appointment_by_id",
    description: "Get details of a specific service appointment",
    fn: tool_get_service_appointment_by_id,
    input_schema: {
      appointmentId: { type: "string", description: "Appointment ID" },
    },
  },
  get_service_appointments_by_client: {
    name: "get_service_appointments_by_client",
    description: "Get all service appointments for a specific client",
    fn: tool_get_service_appointments_by_client,
    input_schema: {
      clientId: { type: "string", description: "Client ID" },
    },
  },
  get_upcoming_service_appointments: {
    name: "get_upcoming_service_appointments",
    description:
      "Get upcoming service appointments within N days (default: 7 days)",
    fn: tool_get_upcoming_service_appointments,
    input_schema: {
      days: { type: "number", description: "Number of days ahead (default: 7)" },
    },
  },
  get_overdue_service_appointments: {
    name: "get_overdue_service_appointments",
    description: "Get service appointments that are overdue",
    fn: tool_get_overdue_service_appointments,
    input_schema: {},
  },
  search_service_appointments: {
    name: "search_service_appointments",
    description: "Search service appointments by query",
    fn: tool_search_service_appointments,
    input_schema: {
      query: { type: "string", description: "Search query" },
    },
  },
  get_service_appointment_stats: {
    name: "get_service_appointment_stats",
    description: "Get statistics about service appointments",
    fn: tool_get_service_appointment_stats,
    input_schema: {},
  },
  get_service_types: {
    name: "get_service_types",
    description: "Get list of all service types",
    fn: tool_get_service_types,
    input_schema: {},
  },
  get_service_names: {
    name: "get_service_names",
    description: "Get list of all service names",
    fn: tool_get_service_names,
    input_schema: {},
  },
  get_completed_services: {
    name: "get_completed_services",
    description: "Get all completed services",
    fn: tool_get_completed_services,
    input_schema: {},
  },
  get_service_history: {
    name: "get_service_history",
    description: "Get service history/audit trail",
    fn: tool_get_service_history,
    input_schema: {},
  },

  // BILLS
  get_all_bills: {
    name: "get_all_bills",
    description:
      "Get all bills/recurring expenses with payment history and status",
    fn: tool_get_all_bills,
    input_schema: {},
  },
  get_bill_by_id: {
    name: "get_bill_by_id",
    description: "Get details of a specific bill",
    fn: tool_get_bill_by_id,
    input_schema: {
      billId: { type: "string", description: "Bill ID" },
    },
  },

  // SELLERS
  get_all_sellers: {
    name: "get_all_sellers",
    description: "Get all suppliers/sellers with contact information",
    fn: tool_get_all_sellers,
    input_schema: {},
  },
  get_seller_by_id: {
    name: "get_seller_by_id",
    description: "Get details of a specific seller/supplier",
    fn: tool_get_seller_by_id,
    input_schema: {
      sellerId: { type: "string", description: "Seller ID" },
    },
  },

  // CATEGORIES
  get_all_categories: {
    name: "get_all_categories",
    description: "Get all product categories",
    fn: tool_get_all_categories,
    input_schema: {},
  },

  // MANUAL PRODUCTS
  get_all_manual_products: {
    name: "get_all_manual_products",
    description: "Get all manual/custom products",
    fn: tool_get_all_manual_products,
    input_schema: {},
  },
  search_manual_products: {
    name: "search_manual_products",
    description: "Search manual products by name or type",
    fn: tool_search_manual_products,
    input_schema: {
      query: { type: "string", description: "Search query" },
    },
  },
  get_manual_product_by_id: {
    name: "get_manual_product_by_id",
    description: "Get details of a specific manual product",
    fn: tool_get_manual_product_by_id,
    input_schema: {
      productId: { type: "string", description: "Product ID" },
    },
  },

  // ACTIVITY LOGS
  get_activity_logs: {
    name: "get_activity_logs",
    description:
      "Get activity logs with optional filtering by user, date, or search term",
    fn: tool_get_activity_logs,
    input_schema: {
      username: { type: "string", description: "Filter by username" },
      dateFrom: { type: "string | Date", description: "Filter from date (YYYY-MM-DD)" },
      dateTo: { type: "string | Date", description: "Filter to date (YYYY-MM-DD)" },
      search: { type: "string", description: "Search in details and username" },
      limit: { type: "number", description: "Max results to return" },
      offset: { type: "number", description: "Pagination offset" },
    },
  },
  get_activity_log_usernames: {
    name: "get_activity_log_usernames",
    description: "Get list of all usernames who have activity logs",
    fn: tool_get_activity_log_usernames,
    input_schema: {},
  },
};

/**
 * Get a tool by name
 */
export function getToolByName(
  toolName: string
): (typeof AI_TOOLS_REGISTRY)[keyof typeof AI_TOOLS_REGISTRY] | undefined {
  return (AI_TOOLS_REGISTRY as any)[toolName];
}

/**
 * Get all tool names for the AI model
 */
export function getAllToolNames(): string[] {
  return Object.keys(AI_TOOLS_REGISTRY);
}
