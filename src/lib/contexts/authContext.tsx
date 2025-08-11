import React, { createContext, useContext, useState, useEffect } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => void;
  logout: () => void;
  user: string | null;
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
  const [user, setUser] = useState<string | null>(null);

  // Check if user is already authenticated on app start
  useEffect(() => {
    const savedAuth = localStorage.getItem("storeManagementAuth");
    if (savedAuth) {
      const authData = JSON.parse(savedAuth);
      setIsAuthenticated(authData.isAuthenticated);
      setUser(authData.user);
    }
  }, []);

  const login = (username: string, password: string) => {
    // For demo purposes, accept any username/password
    // In a real app, you would validate against a backend
    setIsAuthenticated(true);
    setUser(username);

    // Save to localStorage for persistence
    const authData = { isAuthenticated: true, user: username };
    localStorage.setItem("storeManagementAuth", JSON.stringify(authData));
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem("storeManagementAuth");
  };

  const value: AuthContextType = {
    isAuthenticated,
    login,
    logout,
    user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
