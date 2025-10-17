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

      alert("Депозит успішний!");
    } catch (error) {
      console.error("Помилка депозиту:", error);
      const message =
        error instanceof Error ? error.message : "Невідома помилка";
      alert(`Помилка: ${message}`);
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

      alert("Вивід успішний!");
    } catch (error) {
      console.error("Помилка виводу:", error);
      const message =
        error instanceof Error ? error.message : "Невідома помилка";
      alert(`Помилка: ${message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatBalance = (value: bigint | undefined, decimals = 6) => {
    if (!value) return "0.00";
    return formatUnits(value, decimals);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mb-8">
      <CardHeader>
        <CardTitle>Керування маржею</CardTitle>
        <CardDescription>
          Поточний депозит: {formatBalance(deposited)} USDC. Поповніть баланс,
          щоб відкривати або утримувати позиції.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Депозит</div>
            <div className="font-semibold">{formatBalance(deposited)} USDC</div>
          </div>
          <div>
            <div className="text-muted-foreground">Wallet Balance</div>
            <div className="font-semibold">{formatBalance(balance)} USDC</div>
          </div>
          <div>
            <div className="text-muted-foreground">Allowance</div>
            <div className="font-semibold">{formatBalance(allowance)} USDC</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Сума для депозиту (USDC)
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
            <Button
              onClick={handleDeposit}
              disabled={!address || isProcessing}
              className="w-full"
            >
              {isProcessing ? "Обробка..." : "Депонувати"}
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Сума для виводу (USDC)
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
            />
            <Button
              onClick={handleWithdraw}
              disabled={!address || isProcessing || !deposited}
              variant="secondary"
              className="w-full"
            >
              {isProcessing ? "Обробка..." : "Вивести"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
