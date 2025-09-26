import { User, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma, prismaPromise } from "./prismaClient";

export interface CreateUserData {
  username: string;
  email?: string;
  password: string;
  role?: UserRole;
  permissions?: {
    canAccessCashier: boolean;
    canAccessStock: boolean;
    canAccessClients: boolean;
    canAccessBills: boolean;
    canAccessHistory: boolean;
    canAccessDashboard: boolean;
    canManageUsers: boolean;
    canViewLogs: boolean;
    canManageSettings: boolean;
  };
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: Omit<User, "password"> & { permissions?: any };
  error?: string;
}

export const users = {
  async create(data: CreateUserData): Promise<User> {
    await prismaPromise; // Ensure Prisma is ready
    const hashedPassword = await bcrypt.hash(data.password, 10);

    return prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: hashedPassword,
        role: data.role || "USER",
        permissions: data.permissions ? {
          create: {
            canAccessCashier: data.permissions.canAccessCashier,
            canAccessStock: data.permissions.canAccessStock,
            canAccessClients: data.permissions.canAccessClients,
            canAccessBills: data.permissions.canAccessBills,
            canAccessHistory: data.permissions.canAccessHistory,
            canAccessDashboard: data.permissions.canAccessDashboard,
            canManageUsers: data.permissions.canManageUsers,
            canViewLogs: data.permissions.canViewLogs,
            canManageSettings: data.permissions.canManageSettings,
          }
        } : undefined,
      },
      include: {
        permissions: true,
      },
    });
  },

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      console.log("🔍 Login attempt:", credentials.username);
      
      // Ensure Prisma client is ready before proceeding
      console.log("🔍 Waiting for Prisma client to initialize...");
      await prismaPromise;
      console.log("🔍 Prisma client ready!");
      
      // First check if admin user exists in database
      if (credentials.username === "admin") {
        console.log("🔍 Checking for admin user...");
        const adminUser = await prisma.user.findUnique({
          where: { username: "admin" },
          include: {
            permissions: true,
          },
        });
        console.log("🔍 Admin user found:", !!adminUser);

        if (adminUser && adminUser.isActive) {
          // Admin user exists in database, check password
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            adminUser.password,
          );

          if (isPasswordValid) {
            const { password, ...userWithoutPassword } = adminUser;
            return {
              success: true,
              user: {
                ...userWithoutPassword,
                id: "hardcoded-admin", // Keep the same ID for consistency
              },
            };
          }
        } else {
          console.log("🔍 Admin user not found, checking hardcoded credentials...");
          // Admin user doesn't exist in database, check hardcoded credentials
          if (credentials.password === "admin") {
            console.log("🔍 Hardcoded admin credentials match!");
            return {
              success: true,
              user: {
                id: "hardcoded-admin",
                username: "admin",
                email: "admin@store.com",
                role: "ADMIN" as UserRole,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                permissions: {
                  canAccessCashier: true,
                  canAccessStock: true,
                  canAccessClients: true,
                  canAccessBills: true,
                  canAccessHistory: true,
                  canAccessDashboard: true,
                  canManageUsers: true,
                  canViewLogs: true,
                  canManageSettings: true,
                },
              },
            };
          }
        }
      }

      // Check other users
      console.log("🔍 Checking other users...");
      const user = await prisma.user.findUnique({
        where: { username: credentials.username },
        include: {
          permissions: true,
        },
      });
      console.log("🔍 User found:", !!user);

      if (!user || !user.isActive) {
        return {
          success: false,
          error: "Invalid username or password",
        };
      }

      const isPasswordValid = await bcrypt.compare(
        credentials.password,
        user.password,
      );

      if (!isPasswordValid) {
        return {
          success: false,
          error: "Invalid username or password",
        };
      }

      const { password, ...userWithoutPassword } = user;
      return {
        success: true,
        user: userWithoutPassword,
      };
    } catch (error) {
      console.error("🚨 Login error:", error);
      console.error("🚨 Error details:", error.message);
      console.error("🚨 Error stack:", error.stack);
      return {
        success: false,
        error: "Authentication failed: " + error.message,
      };
    }
  },

  async getById(id: string): Promise<(Omit<User, "password"> & { permissions?: any }) | null> {
    await prismaPromise; // Ensure Prisma is ready
    // Handle hardcoded admin account
    if (id === "hardcoded-admin") {
      return {
        id: "hardcoded-admin",
        username: "admin",
        email: "admin@store.com",
        role: "ADMIN" as UserRole,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        permissions: {
          canAccessCashier: true,
          canAccessStock: true,
          canAccessClients: true,
          canAccessBills: true,
          canAccessHistory: true,
          canAccessDashboard: true,
          canManageUsers: true,
          canViewLogs: true,
          canManageSettings: true,
        },
      };
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        permissions: true,
      },
    });

    if (!user) return null;

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  async getByUsername(
    username: string,
  ): Promise<(Omit<User, "password"> & { permissions?: any }) | null> {
    // Check database first for admin user
    if (username === "admin") {
      const adminUser = await prisma.user.findUnique({
        where: { username: "admin" },
        include: {
          permissions: true,
        },
      });

      if (adminUser) {
        const { password, ...userWithoutPassword } = adminUser;
        return {
          ...userWithoutPassword,
          id: "hardcoded-admin", // Keep consistent ID for frontend
        };
      }
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        permissions: true,
      },
    });

    if (!user) return null;

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  async updateRole(id: string, role: UserRole): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { role },
    });
  },

  async deactivate(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  },

  async activate(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { isActive: true },
    });
  },

  async getAll(): Promise<(Omit<User, "password"> & { permissions?: any })[]> {
    await prismaPromise; // Ensure Prisma is ready
    const users = await prisma.user.findMany({
      include: {
        permissions: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return users.map(({ password, ...user }) => user);
  },

  async delete(id: string): Promise<void> {
    await prismaPromise; // Ensure Prisma is ready
    await prisma.user.delete({
      where: { id },
    });
  },

  async updatePassword(id: string, newPassword: string): Promise<User> {
    await prismaPromise; // Ensure Prisma is ready
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  },

  async updatePermissions(id: string, permissions: {
    canAccessCashier: boolean;
    canAccessStock: boolean;
    canAccessClients: boolean;
    canAccessBills: boolean;
    canAccessHistory: boolean;
    canAccessDashboard: boolean;
    canManageUsers: boolean;
    canViewLogs: boolean;
    canManageSettings: boolean;
  }): Promise<User> {
    await prismaPromise; // Ensure Prisma is ready
    // First check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }

    // Filter out metadata fields and only keep the actual permission fields
    const permissionFields = {
      canAccessCashier: permissions.canAccessCashier,
      canAccessStock: permissions.canAccessStock,
      canAccessClients: permissions.canAccessClients,
      canAccessBills: permissions.canAccessBills,
      canAccessHistory: permissions.canAccessHistory,
      canAccessDashboard: permissions.canAccessDashboard,
      canManageUsers: permissions.canManageUsers,
      canViewLogs: permissions.canViewLogs,
      canManageSettings: permissions.canManageSettings,
    };

    // Update or create permissions
    return prisma.user.update({
      where: { id },
      data: {
        permissions: {
          upsert: {
            create: permissionFields,
            update: permissionFields,
          },
        },
      },
      include: {
        permissions: true,
      },
    });
  },

  async getAllWithPermissions(): Promise<(Omit<User, "password"> & { permissions: any })[]> {
    const users = await prisma.user.findMany({
      include: {
        permissions: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return users.map(({ password, ...user }) => user);
  },
};
