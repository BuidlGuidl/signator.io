"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SignMessage } from "./_components/SignMessage";
import { SignTypedData } from "./_components/SignTypedData";
import { TypedDataChecks, eip712Example } from "./_components/types";
import { NextPage } from "next";
import { useLocalStorage } from "usehooks-ts";
import { hashTypedData } from "viem";
import { useAccount } from "wagmi";
import { MessageType } from "~~/services/db/schema";
import { notification } from "~~/utils/scaffold-eth/notification";

const Home: NextPage = () => {
  const { address, chain } = useAccount();
  const router = useRouter();
  const [messageText, setMessageText] = useLocalStorage("messageText", "hello ethereum");
  const [typedData, setTypedData] = useLocalStorage("typedData", eip712Example);
  const [manualTypedData, setManualTypedData] = useLocalStorage(
    "manualTypedData",
    JSON.stringify(eip712Example, null, 4),
  );
  const [invalidJson, setInvalidJson] = useState(false);
  const [typedDataChecks, setTypedDataChecks] = useState<TypedDataChecks>({
    types: true,
    message: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typedData) {
      const checks: TypedDataChecks = {
        types: "types" in typedData,
        message: "message" in typedData,
      };
      try {
        checks.hash = hashTypedData(typedData);
      } catch (e) {
        console.log("failed to compute hash", e);
      }
      setTypedDataChecks(checks);
    }
  }, [typedData]);

  const handleSignature = async (signature: string, message: string, messageType: MessageType) => {
    if (!address || !chain) return;

    setIsSubmitting(true);
    const loadingToast = notification.loading("Received signature, verifying...");

    try {
      const res = await fetch("/api/signatures", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signature,
          message,
          messageType,
          address,
          chainId: chain.id,
        }),
      });

      if (res.ok) {
        const { messageId } = await res.json();
        notification.remove(loadingToast);
        router.push(`/view/${messageId}`);
      } else {
        const data = await res.json();
        notification.remove(loadingToast);
        notification.error(data.error || "Failed to create message with signature");
      }
    } catch (err) {
      notification.remove(loadingToast);
      notification.error(err instanceof Error ? err.message : "Failed to submit signature");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <div className="px-5 container max-w-screen-sm">
        <h1 className="text-center mb-4">
          <span className="block text-4xl font-bold">Signator.IO</span>
          <span className="block text-xl">Request & view signatures</span>
        </h1>

        <div className="flex flex-col">
          <SignMessage
            messageText={messageText}
            setMessageText={setMessageText}
            onSign={signature => handleSignature(signature, messageText, "text")}
            isSubmitting={isSubmitting}
          />

          <div className="divider">OR</div>

          <SignTypedData
            manualTypedData={manualTypedData}
            setManualTypedData={setManualTypedData}
            typedData={typedData}
            setTypedData={setTypedData}
            invalidJson={invalidJson}
            setInvalidJson={setInvalidJson}
            typedDataChecks={typedDataChecks}
            setTypedDataChecks={setTypedDataChecks}
            onSign={signature => handleSignature(signature, JSON.stringify(typedData), "typed_data")}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
};

export default Home;
