import { Outlet, Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";

export default function Layout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await api.logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/dashboard" className="text-lg font-bold text-primary">
            Car Park Tag
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Logout
          </button>
        </div>
      </nav>
      <main className="max-w-2xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
