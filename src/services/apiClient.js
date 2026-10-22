import axios from "axios";
import { getIdToken, logout } from "./authService";

/**
 * Central Axios instance for all Barbican backend API calls.
 *
 * Defaults to the same-origin `/api`: in development Vite proxies it to the Spring
 * Boot server (see vite.config.js), and in production Spring Boot serves this app
 * itself. Set VITE_API_BASE_URL only when the API lives on a different origin.
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  headers: { "Content-Type": "application/json" },
  // Generous: a free-tier host can take up to a minute to wake from sleep.
  timeout: 60000,
});

// Attach the Firebase ID token to every request. The backend verifies its
// signature and reads the caller's identity and role from the token's claims,
// so nothing about who we are is sent in the body or a custom header.
apiClient.interceptors.request.use(async (config) => {
  const token = await getIdToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Uniform error extraction, with one retry on an expired token.
apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err.response?.status;
    const original = err.config;

    // A token can expire mid-flight. Force a refresh and replay the request once;
    // if it still fails the session is genuinely gone, so sign out.
    if (status === 401 && original && !original._retried) {
      original._retried = true;
      const fresh = await getIdToken(true).catch(() => null);
      if (fresh) {
        original.headers.Authorization = `Bearer ${fresh}`;
        return apiClient(original);
      }
      await logout().catch(() => {});
    }

    const message = err.response
      ? err.response.data?.message || `Request failed (${status}).`
      : "Cannot reach the server. Check that the backend is running and try again.";
    return Promise.reject(new Error(message));
  }
);

export default apiClient;

/* ── Typed API helpers ── */

export const authApi = {
  // No login call — sign-in happens against Firebase directly (see authService).
  // This resolves the profile behind the token we just obtained.
  me: () => apiClient.get("/auth/me").then((r) => r.data),
};

export const vehiclesApi = {
  list: ()                     => apiClient.get("/vehicles").then((r) => r.data.data),
  create: (vehicle)            => apiClient.post("/vehicles", vehicle).then((r) => r.data),
  update: (id, vehicle)        => apiClient.put(`/vehicles/${id}`, vehicle).then((r) => r.data),
  toggle: (id)                 => apiClient.put(`/vehicles/${id}/toggle`).then((r) => r.data),
  remove: (id)                 => apiClient.delete(`/vehicles/${id}`).then((r) => r.data),
};

// A refused movement (unregistered, duplicate, full…) comes back as 422 with the
// raised alert in the body — an expected outcome, so resolve rather than throw.
const movementOutcome = { validateStatus: (s) => (s >= 200 && s < 300) || s === 422 };

export const movementsApi = {
  entry: (regNo, gate) =>
    apiClient.post("/movements/entry", { regNo, gate }, movementOutcome).then((r) => r.data),
  exit: (regNo, gate) =>
    apiClient.post("/movements/exit", { regNo, gate }, movementOutcome).then((r) => r.data),
};

export const alertsApi = {
  resolve: (id)                => apiClient.put(`/alerts/${id}/resolve`).then((r) => r.data),
};

export const configApi = {
  save: (config)               => apiClient.put("/configuration", config).then((r) => r.data),
};

export const usersApi = {
  list: ()                     => apiClient.get("/users").then((r) => r.data.data),
  create: (user)               => apiClient.post("/users", user).then((r) => r.data),
  update: (id, user)           => apiClient.put(`/users/${id}`, user).then((r) => r.data),
  resetPassword: (id)          => apiClient.put(`/users/${id}/reset-password`).then((r) => r.data),
  toggle: (id)                 => apiClient.put(`/users/${id}/toggle`).then((r) => r.data),
};
