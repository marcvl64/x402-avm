import { useWallet } from "@txnlab/use-wallet";
import { useState, useEffect, useCallback } from "react";
import algosdk from "algosdk";

/**
 * Custom hook for Algorand wallet integration
 * Provides wallet connection, transaction signing, and account management
 *
 * @param network - The Algorand network to connect to
 * @returns Object with wallet state and functions
 */
export function useAlgorandWallet(
  network: "algorand-mainnet" | "algorand-testnet" = "algorand-testnet",
) {
  const { providers, activeAccount, isReady, isActive, signTransactions } = useWallet();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountBalance, setAccountBalance] = useState<number | null>(null);

  // Create Algorand client based on network
  const algodClient = new algosdk.Algodv2(
    "",
    network === "algorand-mainnet"
      ? "https://mainnet-api.algonode.cloud"
      : "https://testnet-api.algonode.cloud",
    "",
  );

  /**
   * Connect to an Algorand wallet provider
   */
  const connect = useCallback(
    async (providerId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const provider = providers?.find((p: any) => p.metadata?.id === providerId);
        if (!provider) {
          throw new Error(`Provider ${providerId} not found`);
        }

        await provider.connect();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Connection failed");
      } finally {
        setIsLoading(false);
      }
    },
    [providers],
  );

  /**
   * Disconnect from all wallet providers
   */
  const disconnect = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const activeProvider = providers?.find((p) => p.isActive);
      if (activeProvider) {
        await activeProvider.disconnect();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setIsLoading(false);
    }
  }, [providers]);

  /**
   * Fetch account information
   */
  const fetchAccountInfo = useCallback(async () => {
    if (!activeAccount?.address) return;

    try {
      const accountInfo = await algodClient.accountInformation(activeAccount.address).do();
      setAccountBalance(Number(accountInfo.amount));
    } catch (err) {
      console.error("Failed to fetch account info:", err);
      setAccountBalance(null);
    }
  }, [activeAccount?.address, algodClient]);

  /**
   * Initialize and fetch account information when connected
   */
  useEffect(() => {
    if (isActive && activeAccount) {
      fetchAccountInfo();
    } else {
      setAccountBalance(null);
    }
  }, [isActive, activeAccount, fetchAccountInfo]);

  return {
    // Connection state
    isConnected: isActive && !!activeAccount,
    activeAccount,
    providers,

    // Actions
    connect,
    disconnect,
    signTransactions,

    // Account information
    accountBalance,

    // Loading and error states
    isLoading: isLoading || !isReady,
    error,
  };
}