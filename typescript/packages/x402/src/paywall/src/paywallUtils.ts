import { selectPaymentRequirements } from "../../client";
import type { PaymentRequirements } from "../../types/verify";
import {
  Network,
  SupportedEVMNetworks,
  SupportedSVMNetworks,
  SupportedAVMNetworks,
} from "../../types/shared";

const EVM_TESTNETS = new Set<Network>(["base-sepolia"]);
const SVM_TESTNETS = new Set<Network>(["solana-devnet"]);
const AVM_TESTNETS = new Set<Network>(["algorand-testnet"]);

/**
 * Normalizes the payment requirements into an array.
 *
 * @param paymentRequirements - A single requirement or a list of requirements.
 * @returns An array of payment requirements.
 */
export function normalizePaymentRequirements(
  paymentRequirements: PaymentRequirements | PaymentRequirements[],
): PaymentRequirements[] {
  if (Array.isArray(paymentRequirements)) {
    return paymentRequirements;
  }
  return [paymentRequirements];
}

/**
 * Returns the preferred networks to attempt first when selecting a payment requirement.
 *
 * @param testnet - Whether the paywall is operating in testnet mode.
 * @returns Ordered list of preferred networks.
 */
export function getPreferredNetworks(testnet: boolean): Network[] {
  if (testnet) {
    return ["base-sepolia", "solana-devnet", "algorand-testnet"];
  }
  return ["base", "solana", "algorand-mainnet"];
}

/**
 * Selects the most appropriate payment requirement for the user.
 *
 * @param paymentRequirements - All available payment requirements.
 * @param testnet - Whether the paywall is operating in testnet mode.
 * @returns The selected payment requirement.
 */
export function choosePaymentRequirement(
  paymentRequirements: PaymentRequirements | PaymentRequirements[],
  testnet: boolean,
): PaymentRequirements {
  const normalized = normalizePaymentRequirements(paymentRequirements);
  const preferredNetworks = getPreferredNetworks(testnet);

  return selectPaymentRequirements([...normalized], preferredNetworks as Network[], "exact");
}

/**
 * Determines if the provided network is an EVM network.
 *
 * @param network - The network to check.
 * @returns True if the network is EVM based.
 */
export function isEvmNetwork(network: string): network is Network {
  return SupportedEVMNetworks.includes(network as Network);
}

/**
 * Determines if the provided network is an SVM network.
 *
 * @param network - The network to check.
 * @returns True if the network is SVM based.
 */
export function isSvmNetwork(network: string): network is Network {
  return SupportedSVMNetworks.includes(network as Network);
}

/**
 * Determines if the provided network is an AVM network.
 *
 * @param network - The network to check.
 * @returns True if the network is AVM based.
 */
export function isAvmNetwork(network: string): network is Network {
  return SupportedAVMNetworks.includes(network as Network);
}

/**
 * Provides a human-readable display name for a network.
 *
 * @param network - The network identifier.
 * @returns A display name suitable for UI use.
 */
export function getNetworkDisplayName(network: Network): string {
  switch (network) {
    case "base":
      return "Base";
    case "base-sepolia":
      return "Base Sepolia";
    case "solana":
      return "Solana";
    case "solana-devnet":
      return "Solana Devnet";
    case "algorand-mainnet":
      return "Algorand";
    case "algorand-testnet":
      return "Algorand Testnet";
    default:
      return network;
  }
}

/**
 * Indicates whether the provided network is a testnet.
 *
 * @param network - The network to evaluate.
 * @returns True if the network is a recognized testnet.
 */
export function isTestnetNetwork(network: Network): boolean {
  return EVM_TESTNETS.has(network) || SVM_TESTNETS.has(network) || AVM_TESTNETS.has(network);
}
