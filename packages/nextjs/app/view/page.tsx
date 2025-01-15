"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NextPage } from "next";
import { TypedDataDefinition } from "viem";
import { SignatureMessage } from "~~/components/signatorio/SignatureMessage";
import { SignaturesList } from "~~/components/signatorio/SignaturesList";
import { useSignatureVerification } from "~~/hooks/signatorio/useSignatureVerification";

const ViewSignature: NextPage<{
  searchParams: { [key: string]: string | string[] | undefined };
}> = ({ searchParams }) => {
  const router = useRouter();

  const message = typeof searchParams["message"] === "string" ? searchParams["message"] : null;
  const rawTypedData = typeof searchParams["typedData"] === "string" ? searchParams["typedData"] : null;
  const [typedData, setTypedData] = useState<TypedDataDefinition | null>(null);
  const [signatures, setSignatures] = useState<string[]>([]);
  const [addresses, setAddresses] = useState<string[]>([]);
  const addressChecks = useSignatureVerification(message, typedData, signatures, addresses);

  useEffect(() => {
    if (searchParams["ipfs"]) {
      router.push(`/ipfs/${searchParams["ipfs"]}`);
    }
  }, [router, searchParams]);

  // Handle initial data from search params
  useEffect(() => {
    const sigs = searchParams["signatures"] ?? [];
    const addrs = searchParams["addresses"] ?? [];
    setSignatures(typeof sigs === "string" ? sigs.split(",") : sigs);
    setAddresses(typeof addrs === "string" ? addrs.split(",") : addrs);
  }, [searchParams]);

  // Parse typed data from URL
  useEffect(() => {
    if (rawTypedData) {
      try {
        setTypedData(JSON.parse(decodeURIComponent(rawTypedData)));
      } catch (error) {
        console.error("Failed to parse typed data:", error);
      }
    }
  }, [rawTypedData]);

  if (!message && !rawTypedData && !searchParams["ipfs"]) {
    router.push("/");
    return null;
  }

  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <div className="px-5 container max-w-screen-sm">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body gap-4">
            <SignatureMessage message={message} typedData={typedData} />
            <SignaturesList signatures={signatures} addresses={addresses} addressChecks={addressChecks} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewSignature;
