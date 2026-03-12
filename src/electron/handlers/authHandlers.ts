import { ipcMain } from "electron";
import {
  users,
  CreateUserData,
  LoginCredentials,
} from "../../lib/database/users";
import { getMachineGuid, validateKey } from "../utils/validationKey";

const defaultAdminPayload = () => ({
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
    canAccessServices: true,
    canAccessDashboard: true,
    canAccessZakat: true,
    canManageUsers: true,
    canViewLogs: true,
    canManageSettings: true,
  },
});

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

  // Login with activation key (forgot username/password) — logs in as admin.
  // If machineId is provided (from the login page display), use it so validation matches the GUID we showed.
  ipcMain.handle("auth:loginByActivationKey", async (_, activationKey: string, machineIdFromFrontend?: string) => {
    try {
      const machineId = machineIdFromFrontend?.trim() || getMachineGuid();
      if (!validateKey(machineId, activationKey.trim())) {
        return {
          success: false,
          error: "Invalid activation key",
        };
      }
      const primaryAdmin = await users.getPrimaryAdmin();
      if (primaryAdmin) {
        const { password, ...userWithoutPassword } = primaryAdmin;
        return {
          success: true,
          user: { ...userWithoutPassword, id: "hardcoded-admin" },
        };
      }
      return {
        success: true,
        user: defaultAdminPayload(),
      };
    } catch (error) {
      console.error("Login by activation key error:", error);
      return {
        success: false,
        error: (error as Error).message || "Invalid activation key",
      };
    }
  });

  // Update user password handler
  ipcMain.handle("auth:updatePassword", async (_, userId: string, newPassword: string) => {
    try {
      if (userId === "hardcoded-admin") {
        const primaryAdmin = await users.getPrimaryAdmin();
        if (!primaryAdmin) {
          await users.create({
            username: "admin",
            email: "admin@store.com",
            password: newPassword,
            role: "ADMIN",
            permissions: {
              canAccessCashier: true,
              canAccessStock: true,
              canAccessClients: true,
              canAccessBills: true,
              canAccessHistory: true,
              canAccessServices: true,
              canAccessDashboard: true,
              canAccessZakat: true,
              canManageUsers: true,
              canViewLogs: true,
              canManageSettings: true,
            },
          });
          return { success: true };
        }
        await users.updatePassword(primaryAdmin.id, newPassword);
        return { success: true };
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
      if (userId === "hardcoded-admin") {
        const primaryAdmin = await users.getPrimaryAdmin();
        if (primaryAdmin) {
          await users.updatePermissions(primaryAdmin.id, permissions);
        } else {
          await users.create({
            username: "admin",
            email: "admin@store.com",
            password: "admin",
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
      const primaryAdmin = await users.getPrimaryAdmin();
      const usersList = await users.getAllWithPermissions();

      if (primaryAdmin) {
        const { password, ...adminWithoutPassword } = primaryAdmin;
        const filteredUsers = usersList.filter((u) => u.id !== primaryAdmin.id);
        return {
          success: true,
          users: [{ ...adminWithoutPassword, id: "hardcoded-admin" }, ...filteredUsers],
        };
      }
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
          canAccessServices: true,
          canAccessDashboard: true,
          canAccessZakat: true,
          canManageUsers: true,
          canViewLogs: true,
          canManageSettings: true,
        },
      };
      return {
        success: true,
        users: [hardcodedAdmin, ...usersList],
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to get users",
      };
    }
  });

  // Update username handler (admin can change own username; primary admin resolved from hardcoded-admin)
  ipcMain.handle("auth:updateUsername", async (_, userId: string, newUsername: string) => {
    try {
      let targetId = userId;
      if (userId === "hardcoded-admin") {
        const primaryAdmin = await users.getPrimaryAdmin();
        if (!primaryAdmin) {
          return { success: false, error: "Admin user not found. Change password first to create the account." };
        }
        targetId = primaryAdmin.id;
      }
      await users.updateUsername(targetId, newUsername.trim());
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update username";
      return { success: false, error: message };
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
