# x402 Algorand Implementation

This directory contains the implementation of the `exact` payment scheme for Algorand Virtual Machine (AVM) according to the new AVM exact specification. This implementation leverages Algorand's native atomic transaction groups for a clean and efficient approach to payment handling.

## Key Features

- Support for Algorand networks (mainnet, testnet)
- Implementation of the "exact" payment scheme using atomic transaction groups
- Support for flexible transaction groups with up to 16 transactions (Algorand's limit)
- Fee abstraction through facilitator fee-payer transactions
- ASA (Algorand Standard Asset) support with opt-in verification
- Comprehensive verification according to the AVM exact specification

## Components

### Client

The client implementation provides:

- `X402TransactionGroupBuilder`: An extension of Algorand's transaction handling to build payment groups

  - `addX402Payment`: Add a payment transaction (ALGO or ASA transfer)
  - `addX402FeePayment`: Add a fee payer transaction for fee abstraction
  - `buildGroup`: Create a complete transaction group with specified paymentIndex

- Payment creation functions:
  - `preparePaymentHeader`: Create an unsigned payment header
  - `signPaymentHeader`: Sign a payment header with a wallet
  - `createPayment`: Create a complete payment payload
  - `createPaymentHeader`: Create and encode a payment header

### Facilitator

The facilitator implementation handles:

- Verification: Follows the exact verification steps from the AVM exact specification:

  1. Check the paymentGroup contains 16 or fewer elements
  2. Decode all transactions from the paymentGroup
  3. Locate and verify the payment transaction using paymentIndex
  4. Verify payment amount and recipient
  5. Check facilitator transactions (type, fields, fee amount)
  6. Validate round validity
  7. Check ASA opt-in status

- Settlement: Handles the payment execution process:
  1. Verify the payment payload
  2. Sign facilitator transactions when needed
  3. Submit the transaction group to the Algorand network
  4. Return the transaction ID as proof of payment

### Utils

- `paymentUtils`: Provides utilities for encoding and decoding payment payloads

## Usage Example

### Creating a Payment

```typescript
import algosdk from "algosdk";
import { X402TransactionGroupBuilder, createPayment } from "@coinbase/x402/schemes/exact/avm";

// Initialize Algorand client
const algodClient = new algosdk.Algodv2("", "https://testnet-api.algonode.cloud", "");
const client = { client: algodClient, network: "algorand-testnet" };

// Create a wallet instance
const wallet = {
  address: "SENDER_ADDRESS",
  signTransactions: async (txns, indices) => {
    /* Your signing logic */
  },
  client: algodClient,
};

// Create payment requirements
const paymentRequirements = {
  scheme: "exact",
  network: "algorand-testnet",
  maxAmountRequired: "1000000", // 1 ALGO
  payTo: "RECEIVER_ADDRESS",
  maxTimeoutSeconds: 60,
  // For ASA transfers
  asset: "12345", // ASA ID
  // For fee abstraction
  extra: {
    feePayer: "FACILITATOR_ADDRESS",
  },
};

// Create payment
const payment = await createPayment(client, wallet, 1, paymentRequirements);

// Encode payment for X-PAYMENT header
const encodedPayment = encodePayment(payment);
```

### Custom Transaction Group Creation

```typescript
import { X402TransactionGroupBuilder } from "@coinbase/x402/schemes/exact/avm";

// Get transaction parameters
const params = await algodClient.getTransactionParams().do();

// Create transaction group builder
const builder = new X402TransactionGroupBuilder();

// Add fee payer transaction (optional, for fee abstraction)
builder.addX402FeePayment(
  "FACILITATOR_ADDRESS",
  2000, // Fee amount
  params,
);

// Add payment transaction
const paymentIndex = builder.addX402Payment(
  "SENDER_ADDRESS",
  "RECEIVER_ADDRESS",
  1000000, // Amount in microAlgos
  { ...params, fee: 0 }, // Fee covered by facilitator
  12345, // Optional ASA ID
);

// Build the transaction group
const txnGroup = builder.buildGroup(paymentIndex);
```

## Specification

This implementation follows the new AVM exact specification, which leverages Algorand's native atomic transaction groups. The key aspects of the specification are:

1. **Transaction Groups**: Use atomic transaction groups for payment and fee transactions
2. **PaymentIndex**: Identify the specific transaction that pays the resource server
3. **ASA Support**: Handle Algorand Standard Assets with opt-in verification
4. **Fee Abstraction**: Support fee abstraction through facilitator fee-payer transactions
