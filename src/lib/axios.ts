import axios from "axios";
import { env } from "@/config/env";
import { API_BASE_PATH } from "@/config/constants";
import { getOrCreateDeviceId } from "@/lib/utils";

const apiClient = axios.create({
  baseURL: env.FRAPPE_URL,
  withCredentials: true,
});

// Frappe requires X-Frappe-CSRF-Token on write requests when a session cookie
// is present. Without it the server rejects with 400 "Invalid Request" — which
// happens whenever another tab (e.g. the Frappe desk) has set a sid cookie.
let csrfToken: string | null = null;
let csrfInFlight: Promise<string | null> | null = null;
let csrfFetchFailed = false;

async function requestCsrfToken(): Promise<string | null> {
  try {
    const { data } = await axios.get(
      `${env.FRAPPE_URL}/api/method/frappe.sessions.get_csrf_token`,
      { withCredentials: true },
    );
    const token = data?.message;
    return typeof token === "string" && token ? token : null;
  } catch {
    // The write request will proceed without adding a header and Frappe will
    // return its normal CSRF error; no invalid fallback endpoint is attempted.
    return null;
  }
}

// De-duplicates concurrent fetches so a burst of writes only hits the server once.
function fetchCsrfToken(): Promise<string | null> {
  if (!csrfInFlight) {
    csrfInFlight = requestCsrfToken().finally(() => {
      csrfInFlight = null;
    });
  }
  return csrfInFlight;
}

export function setCsrfToken(token: string | null) {
  csrfToken = token;
  csrfFetchFailed = false;
}

// login is allow_guest and runs before a session exists — never gate it on CSRF.
function isAuthEndpoint(url: string) {
  return url.includes(`${API_BASE_PATH}.login`);
}

apiClient.interceptors.request.use(async (config) => {
  if (typeof window !== "undefined") {
    config.headers["X-Device-Id"] = getOrCreateDeviceId();
  }

  const isWrite =
    config.method === "post" || config.method === "put" || config.method === "delete";
  const url = config.url || "";

  if (isWrite && typeof window !== "undefined" && !isAuthEndpoint(url)) {
    if (!csrfToken && !csrfFetchFailed) {
      csrfToken = await fetchCsrfToken();
      csrfFetchFailed = !csrfToken;
    }
    if (csrfToken) {
      config.headers["X-Frappe-CSRF-Token"] = csrfToken;
    }
  }

  // Frappe whitelisted methods expect x-www-form-urlencoded for POST
  if (isWrite) {
    if (config.data && typeof config.data === "object" && !(config.data instanceof URLSearchParams) && !(config.data instanceof FormData)) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(config.data)) {
        if (value !== undefined && value !== null) {
          if (typeof value === "object") {
            params.append(key, JSON.stringify(value));
          } else {
            params.append(key, String(value));
          }
        }
      }
      config.data = params;
      config.headers["Content-Type"] = "application/x-www-form-urlencoded";
    }
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === "object" && "message" in response.data) {
      response.data = response.data.message;
    }
    return response;
  },
  async (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const url = error.config?.url || "";

      // Retry once ONLY on a confirmed CSRF failure. Frappe returns 400 for
      // ordinary validation errors too, so a blanket 400 retry would
      // double-submit writes (e.g. duplicate invoices). Match the CSRF message
      // specifically, and never retry a non-idempotent request blindly.
      const body = error.response?.data as any;
      const serverText = JSON.stringify(body?.exception ?? body?.message ?? "");
      const isCsrfFailure =
        status === 400 && /csrf/i.test(serverText);

      if (
        isCsrfFailure &&
        error.config &&
        !isAuthEndpoint(url) &&
        !(error.config as any).__csrfRetried
      ) {
        setCsrfToken(null);
        const fresh = await fetchCsrfToken();
        if (fresh) {
          csrfToken = fresh;
          csrfFetchFailed = false;
          const retryConfig = { ...error.config, __csrfRetried: true } as any;
          retryConfig.headers = {
            ...retryConfig.headers,
            "X-Frappe-CSRF-Token": fresh,
          };
          return apiClient.request(retryConfig);
        }
        csrfFetchFailed = true;
      }

      if (status === 401 && !isAuthEndpoint(url)) {
        setCsrfToken(null);
        const { useAuthStore } = require("@/stores/authStore");
        useAuthStore.getState().clearAuth();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
