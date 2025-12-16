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
 * Decodes a base64-encoded signed transaction string into an Algorand transaction object
 *
 * @param encodedTxn - The base64-encoded signed transaction string
 * @returns The decoded Algorand signed transaction
 */
function decodeSignedTransaction(encodedTxn: string): algosdk.SignedTransaction {
  const txnBytes = Buffer.from(encodedTxn, "base64");
  const decodedSignedTxn = algosdk.decodeSignedTransaction(txnBytes);
  return decodedSignedTxn;
}

/**
 * Decodes a base64-encoded unsigned transaction string into an Algorand transaction object
 *
 * @param encodedTxn - The base64-encoded unsigned transaction string
 * @returns The decoded Algorand transaction
 */
function decodeTransaction(encodedTxn: string): algosdk.Transaction {
  const txnBytes = Buffer.from(encodedTxn, "base64");
  return algosdk.decodeUnsignedTransaction(txnBytes);
}

/**
 * Gets the current round from the Algorand client
 *
 * @param client - The Algorand client
 * @returns The current round number
 */
async function getCurrentRound(client: AlgorandClient): Promise<number> {
  const status = await client.client.status().do();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statusAny = status as any;
  const lastRound = statusAny.lastRound || statusAny["last-round"];
  return typeof lastRound === "bigint" ? Number(lastRound) : lastRound;
}

