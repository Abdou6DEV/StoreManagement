"use client";

import { type ComponentPropsWithRef, forwardRef } from "react";
import { Slot } from "radix-ui";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/lib/components/ui/tooltip";
import { Button } from "@/lib/components/ui/button";
import { cn } from "@/lib/utils";

export type TooltipIconButtonProps = ComponentPropsWithRef<typeof Button> & {
  tooltip: string;
  side?: "top" | "bottom" | "left" | "right";
};

export const TooltipIconButton = forwardRef<
  HTMLButtonElement,
  TooltipIconButtonProps
>(({ children, tooltip, side = "bottom", className, disabled, ...rest }, ref) => {
  const button = (
    <Button
      variant="ghost"
      size="icon"
      disabled={disabled}
      {...rest}
      className={cn(
        "aui-button-icon size-6 p-1 active:scale-90",
        className,
      )}
      ref={ref}
    >
      <Slot.Slottable>{children}</Slot.Slottable>
      <span className="aui-sr-only sr-only">{tooltip}</span>
    </Button>
  );

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        {/* Disabled buttons skip pointer events; wrap so the tooltip still shows. */}
        <TooltipTrigger asChild>
          {disabled ? <span className="inline-flex">{button}</span> : button}
        </TooltipTrigger>
        <TooltipContent side={side}>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

TooltipIconButton.displayName = "TooltipIconButton";
