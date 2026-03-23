const API_BASE = "/api";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data as T;
}

export const api = {
  // Auth
  register: (body: { full_name: string; phone: string; password: string }) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(body) }),

  verifyOtp: (body: { phone: string; code: string; purpose: string }) =>
    request("/auth/verify-otp", { method: "POST", body: JSON.stringify(body) }),

  login: (body: { phone: string; password: string }) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(body) }),

  logout: () => request("/auth/logout", { method: "POST" }),

  getProfile: () => request<{
    id: string;
    full_name: string;
    phone: string;
    phone_verified: boolean;
    emergency_phone: string | null;
    emergency_name: string | null;
    lang_pref: string;
  }>("/auth/me"),

  updateProfile: (body: Record<string, string>) =>
    request("/auth/me", { method: "PUT", body: JSON.stringify(body) }),

  // Vehicles
  getVehicles: () =>
    request<Array<{
      id: string;
      license_plate: string;
      make: string | null;
      color: string | null;
      tag_code?: string;
      tag_status?: string;
    }>>("/vehicles"),

  addVehicle: (body: {
    license_plate: string;
    make?: string;
    color?: string;
  }) => request("/vehicles", { method: "POST", body: JSON.stringify(body) }),

  deleteVehicle: (id: string) =>
    request(`/vehicles/${id}`, { method: "DELETE" }),

  // Tags
  createTag: (vehicleId: string) =>
    request<{ id: string; tag_code: string; qr_data_url: string }>(
      "/tags",
      { method: "POST", body: JSON.stringify({ vehicle_id: vehicleId }) }
    ),

  // Payments
  initiatePayment: (body: { tag_id: string; phone: string }) =>
    request("/payments/initiate", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getPayments: () =>
    request<Array<{
      id: string;
      amount_kes: number;
      status: string;
      mpesa_receipt: string | null;
      created_at: string;
    }>>("/payments"),
};
