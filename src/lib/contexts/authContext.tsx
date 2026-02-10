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
  isPreloading: boolean;
  preloadComplete: boolean;
  /** Call this when the preload UI has finished (e.g. progress bar reached 100%). Only this should set preloadComplete. */
  markPreloadComplete: () => void;
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
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadComplete, setPreloadComplete] = useState(false);

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

        // Start preloading after successful login
        setIsPreloading(true);
        setPreloadComplete(false);

        // Preload all pages
        const preloadPages = async () => {
          try {
            const pageComponents = [
              () => import("../../pages/mainMenu"),
              () => import("../../pages/dashboard"),
              () => import("../../pages/clients"),
              () => import("../../pages/cashier"),
              () => import("../../pages/stock"),
              () => import("../../pages/history"),
              () => import("../../pages/bills"),
              () => import("../../pages/services"),
              () => import("../../pages/administrator"),
            ];

            // Preload all pages with delays to show progress
            for (let i = 0; i < pageComponents.length; i++) {
              try {
                await pageComponents[i]();
                // Add delay between each page load for better UX (300ms per page)
                await new Promise(resolve => setTimeout(resolve, 300));
              } catch (error) {
                console.error(`Failed to preload page ${i}:`, error);
              }
            }
            
            // Don't set preloadComplete here – only the preload UI does when the bar reaches 100%
            setIsPreloading(false);
          } catch (error) {
            console.error("Preloading failed:", error);
            setIsPreloading(false);
          }
        };

        // Start preloading in the background
        preloadPages();

        return { success: true };
      } else {
        return { success: false, error: result.error || "Login failed" };
      }
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "Login failed" };
    }
  };

  const markPreloadComplete = () => {
    setPreloadComplete(true);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setUserRole(null);
    setIsPreloading(false);
    setPreloadComplete(false);
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
      case "services":
        return user.permissions.canAccessServices || false;
      case "zakat":
        return user.permissions.canAccessZakat || false;
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
    isPreloading,
    preloadComplete,
    markPreloadComplete,
    canAccessPage,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
