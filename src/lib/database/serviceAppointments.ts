import { prisma } from "./prismaClient";

// Maximum value for INT column in SQLite (2^31 - 1)
const MAX_PRICE = 2147483647;

export async function createServiceAppointment(data: {
  name: string;
  serviceType: string;
  description?: string;
  costPrice?: number;
  servicePrice: number;
  clientId: string;
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

// Alias methods for compatibility with the services table
export const markCompleted = markServiceAppointmentCompleted;
export const markIncomplete = markServiceAppointmentIncomplete;


