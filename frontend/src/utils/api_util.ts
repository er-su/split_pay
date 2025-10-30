import type { Group, Transaction, User } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const OAUTH_URL = import.meta.env.VITE_OAUTH_URL ?? "/placeholder_for_now"; // update later 

type FetchOptions = RequestInit & { query?: Record<string, string | number | undefined> };

function buildUrl(path: string, query?: Record<string, any>) {
	// Given an API path along with query parameters, create a query url to perform an API request to
  const base = path.startsWith("http") ? path : `${API_BASE}${path}`;
  if (!query) return base;
  const params = new URLSearchParams();
  for (const k of Object.keys(query)) {
    const v = (query as any)[k];
    if (v !== undefined && v !== null) params.set(k, String(v));
  }
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

async function handle401Redirect() {
  try {
    // Ask backend for the actual Google login URL
    const res = await fetch(`${API_BASE}/auth/google/login`, {
      credentials: "include",
    });
    const data = await res.json();

    if (data?.auth_url) {
      window.location.href = data.auth_url;
      return;
    }
  } catch (err) {
    console.error("Failed to fetch login URL:", err);
  }

  // fallback (if something went wrong)
  window.location.href = `${API_BASE}/auth/google/login`;
}

export async function apiFetch<T = any>(path: string, opts: FetchOptions = {}): Promise<T> {
	// Given path and fetch options, perform an API call of a generic response type. Search up what FetchOptions are available
  const { query, ...rest } = opts;
  const url = buildUrl(path, query);
  const defaultHeaders: Record<string, string> = { "Accept": "application/json" };

  if (rest.body && !(rest.body instanceof FormData)) {
    defaultHeaders["Content-Type"] = "application/json";
  }
  const res = await fetch(url, {
    credentials: "include", // important: include cookies (HttpOnly)
    headers: { ...(rest.headers as any), ...defaultHeaders },
    ...rest,
  });

  if (res.status === 401) {
    // unauthorized -> redirect to OAuth
		// may need to update this later for more comprehensive validation
    await handle401Redirect();
    return Promise.reject(new Error("Unauthorized - redirecting to OAuth"));
  }

  // handle other fails
  const contentType = res.headers.get("content-type") || "";
  if (!res.ok) {
    // try to parse body as json, else text
    if (contentType.includes("application/json")) {
      const errJson = await res.json();
      return Promise.reject(errJson);
    } else {
      const txt = await res.text();
      return Promise.reject(new Error(txt || res.statusText));
    }
  }

  if (contentType.includes("application/json")) {
    return res.json();
  }
  // fallback
  return (await res.text()) as unknown as T;
}

export const api = {
	// collection of api endpoint shortcuts, import and use
  // Groups
  listGroups: () => apiFetch<Group[]>("/groups"),
  createGroup: (payload: Partial<Group>) => apiFetch<Group>("/groups", { method: "POST", body: JSON.stringify(payload) }),
  getGroup: (id: number) => apiFetch<Group>(`/groups/${id}`),

  // Transactions within a group 
  listTransactions: (groupId: number) => apiFetch<Transaction[]>(`/groups/${groupId}/transactions`),
  createTransaction: (groupId: number, payload: Partial<Transaction>) =>
    apiFetch<Transaction>(`/groups/${groupId}/transactions`, { method: "POST", body: JSON.stringify(payload) }),
  getTransaction: (txId: number) => apiFetch<Transaction>(`/transactions/${txId}`),

  // users / me
  me: () => apiFetch<User>("/me"),
};