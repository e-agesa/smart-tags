import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

export default function Landing() {
  const [redirect, setRedirect] = useState(false);

  // If user is already logged in, go to dashboard
  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => { if (r.ok) setRedirect(true); })
      .catch(() => {});
  }, []);

  if (redirect) {
    window.location.href = "/dashboard";
    return null;
  }
  return (
    <div className="min-h-screen bg-primary-dark text-white">
      {/* Nav */}
      <nav className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gold flex items-center justify-center">
            <span className="text-primary-dark font-extrabold text-base">ST</span>
          </div>
          <span className="text-xl font-bold text-white">Smart Tags</span>
        </div>
        <div className="flex gap-3">
          <Link to="/login" className="text-sm text-blue-200 hover:text-white px-3 py-2">Sign In</Link>
          <Link to="/register" className="text-sm bg-accent text-white px-5 py-2 rounded-lg font-semibold hover:bg-accent-light transition-all shadow-md">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-24 text-center">
        <div className="inline-block text-sm bg-gold/20 text-gold px-4 py-1.5 rounded-full font-semibold mb-6">
          1 Month Free Trial on Sign Up
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
          One QR Code.<br />
          <span className="text-gold">Instant Contact.</span><br />
          <span className="text-accent-light">Zero Shared Numbers.</span>
        </h1>
        <p className="text-lg text-blue-200 max-w-2xl mx-auto mb-10 leading-relaxed">
          Smart Tags lets anyone scan your vehicle's QR code to contact you anonymously —
          via call, SMS, or chat — without ever seeing your phone number.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link to="/register" className="bg-accent text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-accent-light transition-all shadow-lg hover:shadow-xl">
            Get Your Tag Free
          </Link>
          <a href="#how" className="bg-white/10 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/20 border border-white/20 transition-all backdrop-blur-sm">
            How It Works
          </a>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-primary py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-extrabold text-center mb-4">How It Works</h2>
          <p className="text-blue-200 text-center mb-12">Three simple steps to protect your vehicle</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", icon: "\u{1F4F1}", title: "Register & Tag", desc: "Sign up, add your vehicle, and generate a unique QR code. Print it and place it on your windshield.", color: "bg-gold" },
              { step: "2", icon: "\u{1F4F7}", title: "Someone Scans", desc: "If your car is blocking someone or found lost, they scan the QR with any phone camera. No app needed.", color: "bg-accent" },
              { step: "3", icon: "\u{1F4DE}", title: "Private Contact", desc: "They can call, SMS, or chat with you anonymously. You get notified instantly with their GPS location.", color: "bg-primary-light" },
            ].map((item) => (
              <div key={item.step} className="bg-primary-dark rounded-2xl p-7 border border-white/10 text-center hover:border-gold/30 transition-all">
                <div className={`w-14 h-14 ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-5 text-2xl shadow-lg`}>
                  {item.icon}
                </div>
                <div className="text-xs text-gold font-bold uppercase tracking-wider mb-2">Step {item.step}</div>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-blue-200 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-primary-dark">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-extrabold text-center mb-4">Everything You Need</h2>
          <p className="text-blue-200 text-center mb-12">One tag. Complete protection.</p>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: "\u{1F6E1}", title: "Privacy Protected", desc: "Masked calls and anonymous chat. Your number stays private." },
              { icon: "\u{1F4CD}", title: "GPS Tracking", desc: "Know exactly where your item was scanned with real-time location." },
              { icon: "\u{1F514}", title: "Instant Alerts", desc: "Email and SMS notifications the moment your tag is scanned." },
              { icon: "\u{1F5E8}", title: "Anonymous Chat", desc: "Real-time web chat between finder and owner. No app download." },
              { icon: "\u{1F6A8}", title: "Emergency Contacts", desc: "Finders can reach your emergency contact if you are unreachable." },
              { icon: "\u{1F310}", title: "Multi-Language", desc: "English and Swahili support on the finder page." },
              { icon: "\u{1F697}", title: "Multi-Item Support", desc: "Tag cars, bikes, luggage, keys, pets — anything valuable." },
              { icon: "\u{2699}", title: "Full Control", desc: "Pause tags, set custom messages, view scan history from your dashboard." },
            ].map((f, i) => (
              <div key={i} className="flex gap-4 p-5 bg-primary/50 rounded-xl border border-white/5 hover:border-gold/20 transition-all">
                <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-xl flex-shrink-0">{f.icon}</div>
                <div>
                  <h3 className="font-bold mb-1">{f.title}</h3>
                  <p className="text-blue-200 text-sm">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-primary py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-extrabold text-center mb-4">Simple Pricing</h2>
          <p className="text-blue-200 text-center mb-12">Start free. Upgrade when you need more.</p>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { name: "Free", price: "$0", tags: "1 tag", features: ["Basic notifications", "SMS contact"], cta: "Start Free", accent: false },
              { name: "Basic", price: "$5", tags: "3 tags", features: ["Email + SMS alerts", "Anonymous chat", "GPS tracking"], cta: "Get Basic", accent: true },
              { name: "Premium", price: "$12", tags: "10 tags", features: ["All Basic features", "Custom messages", "Emergency alerts", "Tag pause/resume"], cta: "Get Premium", accent: false },
              { name: "Business", price: "$50", tags: "50 tags", features: ["All Premium features", "Batch QR generation", "API access", "Dedicated support"], cta: "Contact Us", accent: false },
            ].map((p, i) => (
              <div key={i} className={`bg-primary-dark rounded-2xl p-5 border-2 ${p.accent ? "border-gold" : "border-white/10"} relative hover:border-gold/50 transition-all`}>
                {p.accent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-primary-dark text-xs px-3 py-1 rounded-full font-bold">Most Popular</div>
                )}
                <h3 className="font-bold text-lg mb-1">{p.name}</h3>
                <div className="text-3xl font-extrabold mb-1">{p.price}<span className="text-sm text-blue-300 font-normal">/yr</span></div>
                <div className="text-sm text-blue-300 mb-4">{p.tags}</div>
                <ul className="space-y-2 mb-5">
                  {p.features.map((f, j) => (
                    <li key={j} className="text-sm text-blue-200 flex items-center gap-2">
                      <span className="text-gold">&#x2713;</span> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/register" className={`block text-center py-2.5 rounded-lg text-sm font-bold transition-all ${
                  p.accent ? "bg-accent text-white hover:bg-accent-light shadow-md" : "bg-white/10 text-white hover:bg-white/20"
                }`}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary-dark">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-extrabold mb-4">Ready to protect your vehicle?</h2>
          <p className="text-blue-200 mb-8">Join thousands of vehicle owners using Smart Tags.</p>
          <Link to="/register" className="inline-block bg-gold text-primary-dark px-10 py-4 rounded-xl font-bold text-lg hover:bg-gold-light transition-all shadow-lg">
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 bg-primary-dark">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gold flex items-center justify-center">
              <span className="text-primary-dark font-extrabold text-xs">ST</span>
            </div>
            <span className="text-sm text-blue-300">&copy; 2026 Smart Tags. All rights reserved.</span>
          </div>
          <div className="flex gap-6 text-sm text-blue-300">
            <a href="#" className="hover:text-gold transition-colors">Privacy</a>
            <a href="#" className="hover:text-gold transition-colors">Terms</a>
            <a href="#" className="hover:text-gold transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
