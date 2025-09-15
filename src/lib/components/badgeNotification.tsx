import React from 'react';
import { Badge } from './badge';
import { cn } from '../utils';

interface BadgeNotificationProps {
  count: number;
  className?: string;
  maxCount?: number;
  showZero?: boolean;
}

export const BadgeNotification: React.FC<BadgeNotificationProps> = ({
  count,
  className,
  maxCount = 99,
  showZero = false,
}) => {
  if (count <= 0 && !showZero) {
    return null;
  }

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  return (
    <Badge
      variant="outline"
      className={cn(
        "absolute top-0 right-0 rtl:right-auto rtl:left-0 h-[18px] flex items-center justify-center text-xs font-bold px-2 text-white bg-red-500 hover:bg-red-600 border-red-500 transform translate-x-1/2 -translate-y-1/2 rtl:translate-x-[-50%]",
        className
      )}
    >
      {displayCount}
    </Badge>
  );
};
