"use client";

import * as React from "react";
import { useAccount, useReadContract } from "wagmi";
import { OptionsMarket_ABI } from "@/contracts/abis";
import { DEFAULT_ADMIN_ROLE, ContractRole } from "@/contracts/constants";

interface AccessGuardProps {
  requiredRole: ContractRole;
  children: React.ReactNode;
  contractAddress: `0x${string}`; 
}

export function AccessGuard({
  requiredRole,
  children,
  contractAddress,
}: AccessGuardProps) {
  const { address, isConnected } = useAccount();

  const { data: hasRole, isLoading } = useReadContract({
    address: contractAddress,
    abi: OptionsMarket_ABI,
    functionName: "hasRole",
    args: [requiredRole, address || "0x0"],
    query: {
      enabled: isConnected && !!address,
    },
  });

  if (!isConnected || !address) {
    return (
      <div className="p-8 text-center text-lg">
        Будь ласка, підключіть гаманець для доступу.
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-8 text-center">Перевірка прав доступу...</div>;
  }

  if (hasRole !== true) {
    return (
      <div className="p-8 text-center text-red-500 border border-red-500 rounded-lg">
        ❌ Доступ Заборонено: Ваш гаманець не має необхідної ролі (
        {requiredRole === DEFAULT_ADMIN_ROLE ? "ADMIN" : "IV_UPDATER"}).
      </div>
    );
  }

  return <>{children}</>;
}
