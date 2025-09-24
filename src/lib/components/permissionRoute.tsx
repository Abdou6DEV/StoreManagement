import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/authContext";

interface PermissionRouteProps {
  children: React.ReactNode;
  requiredPermission: string;
  fallbackPath?: string;
}

export default function PermissionRoute({
  children,
  requiredPermission,
  fallbackPath = "/",
}: PermissionRouteProps) {
  const { isAuthenticated, canAccessPage, loading } = useAuth();

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has permission to access this page
  if (!canAccessPage(requiredPermission)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
