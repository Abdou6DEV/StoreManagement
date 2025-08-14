import { ipcMain } from "electron";
import {
  users,
  CreateUserData,
  LoginCredentials,
} from "../../lib/database/users";

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
