import apiClient from "./axios";
import { API_BASE_PATH } from "@/config/constants";

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
    apiClient.get(`${API_BASE_PATH}.item_by_barcode?barcode=${barcode}`),

  itemSearch: (q: string) =>
    apiClient.get(`${API_BASE_PATH}.item_search?q=${q}`),

  createInvoice: (payload: { items: any[], payments: any[], customer?: string }) =>
    apiClient.post(`${API_BASE_PATH}.create_invoice`, payload),

  getInvoice: (invoice_name: string) =>
    apiClient.get(`${API_BASE_PATH}.get_invoice?invoice_name=${invoice_name}`),

  createReturn: (invoice_name: string, items?: any[]) =>
    apiClient.post(`${API_BASE_PATH}.create_return`, { invoice_name, items }),

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
};
