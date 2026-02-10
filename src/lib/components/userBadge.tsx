import React from "react";
import { User } from "lucide-react";
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
      icon: "w-3 h-3",
      userIcon: "w-5 h-5"
    },
    md: {
      container: "px-4 py-3",
      avatar: "w-10 h-10 text-base",
      text: "text-base",
      role: "text-sm",
      icon: "w-4 h-4",
      userIcon: "w-6 h-6"
    },
    lg: {
      container: "px-5 py-4",
      avatar: "w-12 h-12 text-lg",
      text: "text-lg",
      role: "text-base",
      icon: "w-5 h-5",
      userIcon: "w-7 h-7"
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

  // Get role color and label
  const getRoleInfo = () => {
    if (isAdmin || userRole === "ADMIN") {
      return {
        color: "text-amber-500",
        bgColor: "bg-gradient-to-br from-amber-400 to-orange-500",
        borderColor: "border-amber-300/50 hover:border-amber-400/70",
        text: t("userBadge.admin", "Admin")
      };
    }

    return {
      color: "text-green-500",
      bgColor: "bg-gradient-to-br from-green-400 to-green-600",
      borderColor: "border-green-300/50 hover:border-green-400/70",
      text: t("userBadge.user", "User")
    };
  };

  const roleInfo = getRoleInfo();
  const initials = getInitials(user.username || "U");

  return (
    <div className={cn(
      "group relative overflow-hidden rounded-full bg-gradient-to-r from-card via-card/95 to-card border transition-all duration-500 hover:shadow-lg",
      roleInfo.borderColor,
      className
    )}>

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(0,0,0,0.1),transparent_50%)]"></div>
      </div>

      <div className={cn(
        "relative flex items-center gap-3 backdrop-blur-sm",
        config.container
      )}>

        {/* User Icon */}
        <User className={cn("transition-all duration-300 group-hover:scale-110", config.userIcon, roleInfo.color)} />

        {/* User Info */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className={cn(
            "font-semibold text-foreground truncate leading-tight",
            config.text
          )}>
            {user.username || t("userBadge.user", "User")}
          </div>
          {showRole && (
            <div className={cn(
              "text-xs font-medium uppercase tracking-wider opacity-75",
              roleInfo.color
            )}>
              {roleInfo.text}
            </div>
          )}
        </div>

        {/* Avatar Initials */}
        <div className={cn(
          "flex items-center justify-center rounded-full font-bold text-foreground border-2 transition-all duration-300 group-hover:scale-110",
          "w-8 h-8 text-sm",
          roleInfo.bgColor,
          roleInfo.borderColor
        )}>
          <span>{initials}</span>
        </div>
      </div>

      {/* Animated Border */}
      <div className="absolute inset-0 rounded-full border-2 border-transparent bg-gradient-to-r from-primary/20 via-transparent to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>
    </div>
  );
}

export default UserBadge;
