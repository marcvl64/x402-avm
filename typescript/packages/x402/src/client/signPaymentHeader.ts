import { signPaymentHeader as signPaymentHeaderExactEVM } from "../schemes/exact/evm/client";
import { signPaymentHeader as signPaymentHeaderExactAVM } from "../schemes/exact/avm/client";
import { encodePayment } from "../schemes/exact/evm/utils/paymentUtils";
import {
  isEvmSignerWallet,
  isMultiNetworkSigner,
  resolveAvmWallet,
  MultiNetworkSigner,
  Signer,
  SupportedEVMNetworks,
  SupportedAVMNetworks,
} from "../types/shared";
import { PaymentRequirements, UnsignedPaymentPayload } from "../types/verify";
import { ExactAvmPayload } from "../types/verify/x402Specs";

/**
 * Signs a payment header using the provided client and payment requirements.
 *
 * @param client - The signer wallet instance used to sign the payment header
 * @param paymentRequirements - The payment requirements containing scheme and network information
 * @param unsignedPaymentHeader - The unsigned payment payload to be signed
 * @returns A promise that resolves to the encoded signed payment header string
 */
export async function signPaymentHeader(
  client: Signer | MultiNetworkSigner,
  paymentRequirements: PaymentRequirements,
  unsignedPaymentHeader: UnsignedPaymentPayload,
): Promise<string> {
  if (paymentRequirements.scheme !== "exact") {
    throw new Error("Unsupported scheme");
  }

  if (SupportedEVMNetworks.includes(paymentRequirements.network)) {
    const evmClient = isMultiNetworkSigner(client) ? client.evm : client;

    if (!isEvmSignerWallet(evmClient)) {
      throw new Error("Invalid evm wallet client provided");
    }

    const signedPaymentHeader = await signPaymentHeaderExactEVM(
      evmClient,
      paymentRequirements,
      unsignedPaymentHeader,
    );
    return encodePayment(signedPaymentHeader);
  }

  if (SupportedAVMNetworks.includes(paymentRequirements.network)) {
    const avmWallet = resolveAvmWallet(client);
    if (!avmWallet) {
      throw new Error("Invalid Algorand wallet client provided");
    }

    // Use type assertion with a specific check to ensure this is an ExactAvmPayload
    const avmPayload = unsignedPaymentHeader?.payload as unknown as ExactAvmPayload;
    console.log("[X402 CLIENT] AVM Payload:", avmPayload);
    if (!avmPayload.paymentGroup || typeof avmPayload.paymentIndex !== 'number') {
      throw new Error("Invalid AVM payload structure");
    }

    const signedPaymentHeader = await signPaymentHeaderExactAVM(
      avmWallet,
      paymentRequirements,
      avmPayload
    );
    console.log("[X402 CLIENT] Signed AVM Payment Header:", signedPaymentHeader);
    return encodePayment(signedPaymentHeader);
  }

  throw new Error("Unsupported network");
}
