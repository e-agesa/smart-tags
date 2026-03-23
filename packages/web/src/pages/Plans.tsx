import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

interface Plan {
  id: string;
  name: string;
  slug: string;
  price_kes: number;
  max_tags: number;
  features: string[];
}

export default function Plans() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState("free");
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getPlans(), api.getSubscription()])
      .then(([p, s]) => {
        setPlans(p);
        setCurrentPlan(s.plan_slug);
      })
      .catch((err) => {
        if (err.message.includes("Authentication")) navigate("/login");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (slug: string) => {
    if (slug === "free") return;
    setSubscribing(slug);
    try {
      await api.subscribe(slug);
      setCurrentPlan(slug);
    } catch {
      // payment flow would go here
    } finally {
      setSubscribing(null);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Subscription Plans</h2>
      <p className="text-gray-500 text-sm mb-6">Choose the plan that fits your needs</p>

      <div className="space-y-4">
        {plans.map((plan) => {
          const isCurrent = plan.slug === currentPlan;
          return (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl shadow-sm p-5 border-2 transition-all ${
                isCurrent ? "border-primary" : "border-transparent"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  <p className="text-gray-500 text-sm">Up to {plan.max_tags} tags</p>
                </div>
                <div className="text-right">
                  {plan.price_kes === 0 ? (
                    <span className="text-2xl font-bold text-green-600">Free</span>
                  ) : (
                    <>
                      <span className="text-2xl font-bold">KES {plan.price_kes.toLocaleString()}</span>
                      <span className="text-gray-400 text-sm">/year</span>
                    </>
                  )}
                </div>
              </div>

              <ul className="space-y-1.5 mb-4">
                {plan.features.map((f, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                    <span className="text-green-500 text-xs">&#x2713;</span>
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="text-center text-sm text-primary font-semibold py-2 bg-blue-50 rounded-lg">
                  Current Plan
                </div>
              ) : (
                <button
                  onClick={() => handleSubscribe(plan.slug)}
                  disabled={subscribing === plan.slug}
                  className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {subscribing === plan.slug ? "Processing..." : plan.price_kes === 0 ? "Downgrade" : "Upgrade"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
