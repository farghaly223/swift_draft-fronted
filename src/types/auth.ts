export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: string;
  role: UserRole;
  full_name: string;
  sid: string;
}

export interface MeResponse {
  user: string;
  role: UserRole | null;
  full_name: string;
}

export type UserRole = "Swift Cashier" | "Swift Storekeeper" | "swift manager";
