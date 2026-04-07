const API_BASE = "http://localhost:8080";

export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(t) {
  if (t) localStorage.setItem("token", t);
  else localStorage.removeItem("token");
}

async function request(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  health: () => request("/api/health"),

  // Auth
  sendSignupOtp: (email, password) => request("/api/auth/send-signup-otp", { method: "POST", body: { email, password } }),
  verifySignup: (email, otp) => request("/api/auth/verify-signup", { method: "POST", body: { email, otp } }),
  login: (email, password) => request("/api/auth/login", { method: "POST", body: { email, password } }),
  forgotPassword: (email) => request("/api/auth/forgot-password", { method: "POST", body: { email } }),
  resetPassword: (email, otp, newPassword) => request("/api/auth/reset-password", { method: "POST", body: { email, otp, newPassword } }),
  me: () => request("/api/auth/me"),
  setOccurrenceStatus: (id, date, status) => request(`/api/tasks/${id}/set-occurrence-status`, {method: "POST", body: { date, status },}),
  listTasks: (date) => request(date ? `/api/tasks?date=${encodeURIComponent(date)}` : "/api/tasks"),
  getTask: (id) => request(`/api/tasks/${id}`),
  createTask: (payload) => request("/api/tasks", { method: "POST", body: payload }),
  updateTask: (id, payload) => request(`/api/tasks/${id}`, { method: "PUT", body: payload }),
  deleteTask: (id) => request(`/api/tasks/${id}`, { method: "DELETE" }),
  toggleComplete: (id, date) => request(`/api/tasks/${id}/toggle-complete`, { method: "POST", body: { date } }),
};