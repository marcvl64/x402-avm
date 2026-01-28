import { useCallback, useEffect, useState, useMemo, type ChangeEvent } from "react";
import algosdk from "algosdk";

import type { PaymentRequirements } from "../../types/verify";
import type { AlgorandClient, WalletAccount as AvmWalletAccount } from "../../schemes/exact/avm/types";
import { exact } from "../../schemes";

import { Spinner } from "./Spinner";
import { ensureValidAmount } from "./utils";
import { getNetworkDisplayName } from "./paywallUtils";
import { useAlgorandWallet, type AlgorandNetwork } from "./useAlgorandWallet";

const ALGOD_ENDPOINTS = {
  "algorand-mainnet": "https://mainnet-api.algonode.cloud",
  "algorand-testnet": "https://testnet-api.algonode.cloud",
} as const;

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
  const [formattedBalance, setFormattedBalance] = useState<string>("");

  const x402 = window.x402;

  // Extract asset and decimals from payment requirements
  const assetId = paymentRequirement.asset ?? "0";
  const decimals = Number(
    (paymentRequirement.extra as { decimals?: number } | undefined)?.decimals ?? 6,
  );
  const feePayer = (paymentRequirement.extra as { feePayer?: string } | undefined)?.feePayer;

  // Calculate amount based on decimals
  const amount =
    typeof x402.amount === "number"
      ? x402.amount
      : Number(paymentRequirement.maxAmountRequired ?? 0) / 10 ** decimals;

  const network = paymentRequirement.network as keyof typeof ALGOD_ENDPOINTS;
  const chainName = getNetworkDisplayName(network);
  const assetLabel = assetId === "0" ? "ALGO" : "USDC";

  // Create Algorand client
  const algodServer =
    network in ALGOD_ENDPOINTS ? ALGOD_ENDPOINTS[network] : ALGOD_ENDPOINTS["algorand-mainnet"];
  const algodClient = useMemo(() => new algosdk.Algodv2("", algodServer, ""), [algodServer]);

  const algorandClient = useMemo<AlgorandClient>(
    () => ({
      client: algodClient,
      network: paymentRequirement.network,
    }),
    [algodClient, paymentRequirement.network],
  );

  const algorandNetwork = paymentRequirement.network as AlgorandNetwork;
  const {
    activeAddress,
    accounts,
    connecting,
    error: walletError,
    connect,
    disconnect,
    signTransactions,
    setActiveAccount,
  } = useAlgorandWallet(algorandNetwork, algodClient);

  const validPaymentRequirements = useMemo(
    () => ensureValidAmount(paymentRequirement),
    [paymentRequirement],
  );

  // Fetch balance for the active address - handles both ALGO and ASA
  const fetchBalance = useCallback(
    async (address: string) => {
      try {
        const info = await algodClient.accountInformation(address).do();

        if (!assetId || assetId === "0") {
          // Native ALGO balance
          const microBalance = Number(info?.amount?.toString()) ?? 0;
          const display = (microBalance / 10 ** 6).toFixed(6);
          setFormattedBalance(display);
        } else {
          // ASA balance
          const parsedId = parseInt(assetId, 10);
          type AssetInfo = { "asset-id": number; amount?: number };
          const assets = (info.assets as unknown as AssetInfo[]) || [];
          const holding = assets.find(asset => asset["asset-id"] === parsedId);
          const amountRaw = Number(holding?.amount?.toString()) ?? 0;
          const display = (amountRaw / 10 ** decimals).toFixed(decimals);
          setFormattedBalance(display);
        }
      } catch (error) {
        console.error("Failed to fetch Algorand balance", error);
        setFormattedBalance("");
      }
    },
    [algodClient, assetId, decimals],
  );

  useEffect(() => {
    if (activeAddress) {
      fetchBalance(activeAddress);
    }
  }, [activeAddress, fetchBalance]);

  useEffect(() => {
    if (walletError) {
      setStatus(walletError);
    }
  }, [walletError]);

  const handleConnect = useCallback(async () => {
    try {
      setStatus("");
      await connect();
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

  const handleAccountSelect = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const nextAccount = accounts.find(account => account.address === event.target.value);
      setActiveAccount(nextAccount);
    },
    [accounts, setActiveAccount],
  );

  const signWithActiveWallet = useCallback(
    async (
      transactions: Uint8Array[],
      indexesToSign?: number[],
    ): Promise<(Uint8Array | null)[]> => {
      return signTransactions(transactions, indexesToSign);
    },
    [signTransactions],
  );

  const handlePayment = useCallback(async () => {
    if (!x402) {
      return;
    }

    if (!activeAddress) {
      setStatus("Please connect an Algorand wallet");
      return;
    }

    setIsPaying(true);

    try {
      const activeAccountDetails = accounts.find(account => account.address === activeAddress);
      const walletAccount: AvmWalletAccount = {
        address: activeAddress,
        name: activeAccountDetails?.name,
        client: algodClient,
        signTransactions: signWithActiveWallet,
      };

      const attemptPayment = async (version: number) => {
        setStatus("Creating payment transaction...");

        // Create and sign the payment using the exact.avm scheme
        const payment = await exact.avm.createPayment(
          algorandClient,
          walletAccount,
          version,
          validPaymentRequirements,
        );

        // Encode the payment for the X-PAYMENT header
        const header = exact.avm.encodePayment(payment);

        setStatus("Submitting payment...");
        const response = await fetch(x402.currentUrl, {
          headers: {
            "X-PAYMENT": header,
            "Access-Control-Expose-Headers": "X-PAYMENT-RESPONSE",
          },
        });

        if (response.ok) {
          await onSuccessfulResponse(response);
          return true;
        }

        if (response.status === 402) {
          const errorData = await response.json().catch(() => ({}));
          const updatedVersion =
            typeof errorData.x402Version === "number" ? errorData.x402Version : null;

          if (updatedVersion && updatedVersion !== version) {
            return attemptPayment(updatedVersion);
          }

          // Extract error message from response
          let errorMessage = `Payment failed: ${response.statusText}`;
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.errorReason) {
            errorMessage = `Payment failed: ${errorData.errorReason}`;
          }
          throw new Error(errorMessage);
        }

        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      };

      await attemptPayment(1);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Payment failed.");
    } finally {
      setIsPaying(false);
    }
  }, [
    x402,
    activeAddress,
    accounts,
    algorandClient,
    algodClient,
    validPaymentRequirements,
    onSuccessfulResponse,
    signWithActiveWallet,
  ]);

  const formattedAddress = activeAddress
    ? `${activeAddress.slice(0, 5)}...${activeAddress.slice(-5)}`
    : "Not connected";

  return (
    <div className="container gap-8">
      <div className="header">
        <h1 className="title">Payment Required</h1>
        <p>
          {paymentRequirement.description && `${paymentRequirement.description}.`} To access this
          content, please pay {amount} {assetLabel} on {chainName}.
        </p>
        {network === "algorand-testnet" && (
          <>
            <p className="instructions">
              Need Algorand Testnet Algos?{" "}
              <a
                href="https://bank.testnet.algorand.network"
                target="_blank"
                rel="noopener noreferrer"
              >
                Request them <u>here</u>.
              </a>
            </p>
            <p className="instructions">
              Need Algorand Testnet USDC funds?{" "}
              <a href="https://faucet.circle.com/" target="_blank" rel="noopener noreferrer">
                Request them <u>here</u>.
              </a>
            </p>
          </>
        )}
      </div>

      <div className="content w-full">
        {!activeAddress ? (
          <div className="payment-details">
            <button className="button button-primary" onClick={handleConnect} disabled={connecting}>
              {connecting ? <Spinner /> : "Connect Pera Wallet"}
            </button>
            {status && !connecting && <div className="status">{status}</div>}
          </div>
        ) : (
          <div id="payment-section">
            <div className="payment-details">
              <div className="payment-row">
                <span className="payment-label">Wallet:</span>
                <span className="payment-value">{formattedAddress}</span>
              </div>
              {accounts.length > 1 && (
                <div className="payment-row">
                  <span className="payment-label">Account:</span>
                  <span className="payment-value">
                    <select
                      value={activeAddress}
                      onChange={handleAccountSelect}
                      className="account-select"
                    >
                      {accounts.map(account => {
                        const short = `${account.address.slice(0, 5)}...${account.address.slice(-5)}`;
                        const label = account.name ? `${account.name} (${short})` : short;
                        return (
                          <option key={account.address} value={account.address}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </span>
                </div>
              )}
              <div className="payment-row">
                <span className="payment-label">Available balance:</span>
                <span className="payment-value">
                  <button className="balance-button" onClick={() => setHideBalance(prev => !prev)}>
                    {formattedBalance && !hideBalance
                      ? `${formattedBalance} ${assetLabel}`
                      : "•••••"}
                  </button>
                </span>
              </div>
              <div className="payment-row">
                <span className="payment-label">Amount:</span>
                <span className="payment-value">
                  {amount} {assetLabel}
                </span>
              </div>
              <div className="payment-row">
                <span className="payment-label">Network:</span>
                <span className="payment-value">{chainName}</span>
              </div>
              {feePayer && (
                <div className="payment-row">
                  <span className="payment-label">Fees covered by:</span>
                  <span className="payment-value">
                    {`${feePayer.slice(0, 6)}...${feePayer.slice(-6)}`}
                  </span>
                </div>
              )}
            </div>

            <div className="cta-container">
              <button className="button" onClick={handleDisconnect}>
                Disconnect wallet
              </button>
              <button className="button button-primary" onClick={handlePayment} disabled={isPaying}>
                {isPaying ? <Spinner /> : "Pay now"}
              </button>
            </div>
          </div>
        )}
        {status && activeAddress && <div className="status">{status}</div>}
      </div>
    </div>
  );
}
