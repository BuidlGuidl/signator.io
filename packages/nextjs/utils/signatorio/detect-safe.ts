import { type Address, createPublicClient, fallback, http } from "viem";
import * as chains from "viem/chains";
import { getAlchemyHttpUrl } from "~~/utils/scaffold-eth/networks";

/**
 * Detects if an address is a contract (Safe wallets are contracts)
 * @param address - The address to check
 * @param chainId - The chain ID to query
 * @returns true if the address is a contract, false otherwise
 */
export const isContractAddress = async (address: Address, chainId: number): Promise<boolean> => {
  try {
    const alchemyHttpUrl = getAlchemyHttpUrl(chainId);
    const rpcFallbacks = alchemyHttpUrl ? [http(alchemyHttpUrl), http()] : [http()];

    // Find the chain from viem chains
    const chainNames = Object.keys(chains);
    const chain = chainNames.map(name => chains[name as keyof typeof chains]).find((c: any) => c?.id === chainId) as
      | chains.Chain
      | undefined;

    if (!chain) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    const publicClient = createPublicClient({
      chain,
      transport: fallback(rpcFallbacks),
    });

    const bytecode = await publicClient.getBytecode({ address });
    return bytecode !== undefined && bytecode !== "0x";
  } catch (error) {
    console.error("Error detecting contract address:", error);
    return false;
  }
};
