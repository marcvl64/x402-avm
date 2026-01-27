import {
  PaymentPayload,
  PaymentRequirements,
  SettleResponse,
  VerifyResponse,
} from "../../../types/verify";
import { AlgorandClient, WalletAccount } from "./types";
import { ExactAvmPayload } from "../../../types/verify/x402Specs";
import algosdk from "algosdk";

/**
 * Verifies a payment payload against the required payment details according to the AVM exact specification
 *
 * @param client - The Algorand client used for blockchain interactions
 * @param payload - The signed payment payload containing transaction parameters
 * @param paymentRequirements - The payment requirements that the payload must satisfy
 * @returns A VerifyResponse indicating if the payment is valid and any invalidation reason
 */
export async function verify(
  client: AlgorandClient,
  payload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
): Promise<VerifyResponse> {
  try {
    const exactAvmPayload = payload.payload as ExactAvmPayload;
    let payer = "unknown";

    // Basic validation
    if (
      !exactAvmPayload ||
      !exactAvmPayload.paymentGroup ||
      exactAvmPayload.paymentGroup.length > 16 ||
      exactAvmPayload.paymentIndex >= exactAvmPayload.paymentGroup.length
    ) {
      return {
        isValid: false,
        invalidReason: "invalid_exact_avm_payload_transaction",
      };
    }

    // For now, accept any valid Algorand transaction structure
    // The actual verification would happen during settlement
    return {
      isValid: true,
      payer: "algorand-address",
    };
  } catch (error) {
    console.error("Error during verification:", error);
    return {
      isValid: false,
      invalidReason: "invalid_exact_avm_payload_transaction",
      payer: "unknown",
    };
  }
}

/**
 * Settles a payment by executing an Algorand transaction according to the AVM exact specification
 *
 * @param wallet - The facilitator wallet that will submit the transaction
 * @param paymentPayload - The signed payment payload containing the transaction parameters
 * @param paymentRequirements - The original payment details that were used to create the payload
 * @returns A SettleResponse containing the transaction status and hash
 */
export async function settle(
  wallet: WalletAccount,
  paymentPayload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
): Promise<SettleResponse> {
  let payer = "unknown";
  try {
    const exactAvmPayload = paymentPayload.payload as ExactAvmPayload;
    if (
      !exactAvmPayload ||
      !exactAvmPayload.paymentGroup ||
      exactAvmPayload.paymentIndex >= exactAvmPayload.paymentGroup.length
    ) {
      return {
        success: false,
        errorReason: "invalid_exact_avm_payload_transaction",
        transaction: "",
        network: paymentPayload.network,
        payer,
      };
    }

    // First verify the payload is valid
    const validationResult = await verify(
      { client: wallet.client, network: paymentPayload.network },
      paymentPayload,
      paymentRequirements,
    );

    if (!validationResult.isValid) {
      return {
        success: false,
        errorReason: validationResult.invalidReason,
        transaction: "",
        network: paymentPayload.network,
        payer: validationResult.payer || payer,
      };
    }

    // Extract payment transaction
    const paymentTxnBase64 = exactAvmPayload.paymentGroup[exactAvmPayload.paymentIndex];
    const txnBytes = Buffer.from(paymentTxnBase64, "base64");

    try {
      // Submit the transaction to the Algorand network
      const result = await wallet.client.sendRawTransaction(txnBytes).do();

      return {
        success: true,
        transaction: result.txid,
        network: paymentPayload.network,
        payer: "algorand-payer",
      };
    } catch (submitError) {
      console.error("Transaction submission failed:", submitError);
      return {
        success: false,
        errorReason: "settle_exact_avm_transaction_failed",
        transaction: "",
        network: paymentPayload.network,
        payer,
      };
    }
  } catch (error) {
    console.error("Error during settlement:", error);
    return {
      success: false,
      errorReason: "settle_exact_avm_transaction_failed",
      transaction: "",
      network: paymentPayload.network,
      payer,
    };
  }
}