"use client";

import LoadingButton from "./LoadingButton";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount, useSignMessage } from "wagmi";
import { notification } from "~~/utils/scaffold-eth/notification";

type SignMessageProps = {
  messageText: string;
  setMessageText: (value: string) => void;
  onSign: (signature: string) => void;
  isSubmitting?: boolean;
};

export const SignMessage = ({ messageText, setMessageText, onSign, isSubmitting = false }: SignMessageProps) => {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { signMessageAsync, isPending } = useSignMessage();

  const handleSign = async () => {
    try {
      const signature = await signMessageAsync({ message: messageText });
      onSign(signature);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "User rejected the signature request";
      notification.error(errorMessage);
    }
  };

  return (
    <>
      <textarea className="textarea" value={messageText} onChange={e => setMessageText(e.target.value)} />
      <LoadingButton
        onClick={isConnected ? handleSign : openConnectModal}
        disabled={isPending || isSubmitting}
        isLoading={isPending || isSubmitting}
        loadingText="Signing..."
        defaultText={isConnected ? "Sign Message" : "Connect Wallet"}
      />
    </>
  );
};
