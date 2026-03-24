import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      navigate("/admin");
    } catch (err) { setError(err instanceof Error ? err.message : "Login failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-primary-dark flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.jpg" alt="LetsTag.me" className="h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-blue-300 mt-1">LetsTag.me Administration</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-primary rounded-2xl p-6 space-y-4 border border-white/10 shadow-xl">
          {error && <div className="bg-red-900/30 text-red-300 text-sm p-3 rounded-lg">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@smarttags.co.ke"
              className="w-full px-3 py-2.5 bg-primary-dark border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-gold focus:border-gold" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 bg-primary-dark border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-gold focus:border-gold" required />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-accent text-white py-3 rounded-lg font-bold hover:bg-accent-light disabled:opacity-50 transition-all shadow-md">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
