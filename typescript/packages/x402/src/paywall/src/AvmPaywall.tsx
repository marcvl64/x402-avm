import { useCallback, useEffect, useState, useMemo } from "react";
import algosdk from "algosdk";

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
  const [accountBalance, setAccountBalance] = useState<number | null>(null);

  // Create Algorand client
  const algodClient = useMemo(() => {
    const network = paymentRequirement.network as "algorand-mainnet" | "algorand-testnet";
    const baseServer =
      network === "algorand-mainnet"
        ? "https://mainnet-api.algonode.cloud"
        : "https://testnet-api.algonode.cloud";

    return new algosdk.Algodv2("", baseServer, "");
  }, [paymentRequirement.network]);

  const { activeAddress, accounts, connecting, error, connect, disconnect, signTransactions } =
    useAlgorandWallet(
      paymentRequirement.network as "algorand-mainnet" | "algorand-testnet",
      algodClient,
    );

  const safeAccounts = accounts || [];
  const activeAccount = safeAccounts.find(account => account.address === activeAddress);
  const isConnected = !!activeAddress && !!activeAccount;
  const isLoading = connecting;

  const x402 = window.x402;
  const amount =
    typeof x402.amount === "number"
      ? x402.amount
      : Number(paymentRequirement.maxAmountRequired ?? 0) / 1_000_000;

  const network = paymentRequirement.network;
  const chainName = getNetworkDisplayName(network);

  const formattedBalance = accountBalance ? (accountBalance / 1_000_000).toFixed(2) : null;

  useEffect(() => {
    if (error) {
      setStatus(error);
    }
  }, [error]);

  // Fetch account balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!activeAccount?.address) {
        setAccountBalance(null);
        return;
      }

      try {
        const accountInfo = await algodClient.accountInformation(activeAccount.address).do();
        setAccountBalance(Number(accountInfo.amount));
      } catch (err) {
        console.error("Failed to fetch account balance:", err);
        setAccountBalance(null);
      }
    };

    fetchBalance();
  }, [activeAccount?.address, algodClient]);

  const handleConnect = useCallback(async () => {
    try {
      setStatus("Connecting to wallet...");
      await connect();
      setStatus("");
    } catch (error) {
      console.error("Failed to connect wallet", error);
      setStatus(error instanceof Error ? error.message : "Failed to connect wallet.");
    }
  }, [connect]);

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

      // Create wallet client for payment header creation
      const walletClient = {
        address: activeAccount.address,
        client: algodClient,
        signTransactions,
      };

      const algorandClient = {
        client: algodClient,
        network: paymentRequirement.network,
      };

      const createHeader = async (version: number) =>
        exact.avm.createPaymentHeader(
          algorandClient,
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
            algorandClient,
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
            <button className="button button-primary" onClick={handleConnect} disabled={isLoading}>
              {isLoading ? <Spinner /> : "Connect Pera Wallet"}
            </button>
          )}
          {isConnected && activeAccount && (
            <button className="button button-primary" onClick={handlePayment} disabled={isPaying}>
              {isPaying ? <Spinner /> : "Pay now"}
            </button>
          )}
        </div>

        {status && <div className="status">{status}</div>}
      </div>
    </div>
  );
}
