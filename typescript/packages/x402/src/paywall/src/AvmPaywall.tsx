import { useCallback, useEffect, useState } from "react";

import type { PaymentRequirements } from "../../types/verify";
import { exact } from "../../schemes";

import { Spinner } from "./Spinner";
import { ensureValidAmount } from "./utils";
import { getNetworkDisplayName } from "./paywallUtils";
import { useAlgorandWallet } from "./useAlgorandWallet";

type AvmPaywallProps = {
  paymentRequirement: PaymentRequirements;
  onSuccessfulResponse: (response: Response) => Promise<void>;
};

/**
 * Paywall experience for Algorand networks.
 *
 * @param props - Component props.
 * @param props.paymentRequirement - Payment requirement enforced for Algorand requests.
 * @param props.onSuccessfulResponse - Callback invoked on successful 402 response.
 * @returns JSX element.
 */
export function AvmPaywall({ paymentRequirement, onSuccessfulResponse }: AvmPaywallProps) {
  const [status, setStatus] = useState<string>("");
  const [isPaying, setIsPaying] = useState(false);
  const [hideBalance, setHideBalance] = useState(true);

  const {
    isConnected,
    activeAccount,
    providers,
    connect,
    disconnect,
    signTransactions,
    accountBalance,
    isLoading,
    error,
  } = useAlgorandWallet(paymentRequirement.network as "algorand-mainnet" | "algorand-testnet");

  const x402 = window.x402;
  const amount =
    typeof x402.amount === "number"
      ? x402.amount
      : Number(paymentRequirement.maxAmountRequired ?? 0) / 1_000_000;

  const network = paymentRequirement.network;
  const chainName = getNetworkDisplayName(network);

  const formattedBalance = accountBalance ? (accountBalance / 1_000_000).toFixed(2) : null;

  const [selectedWalletValue, setSelectedWalletValue] = useState<string>("");

  useEffect(() => {
    if (!selectedWalletValue && providers.length === 1) {
      setSelectedWalletValue(providers[0].id);
    }
  }, [providers, selectedWalletValue]);

  useEffect(() => {
    if (error) {
      setStatus(error);
    }
  }, [error]);

  const handleConnect = useCallback(async () => {
    const provider = providers.find(p => p.id === selectedWalletValue);
    if (!provider) {
      setStatus("Select an Algorand wallet to continue.");
      return;
    }

    try {
      setStatus("Connecting to wallet...");
      await connect(selectedWalletValue);
      setStatus("");
    } catch (error) {
      console.error("Failed to connect wallet", error);
      setStatus(error instanceof Error ? error.message : "Failed to connect wallet.");
    }
  }, [providers, selectedWalletValue, connect]);

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect();
      setStatus("");
    } catch (error) {
      console.error("Failed to disconnect wallet", error);
      setStatus(error instanceof Error ? error.message : "Failed to disconnect wallet.");
    }
  }, [disconnect]);

  const handlePayment = useCallback(async () => {
    if (!x402) {
      return;
    }

    if (!activeAccount || !signTransactions) {
      setStatus("Connect an Algorand wallet before paying.");
      return;
    }

    setIsPaying(true);

    try {
      if (!accountBalance || accountBalance < amount * 1_000_000) {
        throw new Error(`Insufficient balance. Make sure you have ALGO on ${chainName}.`);
      }

      setStatus("Creating payment transaction...");
      const validPaymentRequirements = ensureValidAmount(paymentRequirement);

      // Create a mock wallet client for the payment header creation
      const walletClient = {
        address: activeAccount.address,
        client: {} as any, // This would need to be a proper Algodv2 client
        signTransactions,
      };

      const createHeader = async (version: number) =>
        exact.avm.createPaymentHeader(
          { client: {} as any, network: paymentRequirement.network },
          walletClient,
          version,
          validPaymentRequirements,
        );

      const paymentHeader = await createHeader(1);

      setStatus("Requesting content with payment...");
      const response = await fetch(x402.currentUrl, {
        headers: {
          "X-PAYMENT": paymentHeader,
          "Access-Control-Expose-Headers": "X-PAYMENT-RESPONSE",
        },
      });

      if (response.ok) {
        await onSuccessfulResponse(response);
        return;
      }

      if (response.status === 402) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData && typeof errorData.x402Version === "number") {
          const retryPayment = await exact.avm.createPaymentHeader(
            { client: {} as any, network: paymentRequirement.network },
            walletClient,
            errorData.x402Version,
            validPaymentRequirements,
          );

          const retryResponse = await fetch(x402.currentUrl, {
            headers: {
              "X-PAYMENT": retryPayment,
              "Access-Control-Expose-Headers": "X-PAYMENT-RESPONSE",
            },
          });

          if (retryResponse.ok) {
            await onSuccessfulResponse(retryResponse);
            return;
          }

          throw new Error(
            `Payment retry failed: ${retryResponse.status} ${retryResponse.statusText}`,
          );
        }

        throw new Error(`Payment failed: ${response.statusText}`);
      }

      let errorMessage = `Payment failed: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.errorReason) {
          errorMessage = `Payment failed: ${errorData.errorReason}`;
        }
      } catch {
        // Use default error message if parsing fails
      }
      throw new Error(errorMessage);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Payment failed.");
    } finally {
      setIsPaying(false);
    }
  }, [
    x402,
    activeAccount,
    signTransactions,
    accountBalance,
    amount,
    chainName,
    paymentRequirement,
    onSuccessfulResponse,
  ]);

  return (
    <div className="container gap-8">
      <div className="header">
        <h1 className="title">Payment Required</h1>
        <p>
          {paymentRequirement.description && `${paymentRequirement.description}.`} To access this
          content, please pay ${amount} {chainName} USDC.
        </p>
        {network === "algorand-testnet" && (
          <p className="instructions">
            Need Algorand Testnet USDC?{" "}
            <a
              href="https://bank.testnet.algorand.network/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Request some <u>here</u>.
            </a>
          </p>
        )}
      </div>

      <div className="content w-full">
        <div className="payment-details">
          <div className="payment-row">
            <span className="payment-label">Wallet:</span>
            <span className="payment-value">
              {activeAccount
                ? `${activeAccount.address.slice(0, 6)}...${activeAccount.address.slice(-4)}`
                : "-"}
            </span>
          </div>
          <div className="payment-row">
            <span className="payment-label">Available balance:</span>
            <span className="payment-value">
              {activeAccount ? (
                <button className="balance-button" onClick={() => setHideBalance(prev => !prev)}>
                  {!hideBalance && formattedBalance
                    ? `$${formattedBalance} ALGO`
                    : isLoading
                      ? "Loading..."
                      : "••••• ALGO"}
                </button>
              ) : (
                "-"
              )}
            </span>
          </div>
          <div className="payment-row">
            <span className="payment-label">Amount:</span>
            <span className="payment-value">${amount} USDC</span>
          </div>
          <div className="payment-row">
            <span className="payment-label">Network:</span>
            <span className="payment-value">{chainName}</span>
          </div>
        </div>

        <div className="cta-container">
          {isConnected && activeAccount ? (
            <button className="button button-secondary" onClick={handleDisconnect}>
              Disconnect
            </button>
          ) : (
            <>
              <select
                className="input"
                value={selectedWalletValue}
                onChange={event => setSelectedWalletValue(event.target.value)}
              >
                <option value="" disabled>
                  Select a wallet
                </option>
                {providers.map(provider => (
                  <option value={provider.id} key={provider.id}>
                    {provider.metadata.name}
                  </option>
                ))}
              </select>
              <button
                className="button button-primary"
                onClick={handleConnect}
                disabled={!selectedWalletValue}
              >
                Connect wallet
              </button>
            </>
          )}
          {isConnected && activeAccount && (
            <button className="button button-primary" onClick={handlePayment} disabled={isPaying}>
              {isPaying ? <Spinner /> : "Pay now"}
            </button>
          )}
        </div>

        {!providers.length && (
          <div className="status">
            Install an Algorand wallet such as Pera to continue, then refresh this page.
          </div>
        )}

        {status && <div className="status">{status}</div>}
      </div>
    </div>
  );
}
