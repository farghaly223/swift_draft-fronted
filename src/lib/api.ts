import apiClient from "./axios";
import { API_BASE_PATH } from "@/config/constants";

interface CreateInvoicePayload {
  items: { item_code: string; qty: number; rate: number }[];
  payments: { mode_of_payment: string; amount: number }[];
  customer?: string;
  customer_name?: string;
  mobile_no?: string;
  governorate?: string;
  notes?: string;
}

export const frappeApi = {
  // Auth
  login: (email: string, password: string) =>
    apiClient.post(`${API_BASE_PATH}.login`, { email, password }),

  logout: () =>
    apiClient.post(`${API_BASE_PATH}.logout`),

  me: () =>
    apiClient.get(`${API_BASE_PATH}.me`),

  // POS Session
  sessionCurrent: () =>
    apiClient.get(`${API_BASE_PATH}.session_current`),

  sessionOpen: (opening_amount: number) =>
    apiClient.post(`${API_BASE_PATH}.session_open`, { opening_amount }),

  sessionClose: (closing_amount: number) =>
    apiClient.post(`${API_BASE_PATH}.session_close`, { closing_amount }),

  sessionHeartbeat: (opening_entry: string, state: string) =>
    apiClient.post(`${API_BASE_PATH}.session_heartbeat`, { opening_entry, state }),

  // Items
  itemByBarcode: (barcode: string) =>
    apiClient.get(`${API_BASE_PATH}.item_by_barcode?barcode=${encodeURIComponent(barcode)}`),

  itemSearch: (q: string) =>
    apiClient.get(`${API_BASE_PATH}.item_search?q=${encodeURIComponent(q)}`),

  createInvoice: (payload: CreateInvoicePayload) =>
    apiClient.post(`${API_BASE_PATH}.create_invoice`, payload),

  getInvoice: (invoice_name: string) =>
    apiClient.get(`${API_BASE_PATH}.get_invoice?invoice_name=${invoice_name}`),

  createReturn: (invoice_name: string, items?: any[], reason?: string) =>
    apiClient.post(`${API_BASE_PATH}.create_return`, { invoice_name, items, reason }),

  // Inventory (Storekeeper)
  createItem: (payload: any) =>
    apiClient.post(`${API_BASE_PATH}.create_item`, payload),

  updateItem: (item_code: string, fields: any) =>
    apiClient.put(`${API_BASE_PATH}.update_item`, { item_code, ...fields }),

  validateBarcode: (barcode: string) =>
    apiClient.get(`${API_BASE_PATH}.validate_barcode?barcode=${barcode}`),

  addItemBarcode: (item_code: string, barcode: string) =>
    apiClient.post(`${API_BASE_PATH}.add_item_barcode`, { item_code, barcode }),

  removeItemBarcode: (item_code: string, barcode: string) =>
    apiClient.delete(`${API_BASE_PATH}.remove_item_barcode`, { data: { item_code, barcode } }),

  createStockEntry: (payload: any) =>
    apiClient.post(`${API_BASE_PATH}.create_stock_entry`, payload),

  getItem: (item_code: string) =>
    apiClient.get(`${API_BASE_PATH}.get_item?item_code=${encodeURIComponent(item_code)}`),

  uploadItemImage: (item_code: string, file: File) => {
    const form = new FormData();
    form.append("item_code", item_code);
    form.append("file", file);
    return apiClient.post(`${API_BASE_PATH}.upload_item_image`, form);
  },

  // Read-only
  listWarehouses: () =>
    apiClient.get(`${API_BASE_PATH}.list_warehouses`),

  listItemGroups: () =>
    apiClient.get(`${API_BASE_PATH}.list_item_groups`),

  listSuppliers: () =>
    apiClient.get(`${API_BASE_PATH}.list_suppliers`),

  // Import-only: non-group warehouses of the active company, plus the default
  // the server would otherwise pick. Distinct from listWarehouses, which other
  // screens consume as a bare array.
  listImportWarehouses: () =>
    apiClient.get(`${API_BASE_PATH}.list_import_warehouses`),

  posConfig: () =>
    apiClient.get(`${API_BASE_PATH}.pos_config`),

  createExpense: (payload: { amount: number; expense_account: string; remarks?: string }) =>
    apiClient.post(`${API_BASE_PATH}.create_expense`, payload),

  // Inventory import / export (Storekeeper)
  // The .xlsx is parsed server-side, so the browser only ships the raw file.
  // `warehouse` is the stock location the Storekeeper picked; the server
  // validates it and falls back to the configured default when omitted.
  inventoryImportPreview: (file: File, warehouse?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (warehouse) form.append("warehouse", warehouse);
    return apiClient.post(`${API_BASE_PATH}.inventory_import_preview`, form);
  },

  inventoryImportCommit: (file: File, warehouse?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (warehouse) form.append("warehouse", warehouse);
    return apiClient.post(`${API_BASE_PATH}.inventory_import_commit`, form);
  },

  inventoryList: (params: {
    search?: string;
    supplier?: string;
    barcode?: string;
    limit?: number;
    start?: number;
  }) =>
    apiClient.get(`${API_BASE_PATH}.inventory_list`, { params }),

  // Returns the raw .xlsx bytes — must not go through the JSON unwrapper.
  inventoryExport: (params: { search?: string; supplier?: string; barcode?: string }) =>
    apiClient.get(`${API_BASE_PATH}.inventory_export`, {
      params,
      responseType: "blob",
    }),

  updateInventoryItem: (payload: {
    item_code: string;
    item_name?: string;
    supplier?: string;
    cost_price?: number;
    selling_price?: number;
    barcode?: string;
    qty?: number;
  }) =>
    apiClient.put(`${API_BASE_PATH}.update_inventory_item`, payload),

  managerDashboardSummary: (from_date?: string, to_date?: string) =>
    apiClient.post(`${API_BASE_PATH}.manager_dashboard_summary`, {
      from_date,
      to_date,
    }),

  managerGetInvoice: (invoice_name: string) =>
    apiClient.get(`${API_BASE_PATH}.manager_get_invoice`, { params: { invoice_name } }),

  managerCustomerSearch: (search: string, start = 0, limit = 20) =>
    apiClient.get(`${API_BASE_PATH}.manager_customer_search`, { params: { search, start, limit } }),

  managerExportCustomers: (month?: string) =>
    apiClient.get(`${API_BASE_PATH}.manager_export_customers`, { params: { month }, responseType: "blob" }),

  createCashDrawerTransaction: (payload: {
    transaction_type: "Cash In" | "Cash Out" | "Adjustment";
    amount: number;
    reason: string;
    notes?: string;
    reference?: string;
  }) => apiClient.post(`${API_BASE_PATH}.create_cash_drawer_transaction`, payload),

  managerCreateUser: (payload: {
    full_name: string;
    email: string;
    phone: string;
    user_type: "cashier" | "storekeeper";
    password: string;
  }) => apiClient.post(`${API_BASE_PATH}.manager_create_user`, payload),

  managerListUsers: () => apiClient.get(`${API_BASE_PATH}.manager_list_users`),

  managerUpdateUser: (payload: {
    current_email: string;
    email?: string;
    password?: string;
  }) => apiClient.post(`${API_BASE_PATH}.manager_update_user`, payload),

  customerSearchAccess: (search: string) =>
    apiClient.get(`${API_BASE_PATH}.customer_search_access`, { params: { search } }),

  managerSetCustomerSearchAccess: (user_email: string, enabled: boolean) =>
    apiClient.post(`${API_BASE_PATH}.manager_set_customer_search_access`, { user_email, enabled: enabled ? 1 : 0 }),

  managerExpenseAccounts: () => apiClient.get(`${API_BASE_PATH}.manager_expense_accounts`),

  managerCreateExpenseAccount: (account_name: string, parent_account: string) =>
    apiClient.post(`${API_BASE_PATH}.manager_create_expense_account`, { account_name, parent_account }),

  managerSetExpenseAccountEnabled: (account: string, enabled: boolean) =>
    apiClient.post(`${API_BASE_PATH}.manager_set_expense_account_enabled`, { account, enabled: enabled ? 1 : 0 }),

  managerCreateExpense: (payload: { amount: number; expense_date: string; expense_account: string; paid_from_account: string; description?: string; reference?: string }) =>
    apiClient.post(`${API_BASE_PATH}.manager_create_expense`, payload),
};
