import { prisma, prismaPromise } from "./prismaClient";
import { getOption, setOption } from "./options";

const ACTIVITY_LOG_RETENTION_KEY = "activityLogRetentionDays";
const DEFAULT_RETENTION_DAYS = 90;

export interface CreateActivityLogInput {
  username: string;
  action: string;
  details?: string | null;
}

export interface ActivityLogFilter {
  username?: string | null;
  dateFrom?: Date | string | null;
  dateTo?: Date | string | null;
  search?: string | null;
  limit?: number;
  offset?: number;
}

export interface ActivityLogEntry {
  id: string;
  username: string;
  action: string;
  details: string | null;
  createdAt: Date;
}

export interface ActivityLogListResult {
  entries: ActivityLogEntry[];
  total: number;
}

/** Create a single activity log entry. */
export async function createActivityLog(input: CreateActivityLogInput): Promise<void> {
  await prismaPromise;
  await prisma.activityLog.create({
    data: {
      username: input.username,
      action: input.action,
      details: input.details ?? null,
    },
  });
}

/** List activity logs with optional filters and pagination. */
export async function getActivityLogs(filter: ActivityLogFilter): Promise<ActivityLogListResult> {
  await prismaPromise;

  const dateFrom =
    filter.dateFrom != null
      ? typeof filter.dateFrom === "string"
        ? new Date(filter.dateFrom)
        : filter.dateFrom
      : undefined;
  const dateTo =
    filter.dateTo != null
      ? typeof filter.dateTo === "string"
        ? new Date(filter.dateTo)
        : filter.dateTo
      : undefined;

  const where: Record<string, unknown> = {};

  if (filter.username?.trim()) {
    where.username = filter.username.trim();
  }

  const dateRange: { gte?: Date; lte?: Date } = {};
  if (dateFrom != null && !isNaN(dateFrom.getTime())) dateRange.gte = dateFrom;
  if (dateTo != null && !isNaN(dateTo.getTime())) {
    const endOfDay = new Date(dateTo);
    endOfDay.setHours(23, 59, 59, 999);
    dateRange.lte = endOfDay;
  }
  if (Object.keys(dateRange).length > 0) where.createdAt = dateRange;

  if (filter.search?.trim()) {
    const searchTerm = filter.search.trim();
    where.OR = [
      { username: { contains: searchTerm } },
      { action: { contains: searchTerm } },
      { details: { contains: searchTerm } },
    ];
  }

  const [entries, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(filter.limit ?? 100, 500),
      skip: filter.offset ?? 0,
    }),
    prisma.activityLog.count({ where }),
  ]);

  return {
    entries: entries.map((e) => ({
      id: e.id,
      username: e.username,
      action: e.action,
      details: e.details,
      createdAt: e.createdAt,
    })),
    total,
  };
}

/** Get list of distinct usernames that have activity logs (for filter dropdown). */
export async function getActivityLogUsernames(): Promise<string[]> {
  await prismaPromise;
  const rows = await prisma.activityLog.findMany({
    select: { username: true },
    distinct: ["username"],
    orderBy: { username: "asc" },
  });
  return rows.map((r) => r.username);
}

/** Get configured retention days (how long to keep logs). */
export async function getActivityLogRetentionDays(): Promise<number> {
  const value = await getOption(ACTIVITY_LOG_RETENTION_KEY);
  if (value == null) return DEFAULT_RETENTION_DAYS;
  const days = parseInt(value, 10);
  return Number.isFinite(days) && days > 0 ? days : DEFAULT_RETENTION_DAYS;
}

/** Set retention days and optionally run cleanup. */
export async function setActivityLogRetentionDays(days: number): Promise<void> {
  const safe = Math.max(1, Math.min(3650, Math.floor(days)));
  await setOption(ACTIVITY_LOG_RETENTION_KEY, String(safe));
}

/** Delete activity logs older than the configured retention period. Returns number deleted. */
export async function deleteActivityLogsOlderThanRetention(): Promise<number> {
  await prismaPromise;
  const retentionDays = await getActivityLogRetentionDays();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const result = await prisma.activityLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return result.count;
}
