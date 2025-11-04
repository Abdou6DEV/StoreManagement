import { prisma } from "./prismaClient";

export async function createService(data: {
  name: string;
  description?: string;
  costPrice?: number;
  serviceAppointmentId?: string;
}) {
  // For ServiceAppointments, make the name unique by appending the appointment ID
  // This prevents conflicts when multiple appointments have the same name
  const uniqueName = data.serviceAppointmentId 
    ? `${data.name} (${data.serviceAppointmentId.slice(-8)})` 
    : data.name;

  return await prisma.service.create({
    data: {
      name: uniqueName,
      description: data.description,
      costPrice: data.costPrice || 0,
      serviceAppointmentId: data.serviceAppointmentId,
    },
  });
}

export async function findOrCreateService(data: {
  name: string;
  description?: string;
  costPrice?: number;
  serviceAppointmentId?: string;
}) {
  // If we have a serviceAppointmentId, try to find existing service with that ID first
  if (data.serviceAppointmentId) {
    const existingByAppointmentId = await prisma.service.findFirst({
      where: {
        serviceAppointmentId: data.serviceAppointmentId,
      },
    });

    if (existingByAppointmentId) {
      return existingByAppointmentId;
    }
  }

  // For ServiceAppointments, always create a new Service record to ensure proper tracking
  // This prevents conflicts when multiple appointments have the same name
  if (data.serviceAppointmentId) {
    return await createService({
      name: data.name,
      description: data.description,
      costPrice: data.costPrice || 0,
      serviceAppointmentId: data.serviceAppointmentId,
    });
  }

  // For regular services (not from appointments), try to find existing service by name
  const existing = await prisma.service.findUnique({
    where: {
      name: data.name,
    },
  });

  if (existing) {
    // Update costPrice if provided (to remember the latest cost price used)
    if (data.costPrice !== undefined && data.costPrice > 0) {
      return await prisma.service.update({
        where: { id: existing.id },
        data: { costPrice: data.costPrice },
      });
    }
    return existing;
  }

  // Create new service if not found
  return await createService({
    name: data.name,
    description: data.description,
    costPrice: data.costPrice || 0,
    serviceAppointmentId: data.serviceAppointmentId,
  });
}

export async function searchServices(query: string) {
  if (!query.trim()) {
    return [];
  }

  return await prisma.service.findMany({
    where: {
      OR: [
        {
          name: {
            contains: query,
          },
        },
        {
          description: {
            contains: query,
          },
        },
      ],
    },
    orderBy: { name: "asc" },
    take: 10,
  });
}

export async function getAllServices() {
  return await prisma.service.findMany({
    where: {
      serviceAppointmentId: null, // Only return service templates, not services from appointments
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getServiceById(id: string) {
  return await prisma.service.findUnique({
    where: { id },
  });
}

export async function updateService(
  id: string,
  data: {
    name?: string;
    description?: string;
    costPrice?: number;
  },
) {
  return await prisma.service.update({
    where: { id },
    data,
  });
}

export async function deleteService(id: string) {
  // First check if there are any sales using this service
  const salesCount = await prisma.saleItem.count({
    where: { serviceId: id },
  });

  if (salesCount > 0) {
    throw new Error(
      `Cannot delete service: It has been used in ${salesCount} sale(s). ` +
      `Please delete the related sales first or contact an administrator.`
    );
  }

  return await prisma.service.delete({
    where: { id },
  });
}

export async function getServicesByClient(clientId: string) {
  try {
    console.log("getServicesByClient called with clientId:", clientId);
    
    // Get service appointments directly (they contain all service info)
    const serviceAppointments = await prisma.serviceAppointment.findMany({
      where: {
        clientId: clientId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log("Found service appointments for client:", serviceAppointments.length);

    // Map appointments to service format
    const services = serviceAppointments.map(appointment => ({
      id: appointment.id,
      name: appointment.name,
      description: appointment.description,
      costPrice: appointment.costPrice,
      servicePrice: appointment.servicePrice,
      serviceType: appointment.serviceType,
      isCompleted: appointment.isCompleted,
      completedAt: appointment.completedAt,
      dueDate: appointment.dueDate,
      notes: appointment.notes,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
      status: appointment.isCompleted ? "COMPLETED" : "PENDING",
    }));

    console.log("Mapped services for client:", services.length);
    return services;
  } catch (error) {
    console.error("Error in getServicesByClient:", error);
    throw error;
  }
}