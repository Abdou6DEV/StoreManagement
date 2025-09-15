import React from 'react';
import { Badge } from './badge';
import { cn } from '../utils';

interface BadgeNotificationProps {
  count: number;
  className?: string;
  maxCount?: number;
  showZero?: boolean;
  variant?: 'red' | 'orange' | 'blue' | 'green' | 'purple';
}

export const BadgeNotification: React.FC<BadgeNotificationProps> = ({
  count,
  className,
  maxCount = 99,
  showZero = false,
  variant = 'red',
}) => {
  if (count <= 0 && !showZero) {
    return null;
  }

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  // Color variants
  const colorClasses = {
    red: "bg-red-500 hover:bg-red-600 border-red-500",
    orange: "bg-orange-500 hover:bg-orange-600 border-orange-500",
    blue: "bg-blue-500 hover:bg-blue-600 border-blue-500",
    green: "bg-green-500 hover:bg-green-600 border-green-500",
    purple: "bg-purple-500 hover:bg-purple-600 border-purple-500",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "absolute top-0 right-0 rtl:right-auto rtl:left-0 h-[18px] flex items-center justify-center text-xs font-bold px-1.5 text-white transform translate-x-1/2 -translate-y-1/2 rtl:translate-x-[-50%] min-w-[16px]",
        colorClasses[variant],
        className
      )}
    >
      {displayCount}
    </Badge>
  );
};
