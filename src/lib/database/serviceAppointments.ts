import { prisma } from "./prismaClient";
import { getOption, setOption } from "./options";

// Maximum value for INT column in SQLite (2^31 - 1)
const MAX_PRICE = 2147483647;

// Payment status management using Option table
const SERVICE_PAYMENT_STATUS_KEY = "servicePaymentStatus";

async function getServicePaymentStatuses(): Promise<Record<string, boolean>> {
  try {
    const statusJson = await getOption(SERVICE_PAYMENT_STATUS_KEY);
    if (!statusJson) return {};
    return JSON.parse(statusJson);
  } catch (error) {
    console.error("Failed to get service payment statuses:", error);
    return {};
  }
}

async function setServicePaymentStatus(serviceId: string, isPaid: boolean): Promise<void> {
  try {
    const statuses = await getServicePaymentStatuses();
    statuses[serviceId] = isPaid;
    await setOption(SERVICE_PAYMENT_STATUS_KEY, JSON.stringify(statuses));
  } catch (error) {
    console.error("Failed to set service payment status:", error);
    throw error;
  }
}

export async function getServicePaymentStatus(serviceId: string): Promise<boolean> {
  const statuses = await getServicePaymentStatuses();
  return statuses[serviceId] || false;
}

export async function updateServicePaymentStatus(serviceId: string, isPaid: boolean): Promise<void> {
  await setServicePaymentStatus(serviceId, isPaid);
}

export async function createServiceAppointment(data: {
  name: string;
  serviceType: string;
  description?: string;
  costPrice?: number;
  servicePrice: number;
  clientId?: string;
  dueDate: Date;
  notes?: string;
}) {
  // Basic validation
  if (data.costPrice && data.costPrice < 0) {
    throw new Error("Cost price cannot be negative");
  }
  if (data.servicePrice < 0) {
    throw new Error("Service price cannot be negative");
  }
  if (data.costPrice && data.costPrice > MAX_PRICE) {
    throw new Error(`Cost price cannot exceed ${MAX_PRICE.toLocaleString()}`);
  }
  if (data.servicePrice > MAX_PRICE) {
    throw new Error(`Service price cannot exceed ${MAX_PRICE.toLocaleString()}`);
  }


  return await prisma.serviceAppointment.create({
    data: {
      name: data.name,
      serviceType: data.serviceType,
      description: data.description,
      costPrice: data.costPrice || 0,
      servicePrice: data.servicePrice,
      clientId: data.clientId,
      dueDate: data.dueDate,
      notes: data.notes,
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
    },
  });
}

export async function getAllServiceAppointments() {
  return await prisma.serviceAppointment.findMany({
    include: {
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getServiceAppointmentById(id: string) {
  return await prisma.serviceAppointment.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
          address: true,
        },
      },
    },
  });
}

export async function getServiceAppointmentsByClient(clientId: string) {
  return await prisma.serviceAppointment.findMany({
    where: { clientId },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
    },
    orderBy: {
      dueDate: "asc",
    },
  });
}

export async function getUpcomingServiceAppointments(days = 7) {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  return await prisma.serviceAppointment.findMany({
    where: {
      dueDate: {
        gte: startDate,
        lte: endDate,
      },
      isCompleted: false,
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
    },
    orderBy: {
      dueDate: "asc",
    },
  });
}

export async function getOverdueServiceAppointments() {
  const now = new Date();

  return await prisma.serviceAppointment.findMany({
    where: {
      dueDate: {
        lt: now,
      },
      isCompleted: false,
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
    },
    orderBy: {
      dueDate: "asc",
    },
  });
}

export async function searchServiceAppointments(query: string) {
  if (!query.trim()) {
    return [];
  }

  return await prisma.serviceAppointment.findMany({
    where: {
      OR: [
        {
          name: {
            contains: query,
          },
        },
        {
          serviceType: {
            contains: query,
          },
        },
        {
          description: {
            contains: query,
          },
        },
        {
          client: {
            name: {
              contains: query,
            },
          },
        },
      ],
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
    },
    orderBy: {
      dueDate: "asc",
    },
    take: 50,
  });
}

export async function updateServiceAppointment(
  id: string,
  data: {
    name?: string;
    serviceType?: string;
    description?: string;
    costPrice?: number;
    servicePrice?: number;
    clientId?: string;
    dueDate?: Date;
    notes?: string;
  }
) {
  // Basic validation
  if (data.costPrice !== undefined && data.costPrice < 0) {
    throw new Error("Cost price cannot be negative");
  }
  if (data.servicePrice !== undefined && data.servicePrice < 0) {
    throw new Error("Service price cannot be negative");
  }
  if (data.costPrice !== undefined && data.costPrice > MAX_PRICE) {
    throw new Error(`Cost price cannot exceed ${MAX_PRICE.toLocaleString()}`);
  }
  if (data.servicePrice !== undefined && data.servicePrice > MAX_PRICE) {
    throw new Error(`Service price cannot exceed ${MAX_PRICE.toLocaleString()}`);
  }


  return await prisma.serviceAppointment.update({
    where: { id },
    data,
    include: {
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
    },
  });
}

export async function markServiceAppointmentCompleted(id: string) {
  return await prisma.serviceAppointment.update({
    where: { id },
    data: {
      isCompleted: true,
      completedAt: new Date(),
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
    },
  });
}

export async function markServiceAppointmentIncomplete(id: string) {
  return await prisma.serviceAppointment.update({
    where: { id },
    data: {
      isCompleted: false,
      completedAt: null,
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
    },
  });
}

