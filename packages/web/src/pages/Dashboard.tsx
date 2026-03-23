import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";

interface Vehicle {
  id: string;
  license_plate: string;
  make: string | null;
  color: string | null;
  tag_code?: string;
  tag_status?: string;
}

interface Tag {
  id: string;
  tag_code: string;
  qr_data_url: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creatingTag, setCreatingTag] = useState<string | null>(null);
  const [qrModal, setQrModal] = useState<Tag | null>(null);
  const [paymentModal, setPaymentModal] = useState<{
    tagId: string;
    tagCode: string;
  } | null>(null);
  const [payPhone, setPayPhone] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [payStatus, setPayStatus] = useState("");

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      const data = await api.getVehicles();
      setVehicles(data);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Authentication")) {
        navigate("/login");
        return;
      }
      setError("Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async (vehicleId: string) => {
    setCreatingTag(vehicleId);
    try {
      const tag = await api.createTag(vehicleId);
      setQrModal(tag);
      loadVehicles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tag");
    } finally {
      setCreatingTag(null);
    }
  };

  const handlePayment = async () => {
    if (!paymentModal || !payPhone) return;
    setPayLoading(true);
    setPayStatus("");
    try {
      await api.initiatePayment({
        tag_id: paymentModal.tagId,
        phone: payPhone,
      });
      setPayStatus("Check your phone for the M-Pesa prompt!");
      setTimeout(() => {
        setPaymentModal(null);
        setPayStatus("");
        loadVehicles();
      }, 5000);
    } catch (err) {
      setPayStatus(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPayLoading(false);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm("Remove this vehicle and its tag?")) return;
    try {
      await api.deleteVehicle(id);
      loadVehicles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">Loading...</div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">My Vehicles</h2>
        <Link
          to="/vehicles/new"
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold"
        >
          + Add Vehicle
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {vehicles.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <p className="text-gray-500 mb-4">
            No vehicles registered yet. Add your first vehicle to get a Car Park Tag.
          </p>
          <Link
            to="/vehicles/new"
            className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-semibold"
          >
            Add Vehicle
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {vehicles.map((v) => (
            <div key={v.id} className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg">{v.license_plate}</h3>
                  <p className="text-gray-500 text-sm">
                    {[v.color, v.make].filter(Boolean).join(" ") || "Vehicle"}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteVehicle(v.id)}
                  className="text-gray-400 hover:text-red-500 text-sm"
                >
                  Remove
                </button>
              </div>

              <div className="mt-4 pt-4 border-t">
                {v.tag_code ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {v.tag_code}
                      </span>
                      <span
                        className={`ml-2 text-xs px-2 py-1 rounded-full ${
                          v.tag_status === "active"
                            ? "bg-green-100 text-green-700"
                            : v.tag_status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {v.tag_status}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {v.tag_status === "pending" && (
                        <button
                          onClick={() =>
                            setPaymentModal({
                              tagId: v.id,
                              tagCode: v.tag_code!,
                            })
                          }
                          className="text-sm bg-success text-white px-3 py-1 rounded-lg"
                        >
                          Pay & Activate
                        </button>
                      )}
                      <a
                        href={`/api/tags/${v.id}/qr`}
                        download
                        className="text-sm text-primary font-medium"
                      >
                        Download QR
                      </a>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleCreateTag(v.id)}
                    disabled={creatingTag === v.id}
                    className="w-full bg-primary text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                  >
                    {creatingTag === v.id
                      ? "Generating..."
                      : "Generate Car Park Tag"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Modal */}
      {qrModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setQrModal(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg mb-2">Your Car Park Tag</h3>
            <p className="text-gray-500 text-sm mb-4">
              Tag Code: <span className="font-mono">{qrModal.tag_code}</span>
            </p>
            <img
              src={qrModal.qr_data_url}
              alt="QR Code"
              className="mx-auto mb-4 w-48 h-48"
            />
            <p className="text-sm text-gray-500 mb-4">
              Print this QR code and place it on your windshield. Pay KES 500 to
              activate it.
            </p>
            <button
              onClick={() => setQrModal(null)}
              className="bg-primary text-white px-6 py-2 rounded-lg"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setPaymentModal(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg mb-2">Activate Tag via M-Pesa</h3>
            <p className="text-gray-500 text-sm mb-4">
              Pay KES 500 to activate tag{" "}
              <span className="font-mono">{paymentModal.tagCode}</span>
            </p>
            <input
              type="tel"
              value={payPhone}
              onChange={(e) => setPayPhone(e.target.value)}
              placeholder="M-Pesa phone number (e.g. 0712345678)"
              className="w-full px-3 py-2 border rounded-lg mb-3"
            />
            {payStatus && (
              <div
                className={`text-sm p-3 rounded-lg mb-3 ${
                  payStatus.includes("Check")
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {payStatus}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setPaymentModal(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={payLoading || !payPhone}
                className="flex-1 bg-success text-white py-2 rounded-lg font-semibold disabled:opacity-50"
              >
                {payLoading ? "Processing..." : "Pay KES 500"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
