import { users } from "../../lib/database/users";
import { isZakatQuery } from "./isZakatQuery";

export type AiAccess = {
  userId: string;
  username: string;
  isAdmin: boolean;
  isActive: boolean;
  cashier: boolean;
  dashboard: boolean;
  stock: boolean;
  clients: boolean;
  history: boolean;
  bills: boolean;
  services: boolean;
  zakat: boolean;
  logs: boolean;
};

const PAGE_LABELS = {
  cashier: "Cashier",
  dashboard: "Dashboard",
  stock: "Stock",
  clients: "Clients",
  history: "History",
  bills: "Bills",
  services: "Services",
  zakat: "Zakat",
  logs: "Activity logs",
} as const;

type AccessPage = keyof typeof PAGE_LABELS;

export const AI_ACCESS_NONE: AiAccess = {
  userId: "",
  username: "",
  isAdmin: false,
  isActive: false,
  cashier: false,
  dashboard: false,
  stock: false,
  clients: false,
  history: false,
  bills: false,
  services: false,
  zakat: false,
  logs: false,
};

function flag(value: unknown): boolean {
  return value === true || value === 1;
}

function fullAccess(userId: string, username: string): AiAccess {
  return {
    userId,
    username,
    isAdmin: true,
    isActive: true,
    cashier: true,
    dashboard: true,
    stock: true,
    clients: true,
    history: true,
    bills: true,
    services: true,
    zakat: true,
    logs: true,
  };
}

export function hasAnyAiStoreAccess(access: AiAccess | null | undefined): boolean {
  if (!access?.isActive) return false;
  return (
    access.cashier ||
    access.dashboard ||
    access.stock ||
    access.clients ||
    access.history ||
    access.bills ||
    access.services ||
    access.zakat ||
    access.logs
  );
}

export async function loadAiAccess(userId: unknown): Promise<AiAccess> {
  if (typeof userId !== "string" || !userId.trim()) {
    return AI_ACCESS_NONE;
  }

  const user = await users.getById(userId.trim());
  return accessFromUser(user);
}

export function accessFromUser(user: unknown): AiAccess {
  if (!user || typeof user !== "object") {
    return AI_ACCESS_NONE;
  }

  const row = user as {
    id?: unknown;
    username?: unknown;
    role?: unknown;
    isActive?: unknown;
    permissions?: Record<string, unknown> | null;
  };

  if (row.isActive === false) {
    return AI_ACCESS_NONE;
  }

  const userId = typeof row.id === "string" ? row.id.trim() : "";
  const username =
    typeof row.username === "string" ? row.username.trim() : "";

  if (!userId) {
    return AI_ACCESS_NONE;
  }

  if (row.role === "ADMIN") {
    return fullAccess(userId, username);
  }

  const permissions = row.permissions ?? {};
  return {
    userId,
    username,
    isAdmin: false,
    isActive: true,
    cashier: flag(permissions.canAccessCashier),
    dashboard: flag(permissions.canAccessDashboard),
    stock: flag(permissions.canAccessStock),
    clients: flag(permissions.canAccessClients),
    history: flag(permissions.canAccessHistory),
    bills: flag(permissions.canAccessBills),
    services: flag(permissions.canAccessServices),
    zakat: flag(permissions.canAccessZakat),
    logs: flag(permissions.canViewLogs),
  };
}

function deny(need: string): string {
  return `NO_ACCESS: the current user cannot see this (${need}). Do not invent or copy any store numbers. Reply only that they do not have access, in their language.`;
}

function allowed(
  access: AiAccess,
  pages: AccessPage[]
): boolean {
  return pages.some((page) => access[page]);
}

function needLabel(pages: AccessPage[]): string {
  return pages.map((page) => PAGE_LABELS[page]).join(" or ");
}

function requirePages(
  access: AiAccess,
  pages: AccessPage[]
): string | null {
  if (allowed(access, pages)) return null;
  return deny(needLabel(pages));
}

function normalizeAlertKind(kind: unknown): string {
  const raw = String(kind ?? "").trim().toLowerCase();
  if (raw === "credits_unpaid") return "credits_due";
  if (raw === "versements_unpaid") return "versements_due";
  if (raw === "upcoming_services") return "services_due_soon";
  return raw;
}

/**
 * Fail closed: unknown tools/entities are denied. Returns an error string, or null if allowed.
 */
export function denyToolAccess(
  toolName: string,
  input: unknown,
  access: AiAccess | null | undefined
): string | null {
  if (!access?.isActive || !hasAnyAiStoreAccess(access)) {
    return deny("any store page");
  }

  const raw =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const name = String(toolName ?? "").trim().toLowerCase();

  if (name === "report") {
    const entity = String(raw.entity ?? "").trim().toLowerCase();
    if (entity === "sales") {
      return requirePages(access, ["history", "cashier", "dashboard"]);
    }
    if (entity === "payments") {
      return requirePages(access, ["clients"]);
    }
    if (entity === "purchases") {
      return requirePages(access, ["stock", "history"]);
    }
    if (entity === "stock") {
      if (isZakatQuery(raw.q)) return requirePages(access, ["zakat"]);
      return requirePages(access, ["stock"]);
    }
    if (entity === "services") {
      return requirePages(access, ["services"]);
    }
    if (entity === "bills") {
      return requirePages(access, ["bills"]);
    }
    if (entity === "activity") {
      return requirePages(access, ["logs"]);
    }
    return deny("a recognized store page");
  }

  if (name === "find") {
    const type = String(raw.type ?? "").trim().toLowerCase();
    if (type === "product") return requirePages(access, ["stock"]);
    if (type === "client") return requirePages(access, ["clients"]);
    if (type === "seller") return requirePages(access, ["stock", "history"]);
    if (type === "sale") return requirePages(access, ["history", "cashier"]);
    return deny("a recognized store page");
  }

  if (name === "alerts") {
    const kind = normalizeAlertKind(raw.kind);
    if (kind === "low_stock" || kind === "out_of_stock") {
      return requirePages(access, ["stock"]);
    }
    if (kind.startsWith("credits_") || kind.startsWith("versements_")) {
      return requirePages(access, ["clients"]);
    }
    if (kind.startsWith("bills_")) {
      return requirePages(access, ["bills"]);
    }
    if (kind.startsWith("services_")) {
      return requirePages(access, ["services"]);
    }
    return deny("a recognized store page");
  }

  if (name === "restock") {
    return requirePages(access, ["stock"]);
  }

  return deny("a recognized store page");
}

export function buildAccessSection(access: AiAccess | null | undefined): string {
  if (!hasAnyAiStoreAccess(access)) {
    return `

## Page access
This account cannot see store records. Do not call store tools. Do not invent sales, stock, clients, bills, services, profit, or any DA amounts. If they ask for store data, say they do not have access, in their language.`;
  }

  const pages = Object.keys(PAGE_LABELS) as AccessPage[];
  const allowedPages = pages
    .filter((page) => access![page])
    .map((page) => PAGE_LABELS[page]);
  const deniedPages = pages
    .filter((page) => !access![page])
    .map((page) => PAGE_LABELS[page]);

  const deniedLine =
    deniedPages.length > 0
      ? `Denied: ${deniedPages.join(", ")}. If they ask for a denied page, say they do not have access. Do not call a tool for it.`
      : "Denied: none.";

  return `

## Page access
This account may only see pages they can open in the app. Do not invent numbers for a denied page.
Allowed: ${allowedPages.join(", ")}.
${deniedLine}`;
}
