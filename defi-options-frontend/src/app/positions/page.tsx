"use client";

import * as React from "react";
import { useAccount } from "wagmi";
import { PositionsTable } from "@/components/portfolio/PositionsTable";

export default function PositionsPage() {
  const { address, isConnected } = useAccount();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Your Options Portfolio</h1>

      {!isConnected ? (
        <p className="text-center text-lg">
          Please connect your wallet to view your positions.
        </p>
      ) : (
        <PositionsTable userAddress={address ?? ""} />
      )}
    </div>
  );
}