/**
 * Verifies a payment payload against the required payment details according to the AVM exact specification
 *
 * This function performs the following verification steps in order:
 * 1. Check the paymentGroup contains 16 or fewer elements
 * 2. Decode all transactions from the paymentGroup
 * 3. Locate the paymentGroup[paymentIndex] transaction from the Payment Payload
 *    - Check the amount matches maxAmountRequired from the Payment Requirements
 *    - Check the receiver matches payTo from the Payment Requirements
 * 4. Locate all transactions where sender is the Facilitator's Algorand address
 *    - Check the type is pay
 *    - Check the following fields are omitted: close, rekey, amt
 *    - Check the fee is a reasonable amount
 *    - Sign the transaction
 * 5. Evaluate the payment group against an Algorand node's simulate endpoint (future implementation)
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

    // Step 1: Check the paymentGroup contains 16 or fewer elements
    if (
      !exactAvmPayload ||
      !exactAvmPayload.paymentGroup ||
      exactAvmPayload.paymentGroup.length > 16
    ) {
      console.error("Verification failed: Payment group exceeds maximum size or is missing");
      return {
        isValid: false,
        invalidReason: "invalid_exact_avm_payload_atomic_group",
      };
    }

    // Step 2: Decode all transactions from the paymentGroup
    const decodedTransactions: algosdk.SignedTransaction[] = [];
    for (let i = 0; i < exactAvmPayload.paymentGroup.length; i++) {
      try {
        const txnBase64 = exactAvmPayload.paymentGroup[i];
        // Try to decode as signed transaction first
        try {
          const signedTxn = decodeSignedTransaction(txnBase64);
          decodedTransactions.push(signedTxn);
        } catch {
          // If not signed, try as unsigned transaction
          const txn = decodeTransaction(txnBase64);
          const encodedUnsignedSimulateTransaction = algosdk.encodeUnsignedSimulateTransaction(txn);
          const decodedUnsignedTxn = algosdk.decodeSignedTransaction(
            encodedUnsignedSimulateTransaction,
          );
          decodedTransactions.push(decodedUnsignedTxn);
        }
      } catch (error) {
        console.error(`Failed to decode transaction at index ${i}:`, error);
        return {
          isValid: false,
          invalidReason: "invalid_exact_avm_payload_transaction",
        };
      }
    }

    // Step 3: Locate the paymentGroup[paymentIndex] transaction from the Payment Payload
    if (exactAvmPayload.paymentIndex >= exactAvmPayload.paymentGroup.length) {
      console.error("Payment index out of bounds");
      return {
        isValid: false,
        invalidReason: "invalid_exact_avm_payload_transaction",
      };
    }

    const paymentTxn = decodedTransactions[exactAvmPayload.paymentIndex];
    const transaction = "txn" in paymentTxn ? paymentTxn.txn : paymentTxn;
    payer = transaction.sender.toString();

    // Extract receiver and amount from the payment transaction
    let to: string | undefined;
    let amount = 0;
    let assetId: number | undefined;

    if (transaction.type === algosdk.TransactionType.pay) {
      const paymentFields = transaction.payment;
      if (!paymentFields) {
        console.error("Missing payment fields in transaction");
        return {
          isValid: false,
          invalidReason: "invalid_exact_avm_payload_transaction",
          payer,
        };
      }
      to = paymentFields.receiver.toString();
      amount = Number(paymentFields.amount ?? 0n);
    } else if (transaction.type === algosdk.TransactionType.axfer) {
      const assetFields = transaction.assetTransfer;
      if (!assetFields) {
        console.error("Missing asset transfer fields in transaction");
        return {
          isValid: false,
          invalidReason: "invalid_exact_avm_payload_transaction",
          payer,
        };
      }
      to = assetFields.receiver.toString();
      amount = Number(assetFields.amount ?? 0n);
      assetId = assetFields.assetIndex ? Number(assetFields.assetIndex) : undefined;
    } else {
      console.error("Unsupported transaction type for payment transaction:", transaction.type);
      return {
        isValid: false,
        invalidReason: "invalid_exact_avm_payload_transaction",
        payer,
      };
    }

    // Step 3.1: Check the amount matches maxAmountRequired from the Payment Requirements
    const requiredAmount = parseInt(paymentRequirements.maxAmountRequired, 10);
    if (amount !== requiredAmount) {
      console.error("Transaction amount does not match required amount:", amount, requiredAmount);
      return {
        isValid: false,
        invalidReason: "invalid_exact_avm_payload_amount",
        payer,
      };
    }

    // Step 3.2: Check the receiver matches payTo from the Payment Requirements
    if (to !== paymentRequirements.payTo) {
      console.error(
        "Recipient address does not match payment requirements:",
        to,
        paymentRequirements.payTo,
      );
      return {
        isValid: false,
        invalidReason: "invalid_exact_avm_payload_recipient",
        payer,
      };
    }

    // Step 4: Locate all transactions where sender is the Facilitator's Algorand address
    const feePayer = (paymentRequirements.extra as { feePayer?: string } | undefined)?.feePayer;
    if (feePayer) {
      const facilitatorTxns = decodedTransactions.filter(txn => {
        const t = "txn" in txn ? txn.txn : txn;
        return t.sender.toString() === feePayer;
      });

      // Step 4.1: Check each facilitator transaction
      for (const fTxn of facilitatorTxns) {
        const t = "txn" in fTxn ? fTxn.txn : fTxn;

        // Step 4.2: Check the type is pay
        if (t.type !== algosdk.TransactionType.pay) {
          console.error("Facilitator transaction is not a payment transaction");
          return {
            isValid: false,
            invalidReason: "invalid_exact_avm_payload_fee_structure",
            payer,
          };
        }

        // Step 4.3: Check the following fields are omitted: close, rekey, amt
        if (("closeRemainderTo" in t && t.closeRemainderTo) || ("rekeyTo" in t && t.rekeyTo)) {
          console.error("Facilitator transaction contains close or rekey fields");
          return {
            isValid: false,
            invalidReason: "invalid_exact_avm_payload_fee_structure",
            payer,
          };
        }

        if (t.payment && Number(t.payment.amount ?? 0n) !== 0) {
          console.error("Facilitator transaction contains non-zero amount");
          return {
            isValid: false,
            invalidReason: "invalid_exact_avm_payload_fee_structure",
            payer,
          };
        }

        // Step 4.4: Check the fee is a reasonable amount
        if (Number(t.fee) < 1000) {
          console.error("Facilitator transaction fee is too low");
          return {
            isValid: false,
            invalidReason: "invalid_exact_avm_payload_fee_structure",
            payer,
          };
        }
      }
    }

    // Additional verification for ASA transfers
    if (paymentRequirements.asset) {
      const requiredAssetId = parseInt(paymentRequirements.asset as string, 10);

      // Verify asset ID matches
      if (Number(requiredAssetId) !== 0 && assetId !== requiredAssetId) {
        console.error("Asset ID does not match payment requirements:", assetId, requiredAssetId);
        return {
          isValid: false,
          invalidReason: "invalid_exact_avm_payload_asset_id",
          payer,
        };
      }

      // Check ASA opt-in status
      if (requiredAssetId !== 0) {
        try {
          // Check if recipient has opted in
          const assetInfo = await client.client.accountAssetInformation(paymentRequirements.payTo, requiredAssetId).do();
          if (!assetInfo.assetHolding) {
            console.error("Recipient has not opted in to the ASA");
            return {
              isValid: false,
              invalidReason: "invalid_exact_avm_payload_asa_opt_in_required",
              payer,
            };
          }
        } catch (assetError) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const status = (assetError as any)?.response?.statusCode ?? (assetError as any)?.statusCode;
          if (status === 404) {
            console.error("Recipient has not opted in to the ASA");
            return {
              isValid: false,
              invalidReason: "invalid_exact_avm_payload_asa_opt_in_required",
              payer,
            };
          }
          console.error("Error fetching asset information:", assetError);
          throw assetError;
        }
      }
    }

    // Step 5: Validate round validity
    const currentRound = await getCurrentRound(client);
    const firstRound = Number(transaction.firstValid);
    const lastRound = Number(transaction.lastValid);

    if (firstRound > currentRound || lastRound < currentRound) {
      console.error("Transaction not valid in current round:", currentRound, firstRound, lastRound);
      return {
        isValid: false,
        invalidReason: "invalid_exact_avm_payload_round_validity",
        payer,
      };
    }

    // Step 6: Evaluate the payment group against simulation
    try {
      const request = new algosdk.modelsv2.SimulateRequest({
        txnGroups: [
          new algosdk.modelsv2.SimulateRequestTransactionGroup({
            txns: decodedTransactions,
          }),
        ],
      });
      const simulationResult = await client.client.simulateTransactions(request).do();

      if (!simulationResult.txnGroups) {
        console.error("Transaction simulation failed:", simulationResult.txnGroups);
        // Use our new invalidReason for simulation failures
        return {
          isValid: false,
          invalidReason: "invalid_exact_avm_payload_simulation",
          payer,
        };
      }
    } catch (simulationError) {
      console.error("Error during transaction simulation:", simulationError);
      // As per exact spec, if simulation fails, verification must fail with a valid invalidReason
      return {
        isValid: false,
        invalidReason: "invalid_exact_avm_payload_simulation_error",
        payer
      };
    }

    // If all checks pass, the payment is valid
    return {
      isValid: true,
      payer,
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
 * Settlement steps:
 * 1. Verify the payment payload is valid using the verify function
 * 2. For transactions with a fee payer, sign the fee payer transaction
 * 3. Submit the transaction group to the Algorand network
 * 4. Return the transaction ID as proof of payment
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
    if (!exactAvmPayload || !exactAvmPayload.paymentGroup || exactAvmPayload.paymentIndex >= exactAvmPayload.paymentGroup.length) {
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
      console.error("Payment validation failed:", validationResult);
      return {
        success: false,
        errorReason: validationResult.invalidReason,
        transaction: "",
        network: paymentPayload.network,
        payer: validationResult.payer || payer,
      };
    }

    // Extract payment transaction and determine payer
    const signedPaymentTxn = decodeSignedTransaction(exactAvmPayload.paymentGroup[exactAvmPayload.paymentIndex]);
    payer = signedPaymentTxn.txn.sender.toString();

    // Prepare the transaction group for submission
    const txnGroupBytes: Uint8Array[] = [];
    const feePayer = (paymentRequirements.extra as { feePayer?: string } | undefined)?.feePayer;

    // If there's a fee payer, identify and sign those transactions
    if (feePayer) {
      for (let i = 0; i < exactAvmPayload.paymentGroup.length; i++) {
        const txnBase64 = exactAvmPayload.paymentGroup[i];

        try {
          // Try to decode as signed transaction
          const signedTxn = decodeSignedTransaction(txnBase64);
          txnGroupBytes.push(Buffer.from(txnBase64, "base64"));
        } catch {
          // If not signed, it might be a fee payer transaction that needs signing
          const unsignedTxn = decodeTransaction(txnBase64);

          if (unsignedTxn.sender.toString() === feePayer) {
            // This is a facilitator transaction that needs signing
            const signedFeePayerTxn = await wallet.signTransactions([unsignedTxn.toByte()]);

            if (!signedFeePayerTxn[0]) {
              console.error("Fee payer transaction signing failed");
              return {
                success: false,
                errorReason: "settle_exact_avm_transaction_failed",
                transaction: "",
                network: paymentPayload.network,
                payer,
              };
            }

            txnGroupBytes.push(signedFeePayerTxn[0]);
          } else {
            // Unexpected unsigned transaction
            console.error("Unexpected unsigned transaction in group");
            return {
              success: false,
              errorReason: "invalid_exact_avm_payload_transaction",
              transaction: "",
              network: paymentPayload.network,
              payer,
            };
          }
        }
      }
    } else {
      // No fee payer, just use the signed user transaction
      txnGroupBytes.push(Buffer.from(exactAvmPayload.paymentGroup[exactAvmPayload.paymentIndex], "base64"));
    }

    // Submit the transaction group to the Algorand network
    const result = await wallet.client.sendRawTransaction(txnGroupBytes).do();

    // Return the transaction ID as proof of payment
    return {
      success: true,
      transaction: result.txid,
      network: paymentPayload.network,
      payer,
    };
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
