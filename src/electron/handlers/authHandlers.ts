import { ipcMain } from "electron";
import { PrismaClient } from "@prisma/client";
import {
  users,
  CreateUserData,
  LoginCredentials,
} from "../../lib/database/users";

const prisma = new PrismaClient();

export const setupAuthHandlers = () => {
  // Login handler
  ipcMain.handle("auth:login", async (_, credentials: LoginCredentials) => {
    try {
      const result = await users.login(credentials);
      return result;
    } catch (error) {
      return {
        success: false,
        error: "Authentication failed",
      };
    }
  });

  // Create user handler (admin only)
  ipcMain.handle("auth:createUser", async (_, userData: CreateUserData) => {
    try {
      const user = await users.create(userData);
      const { password, ...userWithoutPassword } = user;
      return {
        success: true,
        user: userWithoutPassword,
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to create user",
      };
    }
  });

  // Get user by ID handler
  ipcMain.handle("auth:getUserById", async (_, userId: string) => {
    try {
      const user = await users.getById(userId);
      return {
        success: true,
        user,
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to get user",
      };
    }
  });

  // Get user by username handler
  ipcMain.handle("auth:getUserByUsername", async (_, username: string) => {
    try {
      const user = await users.getByUsername(username);
      return {
        success: true,
        user,
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to get user",
      };
    }
  });

  // Update user password handler
  ipcMain.handle("auth:updatePassword", async (_, userId: string, newPassword: string) => {
    try {
      // Check if it's the hardcoded admin user - create admin user in database if it doesn't exist
      if (userId === "hardcoded-admin") {
        // Check if admin user exists in database by querying directly
        const adminUser = await prisma.user.findUnique({
          where: { username: "admin" },
          include: { permissions: true }
        });
        
        if (!adminUser) {
          // Create admin user in database with new password (not default)
          await users.create({
            username: "admin",
            email: "admin@store.com",
            password: newPassword, // Use the new password directly
            role: "ADMIN",
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
          });
          return { success: true };
        } else {
          // Admin user exists, update password using REAL database ID
          await users.updatePassword(adminUser.id, newPassword);
          return { success: true };
        }
      }
      
      await users.updatePassword(userId, newPassword);
      return { success: true };
    } catch (error) {
      console.error("Error updating password:", error);
      return {
        success: false,
        error: "Failed to update password: " + (error as Error).message,
      };
    }
  });

  // Update user permissions handler (admin only)
  ipcMain.handle("auth:updatePermissions", async (_, userId: string, permissions: any) => {
    try {
      // Check if it's the hardcoded admin user
      if (userId === "hardcoded-admin") {
        // For hardcoded admin, we need to find the actual admin user in database
        const adminUser = await prisma.user.findUnique({
          where: { username: "admin" },
          include: { permissions: true }
        });
        if (adminUser) {
          await users.updatePermissions(adminUser.id, permissions);
        } else {
          // Admin user doesn't exist in database, create it with the permissions
          await users.create({
            username: "admin",
            email: "admin@store.com",
            password: "admin", // Default password
            role: "ADMIN",
            permissions: permissions,
          });
        }
      } else {
        await users.updatePermissions(userId, permissions);
      }
      
      return { success: true };
    } catch (error) {
      console.error("Error updating permissions:", error);
      return {
        success: false,
        error: "Failed to update permissions: " + (error as Error).message,
      };
    }
  });

  // Get all users with permissions handler (admin only)
  ipcMain.handle("auth:getAllUsersWithPermissions", async () => {
    try {
      const usersList = await users.getAllWithPermissions();
      
      // Check if admin user exists in database
      const adminUser = await prisma.user.findUnique({
        where: { username: "admin" },
        include: { permissions: true }
      });
      
      if (adminUser) {
        // Admin user exists in database, use it but with hardcoded-admin ID for consistency
        const filteredUsers = usersList.filter(user => user.username !== "admin");
        const adminWithHardcodedId = {
          ...adminUser,
          id: "hardcoded-admin", // Use hardcoded ID for consistency
        };
        
        return {
          success: true,
          users: [adminWithHardcodedId, ...filteredUsers],
        };
      } else {
        // Admin user doesn't exist in database, add hardcoded admin
        const hardcodedAdmin = {
          id: "hardcoded-admin",
          username: "admin",
          email: "admin@store.com",
          role: "ADMIN" as const,
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
        
        return {
          success: true,
          users: [hardcodedAdmin, ...usersList],
        };
      }
    } catch (error) {
      return {
        success: false,
        error: "Failed to get users",
      };
    }
  });

  // Update user role handler (admin only)
  ipcMain.handle(
    "auth:updateUserRole",
    async (_, userId: string, role: string) => {
      try {
        const user = await users.updateRole(userId, role as any);
        const { password, ...userWithoutPassword } = user;
        return {
          success: true,
          user: userWithoutPassword,
        };
      } catch (error) {
        return {
          success: false,
          error: "Failed to update user role",
        };
      }
    },
  );

  // Get all users handler (admin only)
  ipcMain.handle("auth:getAllUsers", async () => {
    try {
      const usersList = await users.getAll();
      return {
        success: true,
        users: usersList,
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to get users",
      };
    }
  });

  // Deactivate user handler (admin only)
  ipcMain.handle("auth:deactivateUser", async (_, userId: string) => {
    try {
      const user = await users.deactivate(userId);
      const { password, ...userWithoutPassword } = user;
      return {
        success: true,
        user: userWithoutPassword,
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to deactivate user",
      };
    }
  });

  // Activate user handler (admin only)
  ipcMain.handle("auth:activateUser", async (_, userId: string) => {
    try {
      const user = await users.activate(userId);
      const { password, ...userWithoutPassword } = user;
      return {
        success: true,
        user: userWithoutPassword,
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to activate user",
      };
    }
  });

  // Delete user handler (admin only)
  ipcMain.handle("auth:deleteUser", async (_, userId: string) => {
    try {
      await users.delete(userId);
      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to delete user",
      };
    }
  });
};
