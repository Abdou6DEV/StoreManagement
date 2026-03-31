"use client";

import * as React from "react";
import type { Payload } from "recharts/types/component/DefaultTooltipContent";
import {
  Tooltip as RechartsTooltip,
  type TooltipProps,
  ResponsiveContainer,
} from "recharts";

import { cn } from "@/lib/utils";

const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = {
  [k: string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType<{ className?: string }>;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

export function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(
    ([, v]) => (v as any)?.color || (v as any)?.theme,
  );
  if (colorConfig.length === 0) return null;

  const css = Object.entries(THEMES)
    .map(([theme, selector]) => {
      const vars = colorConfig
        .map(([key, itemConfig]) => {
          const item: any = itemConfig;
          const color = item?.theme?.[theme] ?? item?.color;
          return color ? `  --color-${key}: ${color};` : null;
        })
        .filter(Boolean)
        .join("\n");
      return `${selector} [data-chart=${id}] {\n${vars}\n}`;
    })
    .join("\n");

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

export const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof ResponsiveContainer>["children"];
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs",
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground",
          "[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50",
          "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border",
          "[&_.recharts-dot[stroke='#fff']]:stroke-transparent",
          "[&_.recharts-layer]:outline-hidden",
          "[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border",
          "[&_.recharts-radial-bar-background-sector]:fill-muted",
          "[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted",
          "[&_.recharts-reference-line_[stroke='#ccc']]:stroke-border",
          "[&_.recharts-sector[stroke='#fff']]:stroke-transparent",
          "[&_.recharts-sector]:outline-hidden",
          "[&_.recharts-surface]:outline-hidden",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "Chart";

export const ChartTooltip = RechartsTooltip;

export const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    active?: boolean;
    payload?: any[];
    label?: any;
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: "line" | "dot" | "dashed";
    nameKey?: string;
    labelKey?: string;
    labelFormatter?: (label: any, payload: any[] | undefined) => React.ReactNode;
    labelClassName?: string;
    formatter?: (...args: any[]) => any;
    color?: string;
  }
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
      ...props
    },
    ref,
  ) => {
    const { config } = useChart();

    const getPayloadConfig = React.useCallback(
      (item: Payload<any, any>, key: string) => {
        const payloadData = item?.payload ?? {};
        const confKey =
          (labelKey && (payloadData as any)?.[labelKey]) ||
          item?.dataKey ||
          key;
        return config?.[confKey as string] ?? config?.[key] ?? {};
      },
      [config, labelKey],
    );

    if (!active || !payload?.length) return null;

    const tooltipLabel = hideLabel
      ? null
      : (labelFormatter ? labelFormatter(label, payload) : label);

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className,
        )}
        {...props}
      >
        {tooltipLabel ? (
          <div className={cn("font-medium", labelClassName)}>{tooltipLabel}</div>
        ) : null}
        <div className="grid gap-1.5">
          {payload.map((item: any, index: number) => {
            const key = nameKey || item?.name || item?.dataKey || "value";
            const itemConfig = getPayloadConfig(item, String(key));
            const indicatorColor =
              color || item?.payload?.fill || item?.color || `var(--color-${String(key)})`;

            const indicatorEl = hideIndicator ? null : (
              indicator === "line" ? (
                <div
                  className="h-2.5 w-1 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: indicatorColor }}
                />
              ) : indicator === "dashed" ? (
                <div
                  className="h-2.5 w-0 shrink-0 border border-dashed"
                  style={{ borderColor: indicatorColor }}
                />
              ) : (
                <div
                  className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: indicatorColor }}
                />
              )
            );

            const name =
              itemConfig?.label ??
              (typeof item?.name === "string" ? item.name : key);

            const valueNode = formatter
              ? formatter(item?.value, item?.name, item, index, item?.payload)
              : item?.value;

            return (
              <div
                key={item?.dataKey ?? index}
                className="flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground"
              >
                {itemConfig?.icon ? <itemConfig.icon /> : indicatorEl}
                <div className="flex flex-1 justify-between leading-none">
                  <span className="text-muted-foreground">{name}</span>
                  <span className="font-mono font-medium tabular-nums text-foreground">
                    {typeof valueNode === "number" ? valueNode.toLocaleString() : valueNode}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);
ChartTooltipContent.displayName = "ChartTooltipContent";

