import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";

interface Vehicle {
  id: string;
  license_plate: string;
  make: string | null;
  color: string | null;
  item_type: string;
  tag_id?: string;
  tag_code?: string;
  tag_status?: string;
  tag_paused?: boolean;
  tag_message?: string;
}

interface Tag {
  id: string;
  tag_code: string;
  qr_data_url: string;
}

const ITEM_ICONS: Record<string, string> = {
  car: "\u{1F697}",
  bike: "\u{1F6B2}",
  luggage: "\u{1F9F3}",
  keys: "\u{1F511}",
  pet: "\u{1F43E}",
  other: "\u{1F4E6}",
};

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
  const [messageModal, setMessageModal] = useState<{
    tagId: string;
    tagCode: string;
    currentMessage: string;
  } | null>(null);
  const [customMsg, setCustomMsg] = useState("");

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      const data = await api.getVehicles();
      setVehicles(data as unknown as Vehicle[]);
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

  const handleTogglePause = async (tagId: string) => {
    try {
      await api.toggleTagPause(tagId);
      loadVehicles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update tag");
    }
  };

  const handleSaveMessage = async () => {
    if (!messageModal) return;
    try {
      await api.updateTagMessage(messageModal.tagId, customMsg);
      setMessageModal(null);
      loadVehicles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update message");
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
        <h2 className="text-xl font-bold">My Items</h2>
        <Link
          to="/vehicles/new"
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold"
        >
          + Add Item
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
          {error}
          <button onClick={() => setError("")} className="float-right font-bold">&times;</button>
        </div>
      )}

      {vehicles.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <p className="text-4xl mb-4">{ITEM_ICONS.car}</p>
          <p className="text-gray-500 mb-4">
            No items registered yet. Add your first vehicle or item to get a Smart Tag.
          </p>
          <Link
            to="/vehicles/new"
            className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-semibold"
          >
            Add Item
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {vehicles.map((v) => (
            <div key={v.id} className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{ITEM_ICONS[v.item_type] || ITEM_ICONS.other}</span>
                  <div>
                    <h3 className="font-bold text-lg">{v.license_plate}</h3>
                    <p className="text-gray-500 text-sm">
                      {[v.color, v.make].filter(Boolean).join(" ") || v.item_type}
                    </p>
                  </div>
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
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {v.tag_code}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            v.tag_paused
                              ? "bg-orange-100 text-orange-700"
                              : v.tag_status === "active"
                              ? "bg-green-100 text-green-700"
                              : v.tag_status === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {v.tag_paused ? "paused" : v.tag_status}
                        </span>
                      </div>
                    </div>

                    {/* Tag actions */}
                    <div className="flex flex-wrap gap-2">
                      {v.tag_status === "pending" && (
                        <span className="text-xs bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-lg">
                          Scan the QR code to activate & pay
                        </span>
                      )}

                      {v.tag_status === "active" && (
                        <button
                          onClick={() => handleTogglePause(v.tag_id!)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                            v.tag_paused
                              ? "bg-blue-600 text-white"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {v.tag_paused ? "Resume" : "Pause"}
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setMessageModal({
                            tagId: v.tag_id!,
                            tagCode: v.tag_code!,
                            currentMessage: v.tag_message || "",
                          });
                          setCustomMsg(v.tag_message || "");
                        }}
                        className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg font-medium"
                      >
                        {v.tag_message ? "Edit Message" : "Add Message"}
                      </button>

                      <a
                        href={`/api/tags/${v.tag_id}/qr`}
                        download
                        className="text-xs text-primary font-medium px-3 py-1.5"
                      >
                        Download QR
                      </a>
                    </div>

                    {v.tag_message && (
                      <div className="mt-3 text-xs text-gray-500 bg-blue-50 px-3 py-2 rounded-lg">
                        "{v.tag_message}"
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => handleCreateTag(v.id)}
                    disabled={creatingTag === v.id}
                    className="w-full bg-primary text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                  >
                    {creatingTag === v.id
                      ? "Generating..."
                      : "Generate Smart Tag"}
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
            <h3 className="font-bold text-lg mb-2">Your Smart Tag</h3>
            <p className="text-gray-500 text-sm mb-4">
              Tag Code: <span className="font-mono">{qrModal.tag_code}</span>
            </p>
            <img
              src={qrModal.qr_data_url}
              alt="QR Code"
              className="mx-auto mb-4 w-48 h-48"
            />
            <p className="text-sm text-gray-500 mb-4">
              Print this QR code and attach it to your item. Pay KES 500 to activate.
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
                className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold disabled:opacity-50"
              >
                {payLoading ? "Processing..." : "Pay KES 500"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Message Modal */}
      {messageModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setMessageModal(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg mb-2">Custom Message</h3>
            <p className="text-gray-500 text-sm mb-4">
              This message will be shown to anyone who scans tag{" "}
              <span className="font-mono">{messageModal.tagCode}</span>
            </p>
            <textarea
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              placeholder="e.g. If I'm blocking you, please call me. I'll move within 5 minutes."
              className="w-full px-3 py-2 border rounded-lg mb-3 text-sm"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setMessageModal(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMessage}
                className="flex-1 bg-primary text-white py-2 rounded-lg font-semibold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
