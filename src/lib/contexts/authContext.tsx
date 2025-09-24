import React, { createContext, useContext, useState, useEffect } from "react";
import type { User, UserRole } from "@prisma/client";

interface AuthContextType {
  isAuthenticated: boolean;
  user: (Omit<User, "password"> & { permissions?: any }) | null;
  userRole: UserRole | null;
  isAdmin: boolean;
  login: (
    username: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
  // Permission checking functions
  canAccessPage: (page: string) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<(Omit<User, "password"> & { permissions?: any }) | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Always show login page on app start (no session persistence)
  useEffect(() => {
    // Skip authentication check - always show login page
    setLoading(false);
  }, []);

  const login = async (
    username: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await window.api.auth.login({ username, password });

      if (result.success && result.user) {
        setUser(result.user);
        setUserRole(result.user.role);
        setIsAuthenticated(true);

        // No session persistence - user must login every time

        return { success: true };
      } else {
        return { success: false, error: result.error || "Login failed" };
      }
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "Login failed" };
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setUserRole(null);
    // No localStorage to clear - no session persistence
  };

  // Permission checking functions
  const canAccessPage = (page: string): boolean => {
    if (!user || !user.permissions) return false;
    
    // Admin always has access to everything
    if (userRole === "ADMIN") return true;
    
    // Check specific page permissions
    switch (page) {
      case "cashier":
        return user.permissions.canAccessCashier || false;
      case "dashboard":
        return user.permissions.canAccessDashboard || false;
      case "stock":
        return user.permissions.canAccessStock || false;
      case "clients":
        return user.permissions.canAccessClients || false;
      case "history":
        return user.permissions.canAccessHistory || false;
      case "bills":
        return user.permissions.canAccessBills || false;
      case "administrator":
        return user.permissions.canManageUsers || false;
      default:
        return false;
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user || !user.permissions) return false;
    
    // Admin always has all permissions
    if (userRole === "ADMIN") return true;
    
    // Check specific permission
    return user.permissions[permission] || false;
  };

  const value: AuthContextType = {
    isAuthenticated,
    user,
    userRole,
    isAdmin: userRole === "ADMIN",
    login,
    logout,
    loading,
    canAccessPage,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