export async function deleteServiceAppointment(id: string) {
  return await prisma.serviceAppointment.delete({
    where: { id },
  });
}

export async function getServiceAppointmentStats() {
  const total = await prisma.serviceAppointment.count();
  const completed = await prisma.serviceAppointment.count({
    where: { isCompleted: true },
  });
  const pending = await prisma.serviceAppointment.count({
    where: { isCompleted: false },
  });
  
  const now = new Date();
  const overdue = await prisma.serviceAppointment.count({
    where: {
      dueDate: {
        lt: now,
      },
      isCompleted: false,
    },
  });

  return {
    total,
    completed,
    pending,
    overdue,
  };
}

export async function getServiceTypes(): Promise<string[]> {
  const serviceAppointments = await prisma.serviceAppointment.findMany({
    select: { serviceType: true },
    distinct: ['serviceType'],
  });
  return serviceAppointments.map(appointment => appointment.serviceType).sort();
}

export async function getServiceNames(): Promise<string[]> {
  const serviceAppointments = await prisma.serviceAppointment.findMany({
    select: { name: true },
    distinct: ['name'],
  });
  return serviceAppointments.map(appointment => appointment.name).sort();
}

export async function getCompletedServicesForCashier() {
  // First, get all service appointment IDs that are in pending VERSEMENT payments
  const pendingVersements = await prisma.payment.findMany({
    where: {
      type: "VERSEMENT",
      saleId: null, // Only pending versements (not yet paid)
      pendingSaleItems: { not: null },
    },
    select: {
      pendingSaleItems: true,
    },
  });

  // Extract serviceAppointmentId values from pending versements
  const serviceIdsInVersements = new Set<string>();
  for (const versement of pendingVersements) {
    if (versement.pendingSaleItems) {
      try {
        const items = JSON.parse(versement.pendingSaleItems);
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item.serviceAppointmentId) {
              serviceIdsInVersements.add(item.serviceAppointmentId);
            }
          }
        }
      } catch (error) {
        console.error("Error parsing pendingSaleItems:", error);
      }
    }
  }

  // Optimized query: Use a single raw SQL query with subquery to filter out sold services
  // This is much faster than loading all completed services and filtering in JavaScript
  // Exclude services with servicePrice = 0 (free services should not be passed to cashier)
  const availableServices = await prisma.$queryRaw<any[]>`
    SELECT 
      sa.id,
      sa.name,
      sa.serviceType,
      sa.description,
      sa.costPrice,
      sa.servicePrice,
      sa.clientId,
      sa.dueDate,
      sa.notes,
      sa.isCompleted,
      sa.completedAt,
      sa.createdAt,
      sa.updatedAt,
      c.id as client_id,
      c.name as client_name,
      c.phone as client_phone
    FROM ServiceAppointment sa
    LEFT JOIN Client c ON sa.clientId = c.id
    WHERE sa.isCompleted = 1
    AND sa.servicePrice > 0
    AND sa.id NOT IN (
      SELECT DISTINCT s.serviceAppointmentId
      FROM Service s
      INNER JOIN SaleItem si ON si.serviceId = s.id
      WHERE s.serviceAppointmentId IS NOT NULL
    )
    ORDER BY sa.completedAt DESC
  `;

  // Filter out services that are in pending VERSEMENT payments
  const filteredServices = availableServices.filter(
    (service: any) => !serviceIdsInVersements.has(service.id)
  );

  // Transform the flat result into the expected structure with nested client
  return filteredServices.map(service => ({
    id: service.id,
    name: service.name,
    serviceType: service.serviceType,
    description: service.description,
    costPrice: service.costPrice,
    servicePrice: service.servicePrice,
    clientId: service.clientId,
    dueDate: new Date(service.dueDate),
    notes: service.notes,
    isCompleted: Boolean(service.isCompleted),
    completedAt: service.completedAt ? new Date(service.completedAt) : null,
    createdAt: new Date(service.createdAt),
    updatedAt: new Date(service.updatedAt),
    client: service.client_id ? {
      id: service.client_id,
      name: service.client_name,
      phone: service.client_phone
    } : null
  }));
}

export async function getServiceHistory() {
  // Get all completed service appointments that haven't been sold
  return await getCompletedServicesForCashier();
}

export async function isServiceAppointmentSold(serviceAppointmentId: string): Promise<boolean> {
  // Check if a service appointment has been sold by checking if there's a Service
  // with this serviceAppointmentId that's linked to a SaleItem
  const soldService = await prisma.service.findFirst({
    where: {
      serviceAppointmentId: serviceAppointmentId,
    },
    include: {
      saleItems: {
        take: 1, // We only need to know if at least one exists
      },
    },
  });

  return soldService !== null && soldService.saleItems.length > 0;
}

export async function getSaleIdFromServiceAppointment(serviceAppointmentId: string): Promise<string | null> {
  // Get the sale ID for a sold service appointment
  const soldService = await prisma.service.findFirst({
    where: {
      serviceAppointmentId: serviceAppointmentId,
    },
    include: {
      saleItems: {
        take: 1,
        include: {
          sale: true,
        },
      },
    },
  });

  if (soldService && soldService.saleItems.length > 0) {
    return soldService.saleItems[0].saleId;
  }

  return null;
}

// Alias methods for compatibility with the services table
export const markCompleted = markServiceAppointmentCompleted;
export const markIncomplete = markServiceAppointmentIncomplete;
export const getSaleId = getSaleIdFromServiceAppointment;


