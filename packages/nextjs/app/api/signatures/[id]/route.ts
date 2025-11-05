import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { recoverMessageAddress, recoverTypedDataAddress } from "viem";
import { db } from "~~/services/db";
import { messagesTable, signaturesTable } from "~~/services/db/schema";
import { isContractAddress } from "~~/utils/signatorio/detect-safe";
import { validateSafeSignature } from "~~/utils/signatorio/validate-safe-signature";

export const GET = async (req: NextRequest, { params }: { params: { id: string } }) => {
  const { id } = params;

  const [message] = await db.select().from(messagesTable).where(eq(messagesTable.id, id)).execute();
  const signatures = await db.select().from(signaturesTable).where(eq(signaturesTable.message, id)).execute();

  return NextResponse.json({
    message,
    signatures,
  });
};

export const POST = async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    const { signature, signer, chainId } = await req.json();

    if (!signature || !signer) {
      return NextResponse.json({ error: "Signature and signer are required" }, { status: 400 });
    }

    if (chainId === undefined || chainId === null) {
      return NextResponse.json({ error: "chainId is required" }, { status: 400 });
    }

    if (typeof chainId !== "number") {
      return NextResponse.json({ error: "chainId must be a number" }, { status: 400 });
    }

    const [message] = await db.select().from(messagesTable).where(eq(messagesTable.id, id)).execute();

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const [existingSignature] = await db
      .select()
      .from(signaturesTable)
      .where(and(eq(signaturesTable.message, id), eq(signaturesTable.signature, signature)))
      .execute();

    if (existingSignature) {
      return NextResponse.json({ error: "Signature already exists for this signer" }, { status: 409 });
    }

    // Check if signer is a contract (Safe wallet)
    const isContract = await isContractAddress(signer, chainId);

    if (isContract) {
      // Use Safe signature validation
      const isValid = await validateSafeSignature({
        chainId,
        safeAddress: signer,
        message: message.type === "typed_data" ? JSON.parse(message.message) : message.message,
        signature,
        messageType: message.type,
      });

      if (!isValid) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    } else {
      // Use standard EOA signature validation
      const recoveredAddress =
        message.type === "text"
          ? await recoverMessageAddress({
              message: message.message,
              signature,
            })
          : await recoverTypedDataAddress({ ...JSON.parse(message.message), signature });

      if (recoveredAddress !== signer) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    }

    const [newSignature] = await db
      .insert(signaturesTable)
      .values({
        message: id,
        signature,
        signer,
      })
      .returning()
      .execute();

    return NextResponse.json({
      success: true,
      signature: newSignature,
    });
  } catch (error) {
    console.error("Error creating signature:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
