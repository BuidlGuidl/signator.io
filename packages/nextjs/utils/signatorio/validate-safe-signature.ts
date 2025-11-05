import Safe from "@safe-global/protocol-kit";
import { hashSafeMessage } from "@safe-global/protocol-kit";
import { hashMessage } from "viem";
import type { Address } from "viem";
import { getAlchemyHttpUrl } from "~~/utils/scaffold-eth/networks";

export type EIP712TypedData = {
  domain: {
    name?: string;
    version?: string;
    chainId?: number;
    verifyingContract?: string;
  };
  types: Record<string, Array<{ name: string; type: string }>>;
  message: Record<string, any>;
};

/**
 * Validates a Safe signature
 * @param chainId - The chain ID where the Safe is deployed
 * @param safeAddress - The Safe contract address
 * @param message - The message (either string or typed data)
 * @param signature - The signature to validate
 * @param messageType - Type of message: "text" or "typed_data"
 * @returns true if signature is valid, false otherwise
 */
export const validateSafeSignature = async ({
  chainId,
  safeAddress,
  message,
  signature,
  messageType,
}: {
  chainId: number;
  safeAddress: Address;
  message: string | EIP712TypedData;
  signature: string;
  messageType: "text" | "typed_data";
}): Promise<boolean> => {
  try {
    const providerUrl = getAlchemyHttpUrl(chainId);
    if (!providerUrl) {
      throw new Error(`No RPC URL available for chain ID ${chainId}`);
    }

    const protocolKit = await Safe.init({
      provider: providerUrl,
      safeAddress: safeAddress,
    });

    let safeMessage: string;

    if (messageType === "typed_data") {
      // For typed data, parse and hash it using Safe's hashSafeMessage
      const typedData = typeof message === "string" ? JSON.parse(message) : message;
      safeMessage = hashSafeMessage(typedData);
    } else {
      // For text messages, use standard EIP-191 message hashing
      // Safe wallets sign regular messages using EIP-191 format
      const messageText = typeof message === "string" ? message : JSON.stringify(message);
      safeMessage = hashMessage(messageText);
    }

    const isValidSignature = await protocolKit.isValidSignature(safeMessage, signature);
    return isValidSignature;
  } catch (error) {
    console.error("Error validating Safe signature:", error);
    return false;
  }
};
