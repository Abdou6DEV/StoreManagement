export type ListMeta = {
  totalCount: number;
  returnedCount: number;
  truncated: boolean;
};

export function capList<T>(items: T[], limit: number): ListMeta & { items: T[] } {
  const totalCount = items.length;
  const sliced = items.slice(0, limit);
  return {
    items: sliced,
    totalCount,
    returnedCount: sliced.length,
    truncated: sliced.length < totalCount,
  };
}

export function capListFromEnd<T>(
  items: T[],
  limit: number
): ListMeta & { items: T[] } {
  const totalCount = items.length;
  const sliced = items.slice(-limit);
  return {
    items: sliced,
    totalCount,
    returnedCount: sliced.length,
    truncated: sliced.length < totalCount,
  };
}

export function listMeta(cap: ListMeta): ListMeta {
  return {
    totalCount: cap.totalCount,
    returnedCount: cap.returnedCount,
    truncated: cap.truncated,
  };
}

export function listMetaFromTotal(
  returnedCount: number,
  totalCount: number
): ListMeta {
  return {
    totalCount,
    returnedCount,
    truncated: returnedCount < totalCount,
  };
}
