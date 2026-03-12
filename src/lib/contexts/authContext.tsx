import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
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
  /** Log in as admin using activation key (forgot username/password). Pass machineId to validate against the same GUID shown on screen. */
  loginByActivationKey: (
    activationKey: string,
    machineId?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  /** Call after login success UI sequence (green button, fade out) to show preload transition. */
  confirmLoginTransition: () => void;
  logout: () => void;
  loading: boolean;
  isPreloading: boolean;
  /** 0–100, updated as each route chunk finishes loading. */
  preloadProgress: number;
  /** Called by preload screen to update progress (same module as App so same chunks load). */
  setPreloadProgress: (n: number) => void;
  setIsPreloading: (v: boolean) => void;
  preloadComplete: boolean;
  /** Call this when the preload UI has finished (e.g. progress bar reached 100%). Only this should set preloadComplete. */
  markPreloadComplete: () => void;
  /** True right after successful login until the login→preload logo animation has finished. */
  justLoggedIn: boolean;
  /** Call when the logo-down transition (login → preload) animation has finished. */
  markLoginTransitionDone: () => void;
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
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [preloadComplete, setPreloadComplete] = useState(false);
  const [justLoggedIn, setJustLoggedIn] = useState(false);

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
        setIsPreloading(true);
        setPreloadProgress(0);
        setPreloadComplete(false);
        return { success: true };
      } else {
        return { success: false, error: result.error || "Login failed" };
      }
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "Login failed" };
    }
  };

  const loginByActivationKey = async (
    activationKey: string,
    machineId?: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await window.api.auth.loginByActivationKey(
        activationKey,
        machineId,
      );

      if (result.success && result.user) {
        setUser(result.user);
        setUserRole(result.user.role);
        setIsPreloading(true);
        setPreloadProgress(0);
        setPreloadComplete(false);
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || "Invalid activation key",
        };
      }
    } catch (error) {
      console.error("Login by activation key error:", error);
      return { success: false, error: "Invalid activation key" };
    }
  };

  const markPreloadComplete = () => {
    setPreloadComplete(true);
  };

  const markLoginTransitionDone = () => {
    setJustLoggedIn(false);
  };

  const confirmLoginTransition = useCallback(() => {
    setIsAuthenticated(true);
    setJustLoggedIn(true);
  }, []);

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setUserRole(null);
    setIsPreloading(false);
    setPreloadComplete(false);
    setJustLoggedIn(false);
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
    loginByActivationKey,
    logout,
    loading,
    isPreloading,
    preloadProgress,
    setPreloadProgress,
    setIsPreloading,
    preloadComplete,
    markPreloadComplete,
    justLoggedIn,
    markLoginTransitionDone,
    confirmLoginTransition,
    canAccessPage,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
