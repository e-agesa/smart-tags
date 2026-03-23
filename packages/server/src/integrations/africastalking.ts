import AfricasTalking from "africastalking";
import { env } from "../config/env";

const at = AfricasTalking({
  apiKey: env.AT_API_KEY,
  username: env.AT_USERNAME,
});

const sms = at.SMS;
const voice = at.VOICE;

/**
 * Send an SMS message via Africa's Talking.
 */
export async function sendSms(
  to: string,
  message: string
): Promise<{ messageId: string }> {
  const result = await sms.send({
    to: [to],
    message,
    from: env.AT_SENDER_ID,
  });
  const recipient = result.SMSMessageData?.Recipients?.[0];
  return { messageId: recipient?.messageId || "unknown" };
}

/**
 * Initiate an outbound call via Africa's Talking Voice API.
 * This calls the scanner's phone from your AT number.
 * When the scanner picks up, AT will fire a webhook to your callback URL
 * where you respond with <Dial> XML to connect to the car owner.
 */
export async function makeCall(
  to: string,
  callbackUrl: string
): Promise<{ sessionId: string }> {
  const result = await voice.call({
    callTo: [to],
    callFrom: env.AT_PHONE_NUMBER,
    // AT will POST to this URL when the call is answered
    // We respond with XML to dial the car owner
  });
  // The result contains entries with sessionId
  const entry = result?.entries?.[0];
  return { sessionId: entry?.sessionId || "unknown" };
}

/**
 * Generate AT Voice XML response to dial a phone number (bridge call).
 * This is returned in response to AT's webhook when the scanner picks up.
 */
export function generateDialXml(ownerPhone: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial phoneNumbers="${ownerPhone}" ringbackTone="${env.BASE_URL}/audio/ringback.mp3" />
</Response>`;
}

/**
 * Generate AT Voice XML response to play a message and hang up.
 */
export function generateSayXml(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="en-US-Standard-A">${message}</Say>
</Response>`;
}
