import { useEffect, useState } from "react";
import { checkEip1271 } from "../../utils/signatorio/verify-signature";
import { hashSafeMessage } from "@safe-global/protocol-kit";
import {
  TypedDataDefinition,
  hashMessage,
  hashTypedData,
  isAddress,
  isHex,
  recoverMessageAddress,
  recoverTypedDataAddress,
} from "viem";
import { getCode } from "viem/actions";
import { useClient } from "wagmi";
import { SignatureStatus } from "~~/types/signatorio/signatures";

export const useSignatureVerification = (
  message: string | null,
  typedData: TypedDataDefinition | null,
  signatures: string[],
  addresses: string[],
) => {
  const client = useClient();
  const [addressChecks, setAddressChecks] = useState<SignatureStatus[]>([]);

  useEffect(() => {
    if (!client || (!message && !typedData) || !signatures.length || !addresses.length) return;

    const verifySignatures = async () => {
      const checks = await Promise.all(
        signatures.map(async (sig, index) => {
          if (index + 1 > addresses.length || !isAddress(addresses[index]) || !isHex(sig)) {
            return SignatureStatus.INVALID;
          }

          try {
            // Check if address is a contract (Safe wallet)
            const addressCode = await getCode(client, { address: addresses[index] });
            const isContract = addressCode !== undefined && addressCode !== "0x";

            if (isContract) {
              // Safe wallet signature verification
              let messageHash = null;
              if (typedData) {
                // Safe typed data: use hashSafeMessage
                const eip712TypedData = {
                  domain: typedData.domain || {},
                  types: typedData.types,
                  message: typedData.message,
                } as any;
                messageHash = hashSafeMessage(eip712TypedData);
              } else if (message) {
                // Safe regular message: use hashMessage
                messageHash = hashMessage(message);
              }

              if (!messageHash) return SignatureStatus.INVALID;
              return checkEip1271(client, addresses[index], messageHash, sig);
            } else {
              // EOA signature verification (existing logic)
              let signingAddress = null;
              if (message) {
                signingAddress = await recoverMessageAddress({ message, signature: sig });
              } else if (typedData) {
                signingAddress = await recoverTypedDataAddress({ ...typedData, signature: sig });
              }

              if (!signingAddress) return SignatureStatus.INVALID;
              if (signingAddress.toLowerCase() === addresses[index].toLowerCase()) {
                return SignatureStatus.MATCH;
              }

              // Try EIP-1271 as fallback for EOA
              let messageHash = null;
              if (message) {
                messageHash = hashMessage(message);
              } else if (typedData) {
                messageHash = hashTypedData(typedData);
              }

              if (!messageHash) return SignatureStatus.INVALID;
              return checkEip1271(client, addresses[index], messageHash, sig);
            }
          } catch (error) {
            console.error(`Signature verification failed for ${sig}:`, error);
            return SignatureStatus.INVALID;
          }
        }),
      );

      setAddressChecks(checks);
    };

    verifySignatures();
  }, [signatures, message, client, addresses, typedData]);

  return addressChecks;
};
