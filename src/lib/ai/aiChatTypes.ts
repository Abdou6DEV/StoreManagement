export type StoreResultTable = {
  columns: string[];
  rows: string[][];
  truncated?: boolean;
  totalRows?: number;
};

export type AiChatResponse = {
  text: string;
  table?: StoreResultTable;
};
