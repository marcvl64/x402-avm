import { PaymentPayload, PaymentRequirements } from "../../../types/verify";
import { ExactAvmPayload } from "../../../types/verify/x402Specs";
import { encodePayment } from "./utils/paymentUtils";
import { WalletAccount, AlgorandClient } from "./types";
import algosdk from "algosdk";

/**
 * Prepares an unsigned payment header with the given sender address and payment requirements.
 *
 * @param client - The Algorand client used for blockchain interactions
 * @param from - The sender's address from which the payment will be made
 * @param x402Version - The version of the X402 protocol to use
 * @param paymentRequirements - The payment requirements containing scheme and network information
 * @returns An unsigned payment payload containing transaction details
 */
export async function preparePaymentHeader(
  client: AlgorandClient,
  from: string,
  x402Version: number,
  paymentRequirements: PaymentRequirements,
): Promise<ExactAvmPayload> {
  const params = await client.client.getTransactionParams().do();
  const amount = parseInt(paymentRequirements.maxAmountRequired, 10);

  // Create a simple payment transaction
  let txn: algosdk.Transaction;
  if (paymentRequirements.asset && paymentRequirements.asset !== "0") {
    // ASA transfer
    txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: from,
      to: paymentRequirements.payTo,
      amount: amount,
      assetIndex: parseInt(paymentRequirements.asset as string, 10),
      suggestedParams: params,
    });
  } else {
    // ALGO transfer
    txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: from,
      to: paymentRequirements.payTo,
      amount: amount,
      suggestedParams: params,
    });
  }

  const encodedTxn = Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString("base64");

  return {
    paymentIndex: 0,
    paymentGroup: [encodedTxn],
  };
}

/**
 * Signs a payment header using the provided wallet and payment requirements.
 *
 * @param wallet - The wallet instance used to sign the payment header
 * @param paymentRequirements - The payment requirements containing scheme and network information
 * @param unsignedPaymentHeader - The unsigned payment payload to be signed
 * @returns A promise that resolves to the signed payment payload
 */
export async function signPaymentHeader(
  wallet: WalletAccount,
  paymentRequirements: PaymentRequirements,
  unsignedPaymentHeader: ExactAvmPayload,
): Promise<PaymentPayload> {
  const { paymentIndex, paymentGroup } = unsignedPaymentHeader;
  if (!paymentGroup) {
    throw new Error("Transaction group is missing from unsigned payment header");
  }

  const txnGroupBytes: Uint8Array[] = paymentGroup.map((pg) => Buffer.from(pg, "base64"));
  const indexesToSign = [paymentIndex]; // Sign only the user transaction

  const signedTxnGroup = await wallet.signTransactions(txnGroupBytes, indexesToSign);

  // Create a new paymentGroup with the signed transaction
  const resultPaymentGroup = [...paymentGroup];
  if (signedTxnGroup[paymentIndex]) {
    resultPaymentGroup[paymentIndex] = Buffer.from(
      signedTxnGroup[paymentIndex] as Uint8Array,
    ).toString("base64");
  } else {
    throw new Error("Wallet did not return a signed user transaction");
  }

  const payload: ExactAvmPayload = {
    paymentIndex,
    paymentGroup: resultPaymentGroup,
  };

  return {
    x402Version: 1,
    scheme: "exact",
    network: paymentRequirements.network,
    payload,
  };
}

/**
 * Creates a complete payment payload by preparing and signing a payment header.
 *
 * @param client - The Algorand client used for blockchain interactions
 * @param wallet - The wallet instance used to create and sign the payment
 * @param x402Version - The version of the X402 protocol to use
 * @param paymentRequirements - The payment requirements containing scheme and network information
 * @returns A promise that resolves to the complete signed payment payload
 */
export async function createPayment(
  client: AlgorandClient,
  wallet: WalletAccount,
  x402Version: number,
  paymentRequirements: PaymentRequirements,
): Promise<PaymentPayload> {
  const from = wallet.address;
  const unsignedPaymentHeader = await preparePaymentHeader(
    client,
    from,
    x402Version,
    paymentRequirements,
  );
  return signPaymentHeader(wallet, paymentRequirements, unsignedPaymentHeader);
}

/**
 * Creates and encodes a payment header for the given wallet and payment requirements.
 *
 * @param client - The Algorand client used for blockchain interactions
 * @param wallet - The wallet instance used to create the payment header
 * @param x402Version - The version of the X402 protocol to use
 * @param paymentRequirements - The payment requirements containing scheme and network information
 * @returns A promise that resolves to the encoded payment header string
 */
export async function createPaymentHeader(
  client: AlgorandClient,
  wallet: WalletAccount,
  x402Version: number,
  paymentRequirements: PaymentRequirements,
): Promise<string> {
  const payment = await createPayment(client, wallet, x402Version, paymentRequirements);
  return encodePayment(payment);
}
