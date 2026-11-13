import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { OrderRecord } from "../database/orderTypes";
import { getOrderDueState, type OrderDueState } from "../utils/orderDueDates";
import { getWarmupSnapshot, subscribeWarmup } from "../warmup/appWarmup";

type DueKind = Exclude<OrderDueState, null>;
type ContextValue = {
  overdueCount: number;
  dueSoonCount: number;
  dueSoonThresholdDays: number;
  overdueIds: Set<string>;
  dueSoonIds: Set<string>;
  markSeen: (kind: DueKind) => void;
};

const OrderNotificationsContext = createContext<ContextValue | undefined>(undefined);
const storageKeys: Record<DueKind, string> = { overdue: "seenOverdueOrders", dueSoon: "seenDueSoonOrders" };

function readSeen(kind: DueKind): Set<string> {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKeys[kind]) || "[]");
    return new Set(Array.isArray(saved) ? saved.filter((value): value is string => typeof value === "string") : []);
  } catch {
    return new Set();
  }
}

export function OrderNotificationsProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<OrderRecord[]>(() => getWarmupSnapshot().orders ?? []);
  const [options, setOptions] = useState(() => getWarmupSnapshot().options);
  const [seen, setSeen] = useState(() => ({ overdue: readSeen("overdue"), dueSoon: readSeen("dueSoon") }));
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => subscribeWarmup(({ key, snapshot }) => {
    if (key === "orders" && snapshot.orders) setOrders(snapshot.orders);
    if (key === "options") setOptions({ ...snapshot.options });
  }), []);
  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const parsedThreshold = Number(options.dueSoonOrdersThresholdDays ?? 2);
  const dueSoonThresholdDays = Number.isInteger(parsedThreshold) && parsedThreshold >= 1 && parsedThreshold <= 30 ? parsedThreshold : 2;
  const overdueEnabled = Object.prototype.hasOwnProperty.call(options, "enableOverdueOrdersBadge") && options.enableOverdueOrdersBadge !== "false";
  const dueSoonEnabled = Object.prototype.hasOwnProperty.call(options, "enableDueSoonOrdersBadge") && options.enableDueSoonOrdersBadge !== "false";
  const { overdueIds, dueSoonIds } = useMemo(() => {
    const overdueIds = new Set<string>();
    const dueSoonIds = new Set<string>();
    for (const order of orders) {
      const state = getOrderDueState(order.dueDate, order.status, dueSoonThresholdDays, new Date(clock));
      const key = `${order.id}:${order.dueDate}`;
      if (state === "overdue" && overdueEnabled && !seen.overdue.has(key)) overdueIds.add(order.id);
      if (state === "dueSoon" && dueSoonEnabled && !seen.dueSoon.has(key)) dueSoonIds.add(order.id);
    }
    return { overdueIds, dueSoonIds };
  }, [orders, seen, clock, dueSoonThresholdDays, overdueEnabled, dueSoonEnabled]);

  const markSeen = useCallback((kind: DueKind) => {
    const next = new Set(seen[kind]);
    for (const order of orders) {
      if (getOrderDueState(order.dueDate, order.status, dueSoonThresholdDays) === kind) next.add(`${order.id}:${order.dueDate}`);
    }
    localStorage.setItem(storageKeys[kind], JSON.stringify([...next]));
    setSeen((current) => ({ ...current, [kind]: next }));
  }, [orders, seen, dueSoonThresholdDays]);

  return <OrderNotificationsContext.Provider value={{ overdueCount: overdueIds.size, dueSoonCount: dueSoonIds.size, dueSoonThresholdDays, overdueIds, dueSoonIds, markSeen }}>{children}</OrderNotificationsContext.Provider>;
}

export function useOrderNotifications() {
  const context = useContext(OrderNotificationsContext);
  if (!context) throw new Error("useOrderNotifications must be used within an OrderNotificationsProvider");
  return context;
}