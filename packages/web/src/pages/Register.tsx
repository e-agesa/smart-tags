import { useState, FormEvent, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";

type Step = "details" | "otp";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, config: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("details");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true; script.defer = true;
    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({ client_id: "", callback: handleGoogleResponse });
        const btnEl = document.getElementById("google-signin-btn");
        if (btnEl) window.google.accounts.id.renderButton(btnEl, { theme: "outline", size: "large", width: "100%", text: "signup_with" });
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

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { await api.register({ full_name: fullName, phone, password, email: email || undefined }); setStep("otp"); }
    catch (err) { setError(err instanceof Error ? err.message : "Registration failed"); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      await api.verifyOtp({ phone, code: otp, purpose: "registration" });
      await api.login({ phone, password });
      navigate("/dashboard");
    } catch (err) { setError(err instanceof Error ? err.message : "Verification failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-primary-dark flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.jpg" alt="LetsTag.me" className="h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">Get Your Smart Tag</h1>
          <p className="text-blue-300 mt-1">
            {step === "details" ? "Create your account — 1 month free!" : "Verify your phone number"}
          </p>
          {step === "details" && (
            <div className="inline-block mt-2 bg-gold/20 text-gold text-xs font-semibold px-3 py-1 rounded-full">
              1 Month Free Trial Included
            </div>
          )}
        </div>

        {step === "details" ? (
          <div className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
            {error && <div className="bg-red-50 text-accent text-sm p-3 rounded-lg border border-red-200">{error}</div>}
            <div id="google-signin-btn" className="w-full"></div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
              <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">or register with phone</span></div>
            </div>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Kamau"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary" minLength={6} required />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-accent text-white py-3 rounded-lg font-semibold hover:bg-accent-light disabled:opacity-50 transition-all shadow-md">
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>
          </div>
        ) : (
          <form onSubmit={handleVerifyOtp} className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
            {error && <div className="bg-red-50 text-accent text-sm p-3 rounded-lg border border-red-200">{error}</div>}
            <p className="text-sm text-gray-600">We sent a 6-digit code to <strong>{phone}</strong></p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">OTP Code</label>
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" maxLength={6}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary text-center text-2xl tracking-widest" required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-light disabled:opacity-50 transition-all shadow-md">
              {loading ? "Verifying..." : "Verify & Continue"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-blue-300 mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-gold font-semibold hover:text-gold-light">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
