export const CLIENT_STATUSES = ["all", "owes_you", "deposits"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

const OWES_YOU_Q =
  /^(credit|credits|crédit|crédits|unpaid|outstanding|owe|owes|debt|impay[ée]s?|creance|créance)$/i;
const DEPOSITS_Q =
  /^(versement|versements|deposit|deposits|dép[oô]t|dépots|avance|avances)$/i;
const OWES_YOU_AR = /(رصيد|دين|سلفة|يسلف|مدين)/;
const DEPOSITS_AR = /(وديعة|ودائع|تسبيق|عربون)/;

export function isClientStatus(value: unknown): value is ClientStatus {
  return (
    typeof value === "string" &&
    (CLIENT_STATUSES as readonly string[]).includes(value.trim().toLowerCase())
  );
}

/**
 * Prefer explicit `status`. Magic q values (credit / versement) are mapped
 * so an old model call cannot search for a client named "credit".
 */
export function resolveClientFind(
  q?: unknown,
  status?: unknown
): { status: ClientStatus; q: string } {
  const name = typeof q === "string" ? q.trim() : "";
  const explicit =
    typeof status === "string" ? status.trim().toLowerCase() : "";

  if (isClientStatus(explicit)) {
    const magic =
      OWES_YOU_Q.test(name) ||
      DEPOSITS_Q.test(name) ||
      OWES_YOU_AR.test(name) ||
      DEPOSITS_AR.test(name);
    return { status: explicit, q: magic ? "" : name };
  }

  if (name && (OWES_YOU_Q.test(name) || OWES_YOU_AR.test(name))) {
    return { status: "owes_you", q: "" };
  }
  if (name && (DEPOSITS_Q.test(name) || DEPOSITS_AR.test(name))) {
    return { status: "deposits", q: "" };
  }

  return { status: "all", q: name };
}
