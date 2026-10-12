// All backend calls go through here. The AI key never reaches the browser: the client only talks to our API.
const BASE = import.meta.env.VITE_API_URL || "/api";

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error?.message || "Request failed");
    this.status = status;
    this.code = body?.error?.code;
    this.details = body?.error?.details;
  }
}

export const getToken = () => localStorage.getItem("bl_token");

async function request(path, { method = "GET", body } = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) {
      localStorage.removeItem("bl_token");
      window.location.assign("/login");
    }
    throw new ApiError(res.status, data);
  }
  return data;
}

const qs = (params) => {
  const p = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
  return p.toString() ? `?${p}` : "";
};

export const api = {
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password } }),
  me: () => request("/auth/me"),
  books: () => request("/books"),
  tickets: (filters = {}) => request(`/tickets${qs(filters)}`),
  ticket: (id, since) => request(`/tickets/${id}${qs({ since })}`),
  createTicket: (body) => request("/tickets", { method: "POST", body }),
  sendMessage: (id, body) => request(`/tickets/${id}/messages`, { method: "POST", body }),
  updateTicket: (id, body) => request(`/tickets/${id}`, { method: "PATCH", body }),
  addNote: (id, body) => request(`/tickets/${id}/notes`, { method: "POST", body: { body } }),
  draft: (id, refresh = false) => request(`/tickets/${id}/draft${refresh ? "?refresh=true" : ""}`, { method: "POST" }),
};
