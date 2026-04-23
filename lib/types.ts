export type Product = {
  id: number;
  item_code: string;
  item_name: string;
  barcode?: string | null;
  base_price?: number | null;
  currency?: string;
};

export type Branch = {
  id: number;
  name: string;
};

export type InventoryRow = {
  branch: string;
  item_code: string;
  item_name: string;
  qty: number;
};

export type DailySummary = {
  date: string;
  branch?: string | null;
  sales_count: number;
  revenue: number;
};

export type SaleRow = {
  doc_date?: string | null;
  branch: string;
  invoice_no?: string | null;
  customer_name?: string | null;
  mobile?: string | null;
  item_name: string;
  quantity: number;
  unit_price?: number | null;
  total?: number | null;
  line_key: string;
  classification?: string | null;
};

export type FlagRow = {
  flag_date: string;
  branch?: string | null;
  item_name?: string | null;
  invoice_no?: string | null;
  customer_name?: string | null;
  reason: string;
  severity: string;
  expected_unit_price?: number | null;
  actual_unit_price?: number | null;
  line_key?: string | null;
};

export type TransferLineRow = {
  item_code: string;
  item_name: string;
  qty: number;
};

export type TransferRow = {
  id: string;
  from_branch_name: string;
  to_branch_name: string;
  status: string;
  created_at?: string | null;
  line_count: number;
  lines: TransferLineRow[];
};

export type DailyRunStatus = {
  date: string;
  status: string;
};

export type InventorySetPayload = {
  branch: string;
  item_code: string;
  qty: number;
};

export type InventoryHistoryRow = {
  action_group_id: string;
  created_at: string;
  change_type: string;
  source: string;
  branch_name: string;
  product_code: string;
  product_name: string;
  old_qty: number;
  new_qty: number;
  qty_delta: number;
  related_branch_name?: string | null;
  is_reverted: boolean;
};

export type CategoryStatRow = {
  category: string;
  qty: number;
  revenue?: number | null;
  percent?: number | null;
};

export type ProductStatRow = {
  item_code: string;
  item_name: string;
  qty: number;
  revenue?: number | null;
  percent?: number | null;
};
