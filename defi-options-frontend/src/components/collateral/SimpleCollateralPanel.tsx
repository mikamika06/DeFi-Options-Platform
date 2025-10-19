"use client";

import React, { useState } from "react";
import { parseUnits, formatUnits, erc20Abi, maxUint256 } from "viem";
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
import { Input } from "@/components/ui/input";
import { CollateralManager_ABI } from "@/contracts/abis";
import {
  COLLATERAL_MANAGER_ADDRESS,
  QUOTE_TOKEN_ADDRESS,
} from "@/contracts/constants";

export function SimpleCollateralPanel() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [depositAmount, setDepositAmount] = useState("1000");
  const [withdrawAmount, setWithdrawAmount] = useState("100");
  const [isProcessing, setIsProcessing] = useState(false);

  const collateralManagerAddress = COLLATERAL_MANAGER_ADDRESS as `0x${string}`;
  const quoteTokenAddress = QUOTE_TOKEN_ADDRESS as `0x${string}`;

  // Read current balances
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: quoteTokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: quoteTokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, collateralManagerAddress] : undefined,
    query: { enabled: !!address },
  });

  const { data: deposited, refetch: refetchDeposited } = useReadContract({
    address: collateralManagerAddress,
    abi: CollateralManager_ABI,
    functionName: "balanceOf",
    args: address ? [address, quoteTokenAddress] : undefined,
    query: { enabled: !!address },
  }) as { data: bigint | undefined; refetch: () => Promise<unknown> };

  const handleDeposit = async () => {
    if (!address || !balance || !publicClient) return;

    try {
      setIsProcessing(true);
      const amount = parseUnits(depositAmount, 6); // mUSDC has 6 decimals

      // Check if approval is needed
      if ((allowance || 0n) < amount) {
        console.log("Approving mUSDC...");
        const approveHash = await writeContractAsync({
          address: quoteTokenAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [collateralManagerAddress, maxUint256],
          gas: 100000n,
          gasPrice: 1000000000n,
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        await refetchAllowance();
      }

      // Deposit collateral
      console.log("Depositing collateral...");
      const depositHash = await writeContractAsync({
        address: collateralManagerAddress,
        abi: CollateralManager_ABI,
        functionName: "deposit",
        args: [address, quoteTokenAddress, amount],
        gas: 200000n,
        gasPrice: 1000000000n,
      });

      await publicClient.waitForTransactionReceipt({ hash: depositHash });

      // Refresh data
      await Promise.all([
        refetchBalance(),
        refetchAllowance(),
        refetchDeposited(),
      ]);

      alert("Deposit successful!");
    } catch (error) {
      console.error("Deposit error:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      alert(`Error: ${message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!address || !deposited || !publicClient) return;

    try {
      setIsProcessing(true);
      const amount = parseUnits(withdrawAmount, 6);

      console.log("Withdrawing collateral...");
      const withdrawHash = await writeContractAsync({
        address: collateralManagerAddress,
        abi: CollateralManager_ABI,
        functionName: "withdraw",
        args: [address, quoteTokenAddress, amount],
        gas: 200000n,
        gasPrice: 1000000000n,
      });

      await publicClient.waitForTransactionReceipt({ hash: withdrawHash });

      await Promise.all([refetchBalance(), refetchDeposited()]);

      alert("Withdrawal successful!");
    } catch (error) {
      console.error("Withdrawal error:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      alert(`Error: ${message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatBalance = (value: bigint | undefined, decimals = 6) => {
    if (!value) return "0.00";
    return formatUnits(value, decimals);
  };

  return (
    <Card className="mx-auto mb-8 w-full max-w-3xl border border-border/70 bg-white/95 shadow-lg">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl font-semibold text-foreground">
          Margin Management
        </CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          Current deposit: {formatBalance(deposited)} USDC. Top up your balance
          to open or maintain positions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-muted/40 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Deposit
            </div>
            <div className="mt-2 text-lg font-semibold text-foreground">
              {formatBalance(deposited)} USDC
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/40 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Wallet Balance
            </div>
            <div className="mt-2 text-lg font-semibold text-foreground">
              {formatBalance(balance)} USDC
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/40 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Allowance
            </div>
            <div className="mt-2 text-lg font-semibold text-foreground">
              {formatBalance(allowance)} USDC
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-border/60 bg-white/90 p-5 shadow-sm">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Deposit Amount (USDC)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="rounded-xl border border-border/60 bg-white"
              />
            </div>
            <Button
              onClick={handleDeposit}
              disabled={!address || isProcessing}
              className="w-full rounded-full px-6 py-5 text-base font-semibold shadow-md hover:shadow-lg disabled:shadow-none"
            >
              {isProcessing ? "Processing..." : "Deposit"}
            </Button>
          </div>

          <div className="space-y-4 rounded-2xl border border-border/60 bg-white/90 p-5 shadow-sm">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Withdrawal Amount (USDC)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="rounded-xl border border-border/60 bg-white"
              />
            </div>
            <Button
              onClick={handleWithdraw}
              disabled={!address || isProcessing || !deposited}
              variant="secondary"
              className="w-full rounded-full px-6 py-5 text-base font-semibold shadow-md hover:shadow-lg disabled:shadow-none"
            >
              {isProcessing ? "Processing..." : "Withdraw"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
