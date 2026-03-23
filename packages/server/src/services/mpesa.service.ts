import { query, queryOne } from "../config/database";
import { Payment } from "../types";
import { initiateSTKPush } from "../integrations/daraja";
import * as tagService from "./tag.service";

export async function createPayment(
  userId: string,
  tagId: string,
  phone: string,
  amountKes: number
): Promise<Payment & { checkoutRequestId: string }> {
  // Get tag for account reference
  const tag = await tagService.getTagById(tagId);
  if (!tag) throw new Error("Tag not found");

  // Initiate STK Push
  const stkResult = await initiateSTKPush({
    phone,
    amount: amountKes,
    accountReference: tag.tag_code,
    description: `Car Park Tag ${tag.tag_code}`,
  });

  if (stkResult.ResponseCode !== "0") {
    throw new Error(stkResult.ResponseDescription);
  }

  // Save payment record
  const rows = await query<Payment>(
    `INSERT INTO payments (user_id, tag_id, amount_kes, mpesa_checkout_id, phone_used, description)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      userId,
      tagId,
      amountKes,
      stkResult.CheckoutRequestID,
      phone,
      `Car Park Tag ${tag.tag_code}`,
    ]
  );

  return {
    ...rows[0],
    checkoutRequestId: stkResult.CheckoutRequestID,
  };
}

export async function handlePaymentCallback(
  checkoutRequestId: string,
  resultCode: number,
  mpesaReceipt: string | undefined
): Promise<void> {
  if (resultCode === 0 && mpesaReceipt) {
    // Payment successful
    const payment = await queryOne<Payment>(
      `UPDATE payments
       SET status = 'completed', mpesa_receipt = $1, completed_at = NOW()
       WHERE mpesa_checkout_id = $2
       RETURNING *`,
      [mpesaReceipt, checkoutRequestId]
    );

    // Activate the tag
    if (payment?.tag_id) {
      await tagService.activateTag(payment.tag_id);
    }
  } else {
    // Payment failed or cancelled
    await query(
      `UPDATE payments SET status = 'failed' WHERE mpesa_checkout_id = $1`,
      [checkoutRequestId]
    );
  }
}

export async function getUserPayments(userId: string): Promise<Payment[]> {
  return query<Payment>(
    `SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  return queryOne<Payment>(`SELECT * FROM payments WHERE id = $1`, [id]);
}
