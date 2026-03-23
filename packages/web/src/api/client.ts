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
  register: (body: { full_name: string; phone: string; password: string; email?: string }) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(body) }),

  verifyOtp: (body: { phone: string; code: string; purpose: string }) =>
    request("/auth/verify-otp", { method: "POST", body: JSON.stringify(body) }),

  login: (body: { phone: string; password: string }) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(body) }),

  googleAuth: (credential: string) =>
    request<{
      message: string;
      user: {
        id: string;
        full_name: string;
        phone: string;
        email: string | null;
        phone_verified: boolean;
        lang_pref: string;
        avatar_url: string | null;
        needs_phone: boolean;
      };
    }>("/auth/google", { method: "POST", body: JSON.stringify({ credential }) }),

  logout: () => request("/auth/logout", { method: "POST" }),

  getProfile: () => request<{
    id: string;
    full_name: string;
    phone: string;
    email: string | null;
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
    item_type?: string;
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

  // Tag management
  toggleTagPause: (tagId: string) =>
    request(`/tags/${tagId}/pause`, { method: "PUT" }),

  updateTagMessage: (tagId: string, message: string) =>
    request(`/tags/${tagId}/message`, {
      method: "PUT",
      body: JSON.stringify({ message }),
    }),

  getPayments: () =>
    request<Array<{
      id: string;
      amount_kes: number;
      status: string;
      mpesa_receipt: string | null;
      created_at: string;
    }>>("/payments"),

  // Subscriptions
  getPlans: () => request<Array<{
    id: string; name: string; slug: string;
    price_kes: number; price_usd: number;
    interval_months: number; max_tags: number;
    features: string[];
  }>>("/plans"),

  getSubscription: () => request<{
    plan_slug: string; plan_name: string;
    max_tags: number; features: string[];
    expires_at?: string;
  }>("/subscription"),

  subscribe: (planSlug: string, paymentRef?: string) =>
    request("/subscription", {
      method: "POST",
      body: JSON.stringify({ plan_slug: planSlug, payment_ref: paymentRef }),
    }),

  // Stickers
  getStickerDesigns: () => request<Array<{
    slug: string; name: string; price_kes: number; description: string;
  }>>("/stickers/designs"),

  orderStickers: (body: {
    qty: number; design: string;
    shipping_name: string; shipping_phone: string;
    shipping_address: string; shipping_city: string;
  }) => request("/stickers/order", { method: "POST", body: JSON.stringify(body) }),

  getStickerOrders: () => request<Array<{
    id: string; qty: number; design: string;
    total_kes: number; status: string;
    tracking_no: string | null; created_at: string;
  }>>("/stickers/orders"),
};
