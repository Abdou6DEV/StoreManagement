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

  // Check if user is already authenticated on app start
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const savedAuth = localStorage.getItem("storeManagementAuth");
        if (savedAuth) {
          const authData = JSON.parse(savedAuth);
          if (authData.userId) {
            const result = await window.api.auth.getUserById(authData.userId);
            if (result.success && result.user) {
              setUser(result.user);
              setUserRole(result.user.role);
              setIsAuthenticated(true);
            } else {
              // Invalid saved auth, clear it
              localStorage.removeItem("storeManagementAuth");
            }
          }
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
        localStorage.removeItem("storeManagementAuth");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
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

        // Save to localStorage for persistence
        const authData = {
          isAuthenticated: true,
          userId: result.user.id,
          username: result.user.username,
          role: result.user.role,
        };
        localStorage.setItem("storeManagementAuth", JSON.stringify(authData));

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
    localStorage.removeItem("storeManagementAuth");
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
