import React from "react";
import { User, Crown, Shield, UserCheck } from "lucide-react";
import { cn } from "../utils";
import { useAuth } from "../contexts/authContext";
import { useTranslation } from "react-i18next";

interface UserBadgeProps {
  className?: string;
  showRole?: boolean;
  size?: "sm" | "md" | "lg";
}

export function UserBadge({ 
  className = "", 
  showRole = true, 
  size = "md" 
}: UserBadgeProps) {
  const { user, userRole, isAdmin } = useAuth();
  const { t } = useTranslation();

  if (!user) return null;

  // Size configurations
  const sizeConfig = {
    sm: {
      container: "px-3 py-2",
      avatar: "w-8 h-8 text-sm",
      text: "text-sm",
      role: "text-xs",
      icon: "w-3 h-3"
    },
    md: {
      container: "px-4 py-3",
      avatar: "w-10 h-10 text-base",
      text: "text-base",
      role: "text-sm",
      icon: "w-4 h-4"
    },
    lg: {
      container: "px-5 py-4",
      avatar: "w-12 h-12 text-lg",
      text: "text-lg",
      role: "text-base",
      icon: "w-5 h-5"
    }
  };

  const config = sizeConfig[size];

  // Get user initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Get role icon and color
  const getRoleInfo = () => {
    if (isAdmin || userRole === "ADMIN") {
      return {
        icon: Crown,
        color: "text-amber-500",
        bgColor: "bg-gradient-to-br from-amber-400 to-orange-500",
        text: t("userBadge.admin", "Admin")
      };
    }
    
    if (userRole === "MANAGER") {
      return {
        icon: Shield,
        color: "text-blue-500",
        bgColor: "bg-gradient-to-br from-blue-400 to-blue-600",
        text: t("userBadge.manager", "Manager")
      };
    }
    
    return {
      icon: UserCheck,
      color: "text-green-500",
      bgColor: "bg-gradient-to-br from-green-400 to-green-600",
      text: t("userBadge.user", "User")
    };
  };

  const roleInfo = getRoleInfo();
  const initials = getInitials(user.username || user.name || "U");

  return (
    <div className={cn(
      "flex items-center gap-3 bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-all duration-200",
      config.container,
      className
    )}>
      {/* Avatar */}
      <div className={cn(
        "rounded-full flex items-center justify-center font-bold text-white shadow-md",
        config.avatar,
        roleInfo.bgColor
      )}>
        {initials}
      </div>

      {/* User Info */}
      <div className="flex flex-col min-w-0">
        {/* Username */}
        <div className={cn(
          "font-semibold text-foreground truncate",
          config.text
        )}>
          {user.username || user.name || t("userBadge.user", "User")}
        </div>

        {/* Role Badge */}
        {showRole && (
          <div className={cn(
            "flex items-center gap-1 font-medium",
            config.role,
            roleInfo.color
          )}>
            <roleInfo.icon className={config.icon} />
            <span>{roleInfo.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserBadge;
