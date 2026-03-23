import { useState, useEffect, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

interface Design {
  slug: string;
  name: string;
  price_kes: number;
  description: string;
}

interface Order {
  id: string;
  qty: number;
  design: string;
  total_kes: number;
  status: string;
  tracking_no: string | null;
  created_at: string;
}

export default function Shop() {
  const navigate = useNavigate();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedDesign, setSelectedDesign] = useState("standard");
  const [qty, setQty] = useState(2);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.getStickerDesigns(), api.getStickerOrders()])
      .then(([d, o]) => {
        setDesigns(d);
        setOrders(o);
      })
      .catch((err) => {
        if (err.message.includes("Authentication")) navigate("/login");
      })
      .finally(() => setLoading(false));
  }, []);

  const currentDesign = designs.find((d) => d.slug === selectedDesign);
  const total = (currentDesign?.price_kes || 150) * qty;

  const handleOrder = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setOrdering(true);
    try {
      await api.orderStickers({
        qty,
        design: selectedDesign,
        shipping_name: name,
        shipping_phone: phone,
        shipping_address: address,
        shipping_city: city,
      });
      setSuccess("Order placed! We will contact you for payment and delivery.");
      const o = await api.getStickerOrders();
      setOrders(o);
      setName("");
      setPhone("");
      setAddress("");
      setCity("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order failed");
    } finally {
      setOrdering(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Sticker Shop</h2>
      <p className="text-gray-500 text-sm mb-6">Order physical QR stickers for your items</p>

      {success && (
        <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg mb-4">
          {success}
          <button onClick={() => setSuccess("")} className="float-right font-bold">&times;</button>
        </div>
      )}

      {/* Design selector */}
      <div className="space-y-3 mb-6">
        {designs.map((d) => (
          <button
            key={d.slug}
            onClick={() => setSelectedDesign(d.slug)}
            className={`w-full text-left bg-white rounded-xl p-4 border-2 transition-all ${
              selectedDesign === d.slug ? "border-primary" : "border-transparent shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{d.name}</h3>
                <p className="text-gray-500 text-sm">{d.description}</p>
              </div>
              <span className="font-bold text-lg">KES {d.price_kes}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Order form */}
      <form onSubmit={handleOrder} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
        <h3 className="font-bold">Order Details</h3>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 rounded-lg bg-gray-100 font-bold text-lg">-</button>
            <span className="text-xl font-bold w-12 text-center">{qty}</span>
            <button type="button" onClick={() => setQty(Math.min(100, qty + 1))} className="w-10 h-10 rounded-lg bg-gray-100 font-bold text-lg">+</button>
            <span className="text-gray-500 text-sm ml-auto">Total: <strong>KES {total.toLocaleString()}</strong></span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Kamau" className="w-full px-3 py-2 border rounded-lg" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" className="w-full px-3 py-2 border rounded-lg" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Moi Avenue, 2nd Floor" className="w-full px-3 py-2 border rounded-lg" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Nairobi" className="w-full px-3 py-2 border rounded-lg" required />
        </div>

        <button
          type="submit"
          disabled={ordering}
          className="w-full bg-primary text-white py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {ordering ? "Placing order..." : `Order ${qty} sticker${qty > 1 ? "s" : ""} — KES ${total.toLocaleString()}`}
        </button>
      </form>

      {/* Past orders */}
      {orders.length > 0 && (
        <div className="mt-8">
          <h3 className="font-bold mb-3">My Orders</h3>
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
                <div>
                  <span className="font-medium">{o.qty}x {o.design}</span>
                  <span className="text-gray-500 text-sm ml-2">KES {o.total_kes}</span>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(o.created_at).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}
                    {o.tracking_no && <span className="ml-2">Tracking: {o.tracking_no}</span>}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  o.status === "delivered" ? "bg-green-100 text-green-700" :
                  o.status === "shipped" ? "bg-blue-100 text-blue-700" :
                  "bg-yellow-100 text-yellow-700"
                }`}>
                  {o.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
