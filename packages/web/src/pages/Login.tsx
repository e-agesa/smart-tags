import { useState, FormEvent, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";

export default function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: "",
          callback: handleGoogleResponse,
        });
        const btnEl = document.getElementById("google-signin-btn");
        if (btnEl) {
          window.google.accounts.id.renderButton(btnEl, {
            theme: "outline", size: "large", width: "100%", text: "signin_with",
          });
        }
      }
    };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  const handleGoogleResponse = async (response: { credential: string }) => {
    setError(""); setLoading(true);
    try { await api.googleAuth(response.credential); navigate("/dashboard"); }
    catch (err) { setError(err instanceof Error ? err.message : "Google sign-in failed"); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { await api.login({ phone, password }); navigate("/dashboard"); }
    catch (err) { setError(err instanceof Error ? err.message : "Login failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-primary-dark flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.jpg" alt="LetsTag.me" className="h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">LetsTag.me</h1>
          <p className="text-blue-300 mt-1">Sign in to manage your tags</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-accent text-sm p-3 rounded-lg border border-red-200">{error}</div>
          )}

          <div id="google-signin-btn" className="w-full"></div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or sign in with phone</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="0712 345 678"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all" required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-light disabled:opacity-50 transition-all shadow-md">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-blue-300 mt-4">
          Don't have an account?{" "}
          <Link to="/register" className="text-gold font-semibold hover:text-gold-light">Register</Link>
        </p>
      </div>
    </div>
  );
}
