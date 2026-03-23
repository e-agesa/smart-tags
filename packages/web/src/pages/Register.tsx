import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";

type Step = "details" | "otp";

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("details");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.register({ full_name: fullName, phone, password });
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.verifyOtp({ phone, code: otp, purpose: "registration" });
      // Auto-login after verification
      await api.login({ phone, password });
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-2">Get Your Car Park Tag</h1>
        <p className="text-gray-500 text-center mb-6">
          {step === "details" ? "Create your account" : "Verify your phone number"}
        </p>

        {step === "details" ? (
          <form onSubmit={handleRegister} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Kamau"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0712 345 678"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                minLength={6}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
            )}
            <p className="text-sm text-gray-600">
              We sent a 6-digit code to <strong>{phone}</strong>
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">OTP Code</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary text-center text-2xl tracking-widest"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify & Continue"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
