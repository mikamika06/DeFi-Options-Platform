"use client";

import React, { useState } from "react";
import { parseUnits, formatUnits, erc20Abi } from "viem";
import {
    useAccount,
    useReadContract,
    useWriteContract,
    usePublicClient,
} from "wagmi";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QUOTE_TOKEN_ADDRESS } from "@/contracts/constants";

export function QuickTopUpPanel() {
    const { address } = useAccount();
    const publicClient = usePublicClient();
    const { writeContractAsync } = useWriteContract();
    const [isProcessing, setIsProcessing] = useState(false);

    const quoteTokenAddress = QUOTE_TOKEN_ADDRESS as `0x${string}`;

    // Read current balance
    const { data: balance, refetch: refetchBalance } = useReadContract({
        address: quoteTokenAddress,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    const handleMintTokens = async (amount: string) => {
        if (!address || !publicClient) return;

        try {
            setIsProcessing(true);
            console.log(`Minting ${amount} mUSDC to ${address}...`);

            // Mint tokens - assuming the mUSDC contract has a mint function for testing
            const mintAmount = parseUnits(amount, 6);

            const mintHash = await writeContractAsync({
                address: quoteTokenAddress,
                abi: [
                    {
                        inputs: [
                            { name: "to", type: "address" },
                            { name: "amount", type: "uint256" },
                        ],
                        name: "mint",
                        outputs: [],
                        stateMutability: "nonpayable",
                        type: "function",
                    },
                ],
                functionName: "mint",
                args: [address, mintAmount],
            });
            await publicClient.waitForTransactionReceipt({ hash: mintHash });
            await refetchBalance();

            alert(`Topped up ${amount} USDC!`);
        } catch (error) {
            console.error("Top-up error:", error);
            const message =
                error instanceof Error ? error.message : "Unknown error";
            alert(`Error: ${message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const formatBalance = (value: bigint | undefined, decimals = 6) => {
        if (!value) return "0.00";
        return formatUnits(value, decimals);
    };

    if (!address) {
        return (
            <Card className="w-full max-w-md mx-auto mb-4">
                <CardHeader>
                    <CardTitle className="text-sm">💰 Quick Top-Up</CardTitle>
                    <CardDescription className="text-xs">
                        Connect your wallet
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-md mx-auto mb-4">
            <CardHeader>
                <CardTitle className="text-sm">💰 Quick Top-Up</CardTitle>
                <CardDescription className="text-xs">
                    Balance: {formatBalance(balance)} USDC
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMintTokens("1000")}
                        disabled={isProcessing}
                    >
                        +1K
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMintTokens("5000")}
                        disabled={isProcessing}
                    >
                        +5K
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMintTokens("10000")}
                        disabled={isProcessing}
                    >
                        +10K
                    </Button>
                </div>
                {isProcessing && (
                    <div className="text-xs text-center text-muted-foreground mt-2">
                        Topping up...
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
