import { PaymentPayload } from "../../../../types/verify";
import { safeBase64Encode, safeBase64Decode } from "../../../../shared/base64";

/**
 * Encodes a payment payload for use in X-PAYMENT headers
 *
 * @param payment - The payment payload to encode
 * @returns The base64 encoded payment string
 */
export function encodePayment(payment: PaymentPayload): string {
  const paymentString = JSON.stringify(payment);
  return safeBase64Encode(paymentString);
}

/**
 * Decodes a payment payload from an X-PAYMENT header
 *
 * @param encodedPayment - The base64 encoded payment string
 * @returns The decoded payment payload
 */
export function decodePayment(encodedPayment: string): PaymentPayload {
  const paymentString = safeBase64Decode(encodedPayment);
  return JSON.parse(paymentString) as PaymentPayload;
}
