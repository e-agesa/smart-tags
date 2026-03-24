const { Client } = require("ssh2");
const conn = new Client();
conn.on("ready", () => {
  conn.exec(`
    cd /var/www/smart-tags

    # Reseed everything
    sudo -u postgres psql -d carparktag -f packages/server/src/db/seed.sql 2>&1

    # Seed subscription plans
    sudo -u postgres psql -d carparktag << 'SQL'
INSERT INTO subscription_plans (name, slug, price_kes, price_usd, interval_months, max_tags, features) VALUES
('Free', 'free', 0, 0, 12, 1, '["1 QR tag", "Basic scan notifications", "SMS contact"]'),
('Basic', 'basic', 500, 5, 12, 3, '["3 QR tags", "Email + SMS notifications", "Anonymous chat", "GPS tracking", "Scan history"]'),
('Premium', 'premium', 1200, 12, 12, 10, '["10 QR tags", "Priority notifications", "Anonymous chat", "GPS tracking", "Full scan history", "Custom messages", "Emergency alerts", "Tag pause/resume"]'),
('Business', 'business', 5000, 50, 12, 50, '["50 QR tags", "All Premium features", "Batch QR generation", "API access", "Dedicated support", "White-label stickers"]')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO payment_gateways (name, slug, is_enabled, config, supported_currencies) VALUES
('M-Pesa (Daraja)', 'mpesa', true, '{"consumer_key":"","consumer_secret":"","shortcode":"174379","passkey":"","environment":"sandbox"}', ARRAY['KES']),
('Paystack', 'paystack', false, '{"secret_key":"","public_key":"","environment":"test"}', ARRAY['KES','NGN','GHS','ZAR','USD']),
('Pesapal', 'pesapal', false, '{"consumer_key":"","consumer_secret":"","environment":"sandbox"}', ARRAY['KES','UGX','TZS','USD']),
('PayPal', 'paypal', false, '{"client_id":"","client_secret":"","environment":"sandbox"}', ARRAY['USD','GBP','EUR','CAD','AUD']),
('Stripe', 'stripe', false, '{"secret_key":"","publishable_key":"","webhook_secret":""}', ARRAY['USD','GBP','EUR','CAD','AUD','KES'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO promo_codes (code, description, discount_type, discount_value, max_uses, applies_to, valid_until) VALUES
('WELCOME50', 'Welcome discount - 50% off first tag', 'percent', 50, NULL, 'subscription', NOW() + INTERVAL '90 days'),
('EARLYBIRD', 'Early bird - KES 200 off', 'fixed', 200, 100, 'subscription', NOW() + INTERVAL '30 days'),
('FREESHIP', 'Free shipping on sticker orders', 'fixed', 0, 50, 'stickers', NOW() + INTERVAL '60 days'),
('LAUNCH100', 'Launch promo - KES 100 off any order', 'fixed', 100, 200, 'all', NOW() + INTERVAL '45 days')
ON CONFLICT (code) DO NOTHING;

INSERT INTO offers (title, description, offer_type, discount_percent, applies_to, valid_until) VALUES
('Launch Special - 50% Off Premium', 'Get Premium plan at half price during our launch period!', 'discount', 50, 'subscription', NOW() + INTERVAL '30 days'),
('Buy 5 Stickers, Get 2 Free', 'Order 5+ stickers and receive 2 free.', 'bundle', 0, 'stickers', NOW() + INTERVAL '60 days'),
('Refer a Friend - Both Get KES 200 Off', 'Share your referral code. You both get KES 200 off.', 'referral', 0, 'all', NOW() + INTERVAL '90 days');

-- Seed subscriptions for users
INSERT INTO user_subscriptions (user_id, plan_id, status, started_at, expires_at, payment_ref)
SELECT 'a1000000-0000-0000-0000-000000000001', id, 'active', NOW() - INTERVAL '30 days', NOW() + INTERVAL '335 days', 'SHK7Y1Z2X3'
FROM subscription_plans WHERE slug = 'premium'
ON CONFLICT DO NOTHING;

INSERT INTO user_subscriptions (user_id, plan_id, status, started_at, expires_at, payment_ref)
SELECT 'a1000000-0000-0000-0000-000000000004', id, 'active', NOW() - INTERVAL '10 days', NOW() + INTERVAL '355 days', 'RYO2U5G7H8'
FROM subscription_plans WHERE slug = 'basic'
ON CONFLICT DO NOTHING;

-- Seed sticker orders
INSERT INTO sticker_orders (user_id, qty, design, unit_price_kes, total_kes, shipping_name, shipping_phone, shipping_address, shipping_city, status) VALUES
('a1000000-0000-0000-0000-000000000001', 5, 'premium', 300, 1500, 'James Kamau', '+254712345678', '123 Moi Avenue, Westlands', 'Nairobi', 'delivered'),
('a1000000-0000-0000-0000-000000000004', 2, 'standard', 150, 300, 'Grace Wanjiku', '+254745678901', '45 Kenyatta Road', 'Nakuru', 'shipped'),
('a1000000-0000-0000-0000-000000000008', 10, 'reflective', 500, 5000, 'Lucy Muthoni', '+254733445566', '78 Digo Road', 'Mombasa', 'pending');

SELECT 'plans' as tbl, COUNT(*) FROM subscription_plans
UNION ALL SELECT 'gateways', COUNT(*) FROM payment_gateways
UNION ALL SELECT 'promos', COUNT(*) FROM promo_codes
UNION ALL SELECT 'offers', COUNT(*) FROM offers
UNION ALL SELECT 'subscriptions', COUNT(*) FROM user_subscriptions
UNION ALL SELECT 'sticker_orders', COUNT(*) FROM sticker_orders;
SQL

    echo "=== Seed complete ==="

    # Restart
    pm2 restart smart-tags
    sleep 3

    # Test
    curl -s http://localhost:3000/api/plans | head -c 100
    echo ""
    curl -s http://localhost:3000/api/payments/methods | head -c 100
    echo ""
    curl -s http://localhost:3000/api/stickers/designs | head -c 100
    echo ""
    curl -s http://localhost:3000/api/offers | head -c 100
    echo ""
    echo "=== ALL DONE ==="
  `, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    stream.on("data", (d) => process.stdout.write(d.toString()));
    stream.stderr.on("data", (d) => process.stderr.write(d.toString()));
    stream.on("close", () => conn.end());
  });
});
conn.on("error", (err) => console.error("SSH Error:", err.message));
conn.connect({ host: "147.79.101.189", port: 22, username: "root", password: "MtVmTbHm@-L1,Yd&" });
