"use client";

import { useCallback, useEffect, useState } from "react";
import { ShareModal } from "./_components/ShareModal";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { NextPage } from "next";
import { TypedDataDefinition } from "viem";
import { useAccount, useSignMessage, useSignTypedData } from "wagmi";
import { SignatureMessage } from "~~/components/signatorio/SignatureMessage";
import { SignaturesList } from "~~/components/signatorio/SignaturesList";
import { useSignatureVerification } from "~~/hooks/signatorio/useSignatureVerification";
import { messagesTable, signaturesTable } from "~~/services/db/schema";

const ViewSignature: NextPage<{ params: { id: string } }> = ({ params }: { params: { id: string } }) => {
  const { id } = params;
  const { address, chain } = useAccount();
  const { openConnectModal } = useConnectModal();

  const [message, setMessage] = useState<string | null>(null);
  const [typedData, setTypedData] = useState<TypedDataDefinition | null>(null);
  const [signatures, setSignatures] = useState<string[]>([]);
  const [addresses, setAddresses] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const shareUrl = `${window.location.origin}/view/${id}`;

  const addressChecks = useSignatureVerification(message, typedData, signatures, addresses);

  const { signMessage } = useSignMessage({
    mutation: {
      onSuccess: async signature => {
        await submitSignature(signature);
      },
    },
  });

  const { signTypedData } = useSignTypedData({
    mutation: {
      onSuccess: async signature => {
        await submitSignature(signature);
      },
    },
  });

  const fetchMessage = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(`/api/signatures/${id}`);

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const { message, signatures } = (await res.json()) as {
        message: typeof messagesTable.$inferSelect;
        signatures: (typeof signaturesTable.$inferSelect)[];
      };

      if (!message) {
        throw new Error("Message not found");
      }

      if (message.type === "text") {
        setMessage(message.message);
      } else if (message.type === "typed_data") {
        try {
          setTypedData(JSON.parse(message.message));
        } catch (e) {
          throw new Error("Invalid typed data format");
        }
      } else {
        throw new Error("Invalid message type");
      }

      setSignatures(signatures?.map(s => s.signature) ?? []);
      setAddresses(signatures?.map(s => s.signer) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const submitSignature = async (signature: string) => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (!chain) {
        throw new Error("Chain not connected");
      }

      const response = await fetch(`/api/signatures/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signature,
          signer: address,
          chainId: chain.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit signature");
      }

      await fetchMessage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit signature");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSign = async () => {
    if (!address) {
      setError("Please connect your wallet first");
      return;
    }

    try {
      if (message) {
        await signMessage({ message });
      } else if (typedData) {
        await signTypedData(typedData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign message");
    }
  };

  useEffect(() => {
    fetchMessage();
  }, [fetchMessage]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center flex-grow">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center flex-grow">
        <div className="px-5 container max-w-screen-sm">
          <div className="alert alert-error">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      </div>
    );
  }

  const addSignatureButtonText = () => {
    if (!address) return "Connect Wallet";
    if (addresses.includes(address)) return "Already Signed";
    if (isSubmitting) return "Signing...";
    return "Sign Message";
  };

  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <div className="px-5 container max-w-screen-sm">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body gap-4">
            <SignatureMessage message={message} typedData={typedData} />
            <SignaturesList signatures={signatures} addresses={addresses} addressChecks={addressChecks} />

            <div className="card-actions justify-end mt-4 gap-2">
              <button className="btn btn-secondary" onClick={() => setIsShareModalOpen(true)}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                Share
              </button>
              <button
                className={`btn btn-primary ${isSubmitting ? "loading" : ""}`}
                onClick={address ? handleSign : openConnectModal}
                disabled={isSubmitting || (!!address && addresses.includes(address))}
              >
                {addSignatureButtonText()}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} url={shareUrl} />
    </div>
  );
};

export default ViewSignature;
