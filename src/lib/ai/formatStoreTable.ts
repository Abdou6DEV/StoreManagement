import type { StoreResultTable } from "./aiChatTypes";

type Translate = (key: string, defaultValue: string, options?: Record<string, unknown>) => string;

const COLUMN_DEFAULTS: Record<string, string> = {
  key: "Name",
  name: "Name",
  title: "Title",
  client: "Client",
  type: "Type",
  category: "Category",
  count: "Count",
  soldCount: "Sold",
  quantity: "Quantity",
  totalQuantity: "Quantity",
  revenue: "Revenue (DA)",
  profit: "Profit (DA)",
  amount: "Amount (DA)",
  paid: "Paid (DA)",
  serviceRevenue: "Service revenue (DA)",
  serviceProfit: "Service profit (DA)",
  sellingPrice: "Price (DA)",
  clientsOweYou: "They owe you (DA)",
  youOweClients: "You hold (DA)",
};

function escapeCell(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

export function formatStoreTableMarkdown(
  table: StoreResultTable,
  t: Translate
): string {
  const headers = table.columns.map((column) =>
    t(`ai.table.columns.${column}`, COLUMN_DEFAULTS[column] || column)
  );
  const lines = [
    `| ${headers.map(escapeCell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...table.rows.map(
      (row) => `| ${row.map((cell) => escapeCell(cell)).join(" | ")} |`
    ),
  ];

  if (table.truncated && table.totalRows) {
    lines.push("");
    lines.push(
      t(
        "ai.table.truncated",
        "Showing {{shown}} of {{total}}. More rows omitted.",
        { shown: table.rows.length, total: table.totalRows }
      )
    );
  }

  return lines.join("\n");
}
