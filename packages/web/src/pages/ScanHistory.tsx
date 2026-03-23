import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface ScanItem {
  id: string;
  tag_code: string;
  license_plate: string;
  source: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export default function ScanHistory() {
  const navigate = useNavigate();
  const [scans, setScans] = useState<ScanItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScans();
  }, []);

  const loadScans = async () => {
    try {
      const res = await fetch("/api/tags/scans", { credentials: "include" });
      if (res.status === 401) {
        navigate("/login");
        return;
      }
      const data = await res.json();
      setScans(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-KE", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Scan History</h2>

      {scans.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <p className="text-gray-500">No scans recorded yet. Once someone scans your tag, it will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scans.map((s) => (
            <div key={s.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                    {s.tag_code}
                  </span>
                  <span className="text-sm text-gray-600 ml-2">{s.license_plate}</span>
                </div>
                <span className="text-xs text-gray-400">{formatDate(s.created_at)}</span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{s.source}</span>
                {s.latitude && s.longitude && (
                  <a
                    href={`https://maps.google.com/?q=${s.latitude},${s.longitude}`}
                    target="_blank"
                    rel="noopener"
                    className="text-blue-600 hover:underline"
                  >
                    View location
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
