export interface SessionCurrentResponse {
  exists: boolean;
  opening_entry?: string;
  opening_time?: string;
  opening_amount?: number;
}

export interface SessionOpenResponse {
  opening_entry: string;
  period_start_time: string;
  status: string;
}

export interface SessionCloseResponse {
  closing_entry: string;
  expected_amount: number;
  difference: number;
  status: string;
}

export interface HeartbeatRequest {
  opening_entry: string;
  state: "cart_active" | "payment_open" | "idle";
}

export interface PosConfig {
  company: string;
  pos_profile: string;
  price_list: string;
  warehouse: string;
  currency: string;
  cost_center: string | null;
  payment_modes: string[];
}
