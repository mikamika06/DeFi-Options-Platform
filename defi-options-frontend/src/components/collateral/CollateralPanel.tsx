"use client";

import * as React from "react";
import { parseUnits, formatUnits, erc20Abi, maxUint256 } from "viem";
import { useAccount, useReadContract, useWriteContract, usePublicClient, useSendTransaction } from "wagmi";
import { useMutation, gql } from "urql";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CollateralManager_ABI } from "@/contracts/abis";
import {
  COLLATERAL_MANAGER_ADDRESS,
  QUOTE_TOKEN_ADDRESS
} from "@/contracts/constants";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

const COLLATERAL_DEPOSIT_CALldata_MUTATION = gql`
  mutation CollateralDepositCalldata($input: CollateralMoveInput!) {
    collateralDepositCalldata(input: $input)
  }
`;

const COLLATERAL_WITHDRAW_CALldata_MUTATION = gql`
  mutation CollateralWithdrawCalldata($input: CollateralMoveInput!) {
    collateralWithdrawCalldata(input: $input)
  }
`;

export function CollateralPanel() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();
  const [depositCalldataResult, executeDepositCalldata] = useMutation(COLLATERAL_DEPOSIT_CALldata_MUTATION);
  const [withdrawCalldataResult, executeWithdrawCalldata] = useMutation(COLLATERAL_WITHDRAW_CALldata_MUTATION);

  const collateralManagerAddress = React.useMemo(
    () => COLLATERAL_MANAGER_ADDRESS as `0x${string}`,
    []
  );
  const quoteTokenAddress = React.useMemo(() => QUOTE_TOKEN_ADDRESS as `0x${string}`, []);

  const [depositAmount, setDepositAmount] = React.useState<string>("1000");
  const [withdrawAmount, setWithdrawAmount] = React.useState<string>("100");
  const [isProcessing, setIsProcessing] = React.useState(false);

  const { data: decimalsData } = useReadContract({
    address: quoteTokenAddress,
    abi: erc20Abi,
    functionName: "decimals"
  });
  const quoteDecimals = Number(decimalsData ?? 6);

  const {
    data: allowanceData,
    refetch: refetchAllowance,
    isFetching: allowanceFetching
  } = useReadContract({
    address: quoteTokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: [address ?? ZERO_ADDRESS, collateralManagerAddress],
    query: {
      enabled: Boolean(address)
    }
  });

  const {
    data: balanceData,
    refetch: refetchBalance,
    isFetching: balanceFetching
  } = useReadContract({
    address: collateralManagerAddress,
    abi: CollateralManager_ABI,
    functionName: "balanceOf",
    args: [address ?? ZERO_ADDRESS, quoteTokenAddress],
    query: {
      enabled: Boolean(address)
    }
  });

  const {
    data: marginData,
    refetch: refetchMargin,
    isFetching: marginFetching
  } = useReadContract({
    address: collateralManagerAddress,
    abi: CollateralManager_ABI,
    functionName: "getAccountMargin",
    args: [address ?? ZERO_ADDRESS],
    query: {
      enabled: Boolean(address)
    }
  });

  const allowance = allowanceData ?? 0n;
  const depositedRaw = balanceData ?? 0n;
  const equityWad = marginData ? (marginData as readonly bigint[])[0] ?? 0n : 0n;
  const maintenanceWad = marginData ? (marginData as readonly bigint[])[1] ?? 0n : 0n;

  const equityFormatted = Number(formatUnits(equityWad, 18));
  const maintenanceFormatted = Number(formatUnits(maintenanceWad, 18));
  const depositedFormatted = Number(formatUnits(depositedRaw, quoteDecimals));

  const refreshAll = async () => {
    await Promise.all([refetchAllowance(), refetchBalance(), refetchMargin()]);
  };

  const handleDeposit = async () => {
    if (!address) return;
    const numericAmount = Number(depositAmount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return;

    try {
      setIsProcessing(true);
      const amount = parseUnits(depositAmount, quoteDecimals);

      if (allowance < amount) {
        const approveHash = await writeContractAsync({
          address: quoteTokenAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [collateralManagerAddress, maxUint256]
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        await refetchAllowance();
      }

      const response = await executeDepositCalldata({
        input: {
          account: address,
          asset: quoteTokenAddress,
          amount: amount.toString()
        }
      });
      const calldata = response.data?.collateralDepositCalldata;
      if (!calldata) {
        throw response.error ?? new Error("Не отримано calldata для deposit");
      }
      const depositHash = await sendTransactionAsync({
        to: collateralManagerAddress,
        data: calldata as `0x${string}`
      });
      await publicClient.waitForTransactionReceipt({ hash: depositHash });
      await refreshAll();
    } catch (error) {
      console.error("deposit failed", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!address) return;
    const numericAmount = Number(withdrawAmount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return;

    try {
      setIsProcessing(true);
      const amount = parseUnits(withdrawAmount, quoteDecimals);
      const response = await executeWithdrawCalldata({
        input: {
          account: address,
          asset: quoteTokenAddress,
          amount: amount.toString()
        }
      });
      const calldata = response.data?.collateralWithdrawCalldata;
      if (!calldata) {
        throw response.error ?? new Error("Не отримано calldata для withdraw");
      }
      const withdrawHash = await sendTransactionAsync({
        to: collateralManagerAddress,
        data: calldata as `0x${string}`
      });
      await publicClient.waitForTransactionReceipt({ hash: withdrawHash });
      await refreshAll();
    } catch (error) {
      console.error("withdraw failed", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mb-8">
      <CardHeader>
        <CardTitle>Керування маржею</CardTitle>
        <CardDescription>
          Поточний депозит: {depositedFormatted.toFixed(2)} USDC. Поповніть баланс, щоб відкривати або утримувати позиції.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Депозит</div>
            <div className="font-semibold">{depositedFormatted.toFixed(2)} USDC</div>
          </div>
          <div>
            <div className="text-muted-foreground">Equity (WAD)</div>
            <div className="font-semibold">{equityFormatted.toFixed(4)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Maintenance (WAD)</div>
            <div className="font-semibold">{maintenanceFormatted.toFixed(4)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Сума для депозиту (USDC)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={depositAmount}
              onChange={(event) => setDepositAmount(event.target.value)}
            />
            <Button
              className="w-full"
              onClick={handleDeposit}
              disabled={isProcessing || allowanceFetching || balanceFetching || marginFetching || !address}
            >
              {isProcessing || depositCalldataResult.fetching ? "Обробка…" : "Депонувати"}
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Сума для виводу (USDC)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={withdrawAmount}
              onChange={(event) => setWithdrawAmount(event.target.value)}
            />
            <Button
              className="w-full"
              variant="secondary"
              onClick={handleWithdraw}
              disabled={
                isProcessing ||
                allowanceFetching ||
                balanceFetching ||
                marginFetching ||
                !address ||
                withdrawCalldataResult.fetching
              }
            >
              {isProcessing || withdrawCalldataResult.fetching ? "Обробка…" : "Вивести"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
