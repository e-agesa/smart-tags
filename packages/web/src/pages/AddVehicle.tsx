import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

export default function AddVehicle() {
  const navigate = useNavigate();
  const [licensePlate, setLicensePlate] = useState("");
  const [make, setMake] = useState("");
  const [color, setColor] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.addVehicle({
        license_plate: licensePlate,
        make: make || undefined,
        color: color || undefined,
      });
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add vehicle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Add Vehicle</h2>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm p-6 space-y-4"
      >
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            License Plate *
          </label>
          <input
            type="text"
            value={licensePlate}
            onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
            placeholder="KDA 123X"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary uppercase"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Make / Model
          </label>
          <input
            type="text"
            value={make}
            onChange={(e) => setMake(e.target.value)}
            placeholder="Toyota Vitz"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Color
          </label>
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="White"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary text-white py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add Vehicle"}
          </button>
        </div>
      </form>
    </div>
  );
}
