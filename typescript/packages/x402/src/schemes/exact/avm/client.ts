import { PaymentPayload, PaymentRequirements, UnsignedPaymentPayload } from "../../../types/verify";
import { ExactAvmPayload } from "../../../types/verify/x402Specs";
import { encodePayment } from "./utils/paymentUtils";
import { WalletAccount, AlgorandClient } from "./types";
import algosdk from "algosdk";

/**
 * Interface representing an atomic transaction group
 */
interface AtomicTransactionGroup {
  paymentIndex?: number;
  paymentGroup?: string[];
}

/**
 * Gets the current round from the Algorand client
 *
 * @param client - The Algorand client
 * @returns The current round number
 */
async function getCurrentRound(client: AlgorandClient): Promise<number> {
  const status = await client.client.status().do();
  // Algod may return either camelCase or hyphenated keys depending on the transport.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statusAny = status as any;
  const lastRound = statusAny.lastRound ?? statusAny["last-round"];
  if (typeof lastRound === "undefined") {
    throw new Error("Unable to determine current round from algod status response");
  }

  const round = typeof lastRound === "bigint" ? Number(lastRound) : Number(lastRound);
  if (Number.isNaN(round)) {
    throw new Error("Algod status did not contain a numeric round value");
  }

  return round;
}

/**
 * Creates an atomic transaction group for a payment
 *
 * @param client - The Algorand client
 * @param from - The sender's address
 * @param to - The recipient's address
 * @param amount - The payment amount in microAlgos
 * @param firstRound - The first valid round
 * @param lastRound - The last valid round
 * @param assetIndex - Optional asset ID for ASA transfers
 * @param feePayer - Optional fee payer address for pooled-fee execution
 * @returns An object containing the user transaction and, when applicable, the fee payer transaction
 */
async function createAtomicTransactionGroup(
  client: AlgorandClient,
  from: string,
  to: string,
  amount: number,
  firstRound: number,
  lastRound: number,
  assetIndex?: number,
  feePayer?: string,
): Promise<AtomicTransactionGroup> {
  const standardFee = 1000;

  const params = await client.client.getTransactionParams().do();

  params.firstValid = BigInt(firstRound);
  params.lastValid = BigInt(lastRound);
  params.flatFee = true;
  params.fee = BigInt(feePayer ? 0 : standardFee);

  let userTransaction;
  if (assetIndex) {
    userTransaction = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: from,
      receiver: to,
      amount: amount,
      assetIndex: assetIndex,
      closeRemainderTo: undefined,
      note: undefined,
      suggestedParams: params,
    });
  } else {
    userTransaction = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: from,
      receiver: to,
      amount: amount,
      suggestedParams: params,
    });
  }

  if (feePayer) {
    const feePayerParams = { ...params };
    feePayerParams.fee = BigInt(standardFee * 2);

    const feePayerTransaction = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: feePayer,
      receiver: feePayer,
      amount: 0,
      suggestedParams: feePayerParams,
    });

    const txns = [userTransaction, feePayerTransaction];
    algosdk.assignGroupID(txns);

    return {
      paymentIndex: 1,
      paymentGroup: txns.map(txn => Buffer.from(txn.toByte()).toString("base64")),
    };
  }
  const txns = [userTransaction];

  return {
    paymentIndex: 1,
    paymentGroup: txns.map(txn => Buffer.from(txn.toByte()).toString("base64")),
  };
}

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
  const currentRound = await getCurrentRound(client);
  const validityWindow = 1000;
  const firstRound = currentRound;
  const lastRound = currentRound + validityWindow;

  const amount = parseInt(paymentRequirements.maxAmountRequired, 10);
  const feePayer =
    (paymentRequirements.extra as { feePayer?: string } | undefined)?.feePayer || undefined;
  const atomicGroup = await createAtomicTransactionGroup(
    client,
    from,
    paymentRequirements.payTo,
    amount,
    firstRound,
    lastRound,
    paymentRequirements.asset ? parseInt(paymentRequirements.asset as string, 10) : undefined,
    feePayer,
  );

  return atomicGroup;
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

  const txnGroupBytes: Uint8Array[] = paymentGroup.map(pg => Buffer.from(pg, "base64"));

  const indexesToSign = [paymentIndex];
  const signedTxnGroup = await wallet.signTransactions(txnGroupBytes, indexesToSign);
  const signedUserTxn = signedTxnGroup[0];
  if (!signedUserTxn) {
    throw new Error("Wallet did not return a signed user transaction");
  }

  const signedTransaction = Buffer.from(signedUserTxn).toString("base64");
  const payload: ExactAvmPayload = paymentRequirements?.extra?.feePayer
    ? {
      paymentIndex: 1,
      paymentGroup: [
        signedTransaction,
        paymentGroup[1],
      ],
    }
    : {
      paymentIndex: 1,
      paymentGroup: [signedTransaction],
    };

  return {
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
