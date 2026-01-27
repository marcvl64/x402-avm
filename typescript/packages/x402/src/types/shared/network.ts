import { z } from "zod";

export const NetworkSchema = z.enum([
  "abstract",
  "abstract-testnet",
  "algorand-testnet",
  "algorand-mainnet",
  "base-sepolia",
  "base",
  "avalanche-fuji",
  "avalanche",
  "iotex",
  "solana-devnet",
  "solana",
  "sei",
  "sei-testnet",
  "polygon",
  "polygon-amoy",
  "peaq",
  "story",
  "educhain",
  "skale-base-sepolia",
]);
export type Network = z.infer<typeof NetworkSchema>;

// evm
export const SupportedEVMNetworks: Network[] = [
  "abstract",
  "abstract-testnet",
  "base-sepolia",
  "base",
  "avalanche-fuji",
  "avalanche",
  "iotex",
  "sei",
  "sei-testnet",
  "polygon",
  "polygon-amoy",
  "peaq",
  "story",
  "educhain",
  "skale-base-sepolia",
];
export const EvmNetworkToChainId = new Map<Network, number>([
  ["abstract", 2741],
  ["abstract-testnet", 11124],
  ["base-sepolia", 84532],
  ["base", 8453],
  ["avalanche-fuji", 43113],
  ["avalanche", 43114],
  ["iotex", 4689],
  ["sei", 1329],
  ["sei-testnet", 1328],
  ["polygon", 137],
  ["polygon-amoy", 80002],
  ["peaq", 3338],
  ["story", 1514],
  ["educhain", 41923],
  ["skale-base-sepolia", 324705682],
]);

// svm
export const SupportedSVMNetworks: Network[] = ["solana-devnet", "solana"];
export const SvmNetworkToChainId = new Map<Network, number>([
  ["solana-devnet", 103],
  ["solana", 101],
]);

// avm
export const SupportedAVMNetworks: Network[] = ["algorand-testnet", "algorand-mainnet"];
export const AvmNetworkToChainId = new Map<Network, number>([
  ["algorand-testnet", 416001],
  ["algorand-mainnet", 416002],
]);

/**
 * Checks if the provided network is an EVM-compatible network.
 *
 * @param network - The network to check
 * @returns True if the network is an EVM-compatible network, false otherwise
 */
export function isEvmNetwork(network: Network): network is (typeof SupportedEVMNetworks)[number] {
  return SupportedEVMNetworks.includes(network);
}

/**
 * Checks if the provided network is a Solana-compatible network.
 *
 * @param network - The network to check
 * @returns True if the network is a Solana-compatible network, false otherwise
 */
export function isSvmNetwork(network: Network): network is (typeof SupportedSVMNetworks)[number] {
  return SupportedSVMNetworks.includes(network);
}

/**
 * Checks if the provided network is an Algorand-compatible network.
 *
 * @param network - The network to check
 * @returns True if the network is an Algorand-compatible network, false otherwise
 */
export function isAvmNetwork(network: Network): network is (typeof SupportedAVMNetworks)[number] {
  return SupportedAVMNetworks.includes(network);
}

export const ChainIdToNetwork = Object.fromEntries(
  [...SupportedEVMNetworks, ...SupportedSVMNetworks, ...SupportedAVMNetworks].map(network => [
    EvmNetworkToChainId.get(network) ||
    SvmNetworkToChainId.get(network) ||
    AvmNetworkToChainId.get(network),
    network,
  ]),
) as Record<number, Network>;
