export interface User {
  id: string;
  full_name: string;
  phone: string;
  phone_verified: boolean;
  emergency_phone: string | null;
  emergency_name: string | null;
  password_hash: string;
  lang_pref: string;
  created_at: Date;
  updated_at: Date;
}

export interface Vehicle {
  id: string;
  user_id: string;
  license_plate: string;
  make: string | null;
  color: string | null;
  created_at: Date;
}

export interface Tag {
  id: string;
  vehicle_id: string;
  tag_code: string;
  qr_data_url: string | null;
  status: "pending" | "active" | "suspended" | "expired";
  activated_at: Date | null;
  expires_at: Date | null;
  created_at: Date;
}

export interface ScanSession {
  id: string;
  tag_id: string;
  scanner_ip: string | null;
  scanner_phone: string | null;
  source: "qr" | "sms" | "whatsapp";
  created_at: Date;
}

export interface Communication {
  id: string;
  scan_session_id: string;
  type: "call" | "sms" | "whatsapp";
  target: "owner" | "emergency";
  at_session_id: string | null;
  status: string | null;
  duration_secs: number | null;
  cost_kes: number | null;
  created_at: Date;
}

export interface Payment {
  id: string;
  user_id: string;
  tag_id: string | null;
  amount_kes: number;
  mpesa_checkout_id: string | null;
  mpesa_receipt: string | null;
  phone_used: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  description: string | null;
  created_at: Date;
  completed_at: Date | null;
}

export interface AdminUser {
  id: string;
  email: string;
  password_hash: string;
  role: "viewer" | "manager" | "superadmin";
  created_at: Date;
}

export interface OtpCode {
  id: string;
  phone: string;
  code: string;
  purpose: "registration" | "login";
  expires_at: Date;
  used: boolean;
  created_at: Date;
}

// JWT payload types
export interface UserJwtPayload {
  userId: string;
  phone: string;
}

export interface AdminJwtPayload {
  adminId: string;
  email: string;
  role: string;
}
