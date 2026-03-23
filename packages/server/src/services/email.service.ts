import { env } from "../config/env";
import { queryOne } from "../config/database";
import { ScanSession, Tag, User } from "../types";

interface TagWithOwner extends Tag {
  owner_phone: string;
  owner_name: string;
  vehicle_make: string | null;
  vehicle_color: string | null;
}

/**
 * Send a scan notification email to the tag owner.
 * In development, logs to console. In production, uses SendGrid.
 */
export async function sendScanNotificationEmail(
  tag: TagWithOwner,
  session: ScanSession
): Promise<void> {
  // Find the owner's email
  const owner = await queryOne<User>(
    `SELECT * FROM users u
     JOIN vehicles v ON v.user_id = u.id
     JOIN tags t ON t.vehicle_id = v.id
     WHERE t.id = $1`,
    [tag.id]
  );

  if (!owner?.email) {
    if (env.NODE_ENV === "development") {
      console.log(
        `[DEV] Scan notification: No email for owner of tag ${tag.tag_code}. Would notify ${tag.owner_phone}`
      );
    }
    return;
  }

  const vehicleDesc = [tag.vehicle_color, tag.vehicle_make]
    .filter(Boolean)
    .join(" ") || "your vehicle";

  const locationText =
    session.latitude && session.longitude
      ? `Location: https://maps.google.com/?q=${session.latitude},${session.longitude}`
      : "Location: Not available (finder did not share)";

  const subject = `Your Car Park Tag was scanned — ${tag.tag_code}`;
  const body = `
Hello ${tag.owner_name},

Someone just scanned the QR tag on ${vehicleDesc}.

Tag Code: ${tag.tag_code}
Time: ${new Date().toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })}
${locationText}

They may try to contact you about your vehicle. If you receive a call or SMS, it's likely about parking.

— Smart Tags
`.trim();

  if (env.NODE_ENV === "development") {
    console.log(`[DEV] Email notification to ${owner.email}:`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body: ${body.substring(0, 100)}...`);
    return;
  }

  // Production: SendGrid
  if (!env.SENDGRID_API_KEY) {
    console.warn("SENDGRID_API_KEY not set, skipping email");
    return;
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: owner.email }] }],
      from: { email: env.FROM_EMAIL, name: "Smart Tags" },
      subject,
      content: [{ type: "text/plain", value: body }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`SendGrid error: ${response.status} ${err}`);
  }
}
