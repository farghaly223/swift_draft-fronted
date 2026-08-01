export interface FrappeResponse<T> {
  message: T;
}

export interface FrappeError {
  exc_type?: string;
  exception?: string;
  _server_messages?: string;
}

export type ToastType = "success" | "error" | "warning" | "info";
