export const API_BASE_PATH = "/api/method/swift_core.api";

export const DEVICE_ID_KEY = "swift_pos_device_id";

export const HEARTBEAT_INTERVAL_MS = 30_000;

export const ROLES = {
  CASHIER: "Swift Cashier",
  STOREKEEPER: "Swift Storekeeper",
} as const;

export const ROUTES = {
  LOGIN: "/login",
  POS: "/pos",
  INVENTORY: "/inventory",
} as const;
