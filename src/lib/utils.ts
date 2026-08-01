import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import axios from "axios";
import { DEVICE_ID_KEY } from "@/config/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function extractFrappeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (data?._server_messages) {
      try {
        const messages = JSON.parse(data._server_messages);
        const first = JSON.parse(messages[0]);
        return first.message || first;
      } catch {
        /* fall through */
      }
    }

    if (data?.exception) {
      const line = data.exception.split("\n")[0];
      const cleaned = line.replace(/^.*?:\s*/, "");
      return cleaned || line;
    }

    if (typeof data?.message === "string") {
      return data.message;
    }

    return error.response?.statusText || "An error occurred";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred";
}
