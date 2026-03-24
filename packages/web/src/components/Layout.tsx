import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { api } from "../api/client";

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await api.logout();
    navigate("/login");
  };

  const navItems = [
    { path: "/dashboard", label: "My Items" },
    { path: "/scans", label: "Scans" },
    { path: "/plans", label: "Plans" },
    { path: "/shop", label: "Shop" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-primary shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src="/logo.jpg" alt="LetsTag.me" className="h-8" />
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm text-blue-200 hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>
        <div className="max-w-2xl mx-auto px-4 flex gap-1 pb-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                location.pathname === item.path
                  ? "bg-white text-primary"
                  : "text-blue-200 hover:bg-white/10"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      <main className="max-w-2xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
