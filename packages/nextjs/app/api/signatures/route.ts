import { NextRequest, NextResponse } from "next/server";
import { isAddress, isHex, recoverMessageAddress, recoverTypedDataAddress } from "viem";
import { createMessageWithSignature } from "~~/services/db";
import { messageTypeEnum } from "~~/services/db/schema";
import { isContractAddress } from "~~/utils/signatorio/detect-safe";
import { validateSafeSignature } from "~~/utils/signatorio/validate-safe-signature";

export const POST = async (req: NextRequest) => {
  const { signature, message, messageType, address, chainId } = await req.json();

  if (!signature || !message || !messageType || !address) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
  }

  if (!isHex(signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!isAddress(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  if (!messageTypeEnum.enumValues.includes(messageType)) {
    return NextResponse.json({ error: "Invalid message type" }, { status: 400 });
  }

  if (chainId === undefined || chainId === null) {
    return NextResponse.json({ error: "chainId is required" }, { status: 400 });
  }

  if (typeof chainId !== "number") {
    return NextResponse.json({ error: "chainId must be a number" }, { status: 400 });
  }

  // Check if address is a contract (Safe wallet)
  const isContract = await isContractAddress(address, chainId);

  if (isContract) {
    // Use Safe signature validation
    const isValid = await validateSafeSignature({
      chainId,
      safeAddress: address,
      message: messageType === "typed_data" ? JSON.parse(message) : message,
      signature,
      messageType,
    });

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else {
    // Use standard EOA signature validation
    const recoveredAddress =
      messageType === "typed_data"
        ? await recoverTypedDataAddress({ ...JSON.parse(message), signature })
        : await recoverMessageAddress({ message, signature });

    if (recoveredAddress !== address) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const messageId = await createMessageWithSignature(message, messageType, signature, address);

  return NextResponse.json({ messageId });
};
