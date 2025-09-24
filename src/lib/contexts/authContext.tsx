import React, { createContext, useContext, useState, useEffect } from "react";
import type { User, UserRole } from "@prisma/client";

interface AuthContextType {
  isAuthenticated: boolean;
  user: Omit<User, "password"> | null;
  userRole: UserRole | null;
  isAdmin: boolean;
  login: (
    username: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
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
  const [user, setUser] = useState<Omit<User, "password"> | null>(null);
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

  const value: AuthContextType = {
    isAuthenticated,
    user,
    userRole,
    isAdmin: userRole === "ADMIN",
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
