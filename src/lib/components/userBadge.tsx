import React from "react";
import { Crown, UserCheck } from "lucide-react";
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
    
    return {
      icon: UserCheck,
      color: "text-green-500",
      bgColor: "bg-gradient-to-br from-green-400 to-green-600",
      text: t("userBadge.user", "User")
    };
  };

  const roleInfo = getRoleInfo();
  const initials = getInitials(user.username || "U");

  return (
    <div className={cn(
      "group flex items-center gap-3 bg-gradient-to-r from-card/80 via-card/90 to-card/80 backdrop-blur-md border border-border/50 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 overflow-hidden relative",
      config.container,
      className
    )}>
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Avatar with enhanced styling */}
      <div className={cn(
        "relative rounded-full flex items-center justify-center font-bold text-white shadow-lg ring-2 ring-white/20 group-hover:ring-white/30 transition-all duration-300",
        config.avatar,
        roleInfo.bgColor
      )}>
        {/* Avatar glow effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <span className="relative z-10">{initials}</span>
      </div>

      {/* User Info */}
      <div className="flex flex-col min-w-0 relative z-10">
        {/* Username */}
        <div className={cn(
          "font-bold text-foreground truncate group-hover:text-primary transition-colors duration-300",
          config.text
        )}>
          {user.username || t("userBadge.user", "User")}
        </div>

        {/* Role Badge with enhanced styling */}
        {showRole && (
          <div className={cn(
            "flex items-center gap-1.5 font-semibold px-2 py-1 rounded-full bg-gradient-to-r from-muted/50 to-muted/30 border border-border/30 group-hover:border-primary/30 transition-all duration-300",
            config.role,
            roleInfo.color
          )}>
            <roleInfo.icon className={cn(config.icon, "group-hover:scale-110 transition-transform duration-300")} />
            <span className="group-hover:text-primary transition-colors duration-300">{roleInfo.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserBadge;
