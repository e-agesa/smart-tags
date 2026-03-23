import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

const ITEM_TYPES = [
  { value: "car", label: "Car", icon: "\u{1F697}" },
  { value: "bike", label: "Bike / Motorcycle", icon: "\u{1F6B2}" },
  { value: "luggage", label: "Luggage / Bag", icon: "\u{1F9F3}" },
  { value: "keys", label: "Keys", icon: "\u{1F511}" },
  { value: "pet", label: "Pet", icon: "\u{1F43E}" },
  { value: "other", label: "Other", icon: "\u{1F4E6}" },
];

export default function AddVehicle() {
  const navigate = useNavigate();
  const [itemType, setItemType] = useState("car");
  const [licensePlate, setLicensePlate] = useState("");
  const [make, setMake] = useState("");
  const [color, setColor] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isVehicle = itemType === "car" || itemType === "bike";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.addVehicle({
        license_plate: licensePlate || `${itemType.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
        make: make || undefined,
        color: color || undefined,
        item_type: itemType,
      });
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Add Item</h2>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm p-6 space-y-4"
      >
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Item Type Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What are you tagging?
          </label>
          <div className="grid grid-cols-3 gap-2">
            {ITEM_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setItemType(t.value)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                  itemType === t.value
                    ? "border-primary bg-blue-50 text-primary"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <span className="text-2xl">{t.icon}</span>
                <span className="text-xs font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isVehicle ? "License Plate *" : "Identifier / Label *"}
          </label>
          <input
            type="text"
            value={licensePlate}
            onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
            placeholder={isVehicle ? "KDA 123X" : "e.g. Blue Samsonite, House Keys"}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary uppercase"
            required={isVehicle}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isVehicle ? "Make / Model" : "Description"}
          </label>
          <input
            type="text"
            value={make}
            onChange={(e) => setMake(e.target.value)}
            placeholder={isVehicle ? "Toyota Vitz" : "Brand, model, or details"}
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
            {loading ? "Adding..." : "Add Item"}
          </button>
        </div>
      </form>
    </div>
  );
}
