import * as schema from "./schema";
import { drizzle } from "drizzle-orm/node-postgres";

export const db = drizzle(process.env.DATABASE_URL ?? "postgresql://postgres:mysecretpassword@localhost:5432/postgres");

export const createMessageWithSignature = async (
  message: string,
  messageType: schema.MessageType,
  signature: string,
  signer: string,
) => {
  const [{ id: messageId }] = await db
    .insert(schema.messagesTable)
    .values({
      type: messageType,
      message,
      creator: signer,
    })
    .returning({ id: schema.messagesTable.id })
    .execute();

  await db
    .insert(schema.signaturesTable)
    .values({
      message: messageId,
      signature,
      signer,
    })
    .execute();

  return messageId;
};
