import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";

export default function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.login({ phone, password });
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-2">Car Park Tag</h1>
        <p className="text-gray-500 text-center mb-6">Sign in to manage your tags</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0712 345 678"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Don't have an account?{" "}
          <Link to="/register" className="text-primary font-medium">Register</Link>
        </p>
      </div>
    </div>
  );
}
