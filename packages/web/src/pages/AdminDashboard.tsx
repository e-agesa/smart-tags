import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

type Tab = "overview" | "users" | "scans" | "payments" | "gateways" | "orders";

interface Summary {
  totalUsers: number; activeTags: number; totalScans: number; scansToday: number;
  totalRevenue: number; completedPayments: number; stickerOrders: number;
  activeChats: number; newUsersWeek: number; scansWeek: number;
}

async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api/admin${path}`, { credentials: "include", ...options,
    headers: { "Content-Type": "application/json", ...options?.headers } });
  if (res.status === 401) throw new Error("AUTH");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data as T;
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-primary rounded-xl border border-white/10 p-5">
      <div className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">{label}</div>
      <div className={`text-2xl font-bold ${color || "text-white"}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

function MiniChart({ data, height = 60 }: { data: number[]; height?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-px" style={{ height }}>
      {data.map((v, i) => (
        <div key={i} className="flex-1 bg-gold/60 rounded-t-sm hover:bg-gold transition-all"
          style={{ height: `${(v / max) * 100}%`, minHeight: v > 0 ? 2 : 0 }}
          title={String(v)} />
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [scanData, setScanData] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [scans, setScans] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [gateways, setGateways] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editGw, setEditGw] = useState<any>(null);
  const [gwConfig, setGwConfig] = useState<Record<string, string>>({});
  const [gwEnabled, setGwEnabled] = useState(false);

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === "overview") {
        const [s, rev, sc, usr] = await Promise.all([
          adminFetch<Summary>("/reports/summary"),
          adminFetch<any[]>("/reports/revenue?days=30"),
          adminFetch<any>("/reports/scans?days=30"),
          adminFetch<any>("/reports/users?days=30"),
        ]);
        setSummary(s);
        setRevenueData(rev);
        setScanData(sc);
        setUserData(usr);
      }
      if (tab === "users") {
        const data = await adminFetch<{ data: any[] }>(`/registrations?limit=50${search ? `&search=${encodeURIComponent(search)}` : ""}`);
        setUsers(data.data);
      }
      if (tab === "scans") {
        const data = await adminFetch<{ data: any[] }>("/scans?limit=50");
        setScans(data.data);
      }
      if (tab === "payments") {
        const data = await adminFetch<{ data: any[] }>("/payments?limit=50");
        setPayments(data.data);
      }
      if (tab === "gateways") {
        const data = await adminFetch<{ data: any[] }>("/gateways");
        setGateways(data.data);
      }
      if (tab === "orders") {
        const data = await adminFetch<{ data: any[] }>("/orders");
        setOrders(data.data);
      }
    } catch (err) {
      if (err instanceof Error && err.message === "AUTH") { navigate("/admin/login"); return; }
    } finally { setLoading(false); }
  };

  const saveGateway = async () => {
    if (!editGw) return;
    await adminFetch(`/gateways/${editGw.slug}`, {
      method: "PUT",
      body: JSON.stringify({ config: gwConfig, is_enabled: gwEnabled }),
    });
    setEditGw(null);
    loadData();
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString("en-KE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "users", label: "Users" },
    { key: "scans", label: "Scans" },
    { key: "payments", label: "Payments" },
    { key: "gateways", label: "Gateways" },
    { key: "orders", label: "Orders" },
  ];

  return (
    <div className="min-h-screen bg-primary-dark text-white">
      <nav className="bg-primary border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-lg font-bold text-gold">Smart Tags Admin</span>
          <button onClick={() => navigate("/admin/login")} className="text-sm text-gray-400 hover:text-white">Logout</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-primary rounded-lg p-1 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all ${tab === t.key ? "bg-accent text-white" : "text-gray-400 hover:text-white"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : (
          <>
            {/* ===== OVERVIEW ===== */}
            {tab === "overview" && summary && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <StatCard label="Total Users" value={summary.totalUsers} sub={`+${summary.newUsersWeek} this week`} />
                  <StatCard label="Active Tags" value={summary.activeTags} />
                  <StatCard label="Total Scans" value={summary.totalScans} sub={`${summary.scansToday} today`} />
                  <StatCard label="Revenue" value={`KES ${summary.totalRevenue.toLocaleString()}`} color="text-green-400" sub={`${summary.completedPayments} payments`} />
                  <StatCard label="Active Chats" value={summary.activeChats} sub={`${summary.stickerOrders} sticker orders`} />
                </div>

                {/* Revenue chart */}
                <div className="bg-primary rounded-xl border border-white/10 p-5">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Revenue (30 days)</h3>
                  <MiniChart data={revenueData.map((d: any) => parseFloat(d.revenue || 0))} height={80} />
                  <div className="flex justify-between mt-2 text-xs text-gray-600">
                    <span>{revenueData[0]?.date?.slice(5) || ""}</span>
                    <span>{revenueData[revenueData.length - 1]?.date?.slice(5) || ""}</span>
                  </div>
                </div>

                {/* Scans chart */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-primary rounded-xl border border-white/10 p-5">
                    <h3 className="text-sm font-semibold text-gray-400 mb-3">Scans (30 days)</h3>
                    <MiniChart data={scanData?.daily?.map((d: any) => parseInt(d.scans)) || []} height={80} />
                  </div>
                  <div className="bg-primary rounded-xl border border-white/10 p-5">
                    <h3 className="text-sm font-semibold text-gray-400 mb-3">Top Scanned Tags</h3>
                    {scanData?.topTags?.map((t: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-white/10/50 last:border-0">
                        <div>
                          <span className="font-mono text-xs text-gold">{t.tag_code}</span>
                          <span className="text-gray-500 text-xs ml-2">{t.license_plate}</span>
                        </div>
                        <span className="text-sm font-semibold">{t.scan_count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* User growth + plan distribution */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-primary rounded-xl border border-white/10 p-5">
                    <h3 className="text-sm font-semibold text-gray-400 mb-3">New Users (30 days)</h3>
                    <MiniChart data={userData?.growth?.map((d: any) => parseInt(d.new_users)) || []} height={60} />
                  </div>
                  <div className="bg-primary rounded-xl border border-white/10 p-5">
                    <h3 className="text-sm font-semibold text-gray-400 mb-3">Plan Distribution</h3>
                    {userData?.planDistribution?.map((p: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-2">
                        <span className="text-sm">{p.plan}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-primary-light rounded-full overflow-hidden">
                            <div className="h-full bg-gold rounded-full" style={{ width: `${(p.users / summary.totalUsers) * 100}%` }} />
                          </div>
                          <span className="text-sm font-semibold w-8 text-right">{p.users}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ===== USERS ===== */}
            {tab === "users" && (
              <div>
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadData()}
                  placeholder="Search by name or phone..." className="w-full max-w-md px-4 py-2 bg-primary border border-white/10 rounded-lg text-white text-sm mb-4" />
                <div className="bg-primary rounded-xl border border-white/10 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-white/10 text-gray-400">
                      <th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Phone</th>
                      <th className="text-left px-4 py-3">Verified</th><th className="text-left px-4 py-3">Vehicles</th>
                      <th className="text-left px-4 py-3">Joined</th>
                    </tr></thead>
                    <tbody>{users.map((u) => (
                      <tr key={u.id} className="border-b border-white/10/50 hover:bg-primary-light/30">
                        <td className="px-4 py-3 font-medium">{u.full_name}</td>
                        <td className="px-4 py-3 text-gray-400">{u.phone}</td>
                        <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${u.phone_verified ? "bg-green-900/40 text-green-400" : "bg-yellow-900/40 text-yellow-400"}`}>{u.phone_verified ? "Yes" : "No"}</span></td>
                        <td className="px-4 py-3 text-gray-400">{u.vehicle_count}</td>
                        <td className="px-4 py-3 text-gray-500">{fmt(u.created_at)}</td>
                      </tr>
                    ))}{users.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No users found</td></tr>}</tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ===== SCANS ===== */}
            {tab === "scans" && (
              <div className="bg-primary rounded-xl border border-white/10 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-white/10 text-gray-400">
                    <th className="text-left px-4 py-3">Tag</th><th className="text-left px-4 py-3">Vehicle</th>
                    <th className="text-left px-4 py-3">Source</th><th className="text-left px-4 py-3">Action</th>
                    <th className="text-left px-4 py-3">Time</th>
                  </tr></thead>
                  <tbody>{scans.map((s) => (
                    <tr key={s.id} className="border-b border-white/10/50 hover:bg-primary-light/30">
                      <td className="px-4 py-3 font-mono text-gold text-xs">{s.tag_code}</td>
                      <td className="px-4 py-3"><span className="font-medium">{s.license_plate}</span><span className="text-gray-500 ml-2 text-xs">{[s.color, s.make].filter(Boolean).join(" ")}</span></td>
                      <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/40 text-gold">{s.source}</span></td>
                      <td className="px-4 py-3 text-gray-400">{s.comm_type || "view"}</td>
                      <td className="px-4 py-3 text-gray-500">{fmt(s.created_at)}</td>
                    </tr>
                  ))}{scans.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No scans yet</td></tr>}</tbody>
                </table>
              </div>
            )}

            {/* ===== PAYMENTS ===== */}
            {tab === "payments" && (
              <div className="bg-primary rounded-xl border border-white/10 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-white/10 text-gray-400">
                    <th className="text-left px-4 py-3">User</th><th className="text-left px-4 py-3">Tag</th>
                    <th className="text-left px-4 py-3">Amount</th><th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Receipt</th><th className="text-left px-4 py-3">Date</th>
                  </tr></thead>
                  <tbody>{payments.map((p) => (
                    <tr key={p.id} className="border-b border-white/10/50 hover:bg-primary-light/30">
                      <td className="px-4 py-3 font-medium">{p.full_name}</td>
                      <td className="px-4 py-3 font-mono text-gold text-xs">{p.tag_code || "\u2014"}</td>
                      <td className="px-4 py-3">KES {p.amount_kes}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${p.status === "completed" ? "bg-green-900/40 text-green-400" : p.status === "failed" ? "bg-red-900/40 text-red-400" : "bg-yellow-900/40 text-yellow-400"}`}>{p.status}</span></td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{p.mpesa_receipt || "\u2014"}</td>
                      <td className="px-4 py-3 text-gray-500">{fmt(p.created_at)}</td>
                    </tr>
                  ))}{payments.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No payments yet</td></tr>}</tbody>
                </table>
              </div>
            )}

            {/* ===== GATEWAYS ===== */}
            {tab === "gateways" && (
              <div className="space-y-4">
                <p className="text-gray-400 text-sm mb-2">Configure payment gateway API keys. Enable gateways to make them available to users.</p>
                {gateways.map((gw) => (
                  <div key={gw.slug} className={`bg-primary rounded-xl border p-5 ${gw.is_enabled ? "border-green-700" : "border-white/10"}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold">{gw.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${gw.is_enabled ? "bg-green-900/40 text-green-400" : "bg-primary-light text-gray-500"}`}>
                          {gw.is_enabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                      <button onClick={() => { setEditGw(gw); setGwConfig(gw.config || {}); setGwEnabled(gw.is_enabled); }}
                        className="text-sm bg-primary-light text-gray-300 px-3 py-1.5 rounded-lg hover:bg-primary-light">
                        Configure
                      </button>
                    </div>
                    <div className="text-xs text-gray-500">
                      Currencies: {gw.supported_currencies?.join(", ") || "N/A"}
                    </div>
                  </div>
                ))}

                {/* Edit modal */}
                {editGw && (
                  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setEditGw(null)}>
                    <div className="bg-primary rounded-2xl p-6 max-w-lg w-full border border-white/10" onClick={(e) => e.stopPropagation()}>
                      <h3 className="font-bold text-lg mb-4">{editGw.name} Configuration</h3>
                      <div className="space-y-3 mb-4">
                        {Object.keys(editGw.config || {}).map((key) => (
                          <div key={key}>
                            <label className="block text-xs text-gray-400 mb-1 font-medium">{key.replace(/_/g, " ").toUpperCase()}</label>
                            <input type={key.includes("secret") || key.includes("passkey") ? "password" : "text"}
                              value={gwConfig[key] || ""}
                              onChange={(e) => setGwConfig({ ...gwConfig, [key]: e.target.value })}
                              className="w-full px-3 py-2 bg-primary-dark border border-white/10 rounded-lg text-white text-sm" />
                          </div>
                        ))}
                      </div>
                      <label className="flex items-center gap-2 mb-4 cursor-pointer">
                        <input type="checkbox" checked={gwEnabled} onChange={(e) => setGwEnabled(e.target.checked)}
                          className="w-4 h-4 rounded" />
                        <span className="text-sm">Enable this gateway</span>
                      </label>
                      <div className="flex gap-3">
                        <button onClick={() => setEditGw(null)} className="flex-1 bg-primary-light text-gray-300 py-2.5 rounded-lg">Cancel</button>
                        <button onClick={saveGateway} className="flex-1 bg-accent text-white py-2.5 rounded-lg font-semibold">Save</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===== ORDERS ===== */}
            {tab === "orders" && (
              <div className="bg-primary rounded-xl border border-white/10 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-white/10 text-gray-400">
                    <th className="text-left px-4 py-3">Customer</th><th className="text-left px-4 py-3">Design</th>
                    <th className="text-left px-4 py-3">Qty</th><th className="text-left px-4 py-3">Total</th>
                    <th className="text-left px-4 py-3">City</th><th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Date</th>
                  </tr></thead>
                  <tbody>{orders.map((o) => (
                    <tr key={o.id} className="border-b border-white/10/50 hover:bg-primary-light/30">
                      <td className="px-4 py-3"><div className="font-medium">{o.shipping_name || o.full_name}</div><div className="text-xs text-gray-500">{o.shipping_phone || o.phone}</div></td>
                      <td className="px-4 py-3 capitalize">{o.design}</td>
                      <td className="px-4 py-3">{o.qty}</td>
                      <td className="px-4 py-3">KES {o.total_kes}</td>
                      <td className="px-4 py-3 text-gray-400">{o.shipping_city}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${o.status === "delivered" ? "bg-green-900/40 text-green-400" : o.status === "shipped" ? "bg-blue-900/40 text-gold" : "bg-yellow-900/40 text-yellow-400"}`}>{o.status}</span></td>
                      <td className="px-4 py-3 text-gray-500">{fmt(o.created_at)}</td>
                    </tr>
                  ))}{orders.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No orders yet</td></tr>}</tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
