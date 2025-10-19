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
                Please connect your wallet to access.
            </div>
        );
    }

    if (isLoading) {
        return <div className="p-8 text-center">Checking access rights...</div>;
    }

    if (hasRole !== true) {
        return (
            <div className="p-8 text-center text-red-500 border border-red-500 rounded-lg">
                ❌ Access Denied: Your wallet does not have the required role (
                {requiredRole === DEFAULT_ADMIN_ROLE ? "ADMIN" : "IV_UPDATER"}).
            </div>
        );
    }

    return <>{children}</>;
}
