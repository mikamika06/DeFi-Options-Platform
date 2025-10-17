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
import { Input } from "@/components/ui/input";
import { OptionsMarket_ABI } from "@/contracts/abis";
import {
  OPTIONS_MARKET_ADDRESS,
  QUOTE_TOKEN_ADDRESS,
} from "@/contracts/constants";

export function SimpleTradePanel() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [optionType, setOptionType] = useState<"call" | "put">("call");
  const [strike, setStrike] = useState("3000");
  const [amount, setAmount] = useState("0.1");
  const [isProcessing, setIsProcessing] = useState(false);

  const optionsMarketAddress = OPTIONS_MARKET_ADDRESS as `0x${string}`;
  const quoteTokenAddress = QUOTE_TOKEN_ADDRESS as `0x${string}`;

  // Read current ETH price (simplified)
  const currentPrice = 3000; // Hardcoded for now

  // Calculate premium (simplified - 5% of strike for calls, 3% for puts)
  const calculatePremium = () => {
    const strikePrice = parseFloat(strike);
    const optionAmount = parseFloat(amount);
    const premiumRate = optionType === "call" ? 0.05 : 0.03;
    return (strikePrice * optionAmount * premiumRate).toFixed(2);
  };

  const premium = calculatePremium();

  // Read balance
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: quoteTokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const handleTrade = async () => {
    if (!address || !publicClient) return;

    try {
      setIsProcessing(true);

      // Use the actual series ID from deployed contracts
      const seriesId =
        "0x09b78420df4ac814d276330284ebce24a5e21e0ff66b57d1f99ee5ed1a52eea8";

      const optionAmount = parseUnits(amount, 18); // Amount in wei
      const maxPremium = parseUnits(premium, 6); // Max premium in USDC (6 decimals)

      console.log("Trading option:", {
        seriesId,
        type: optionType,
        strike: strike,
        amount: amount,
        maxPremium: premium,
      });

      // Step 1: Approve tokens
      console.log("Step 1: Approving USDC...");
      const approveHash = await writeContractAsync({
        address: quoteTokenAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [optionsMarketAddress, maxPremium],
        gas: 100000n,
        gasPrice: parseUnits("1", 9),
      });

      console.log("Approve hash:", approveHash);
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
      console.log("USDC approved!");

      // Step 2: Trade option
      console.log("Step 2: Trading option...");
      const tradeHash = await writeContractAsync({
        address: optionsMarketAddress,
        abi: OptionsMarket_ABI,
        functionName: "trade",
        args: [seriesId, optionAmount, maxPremium],
        gas: 300000n,
        gasPrice: parseUnits("1", 9),
      });

      console.log("Trade hash:", tradeHash);
      await publicClient.waitForTransactionReceipt({ hash: tradeHash });

      await refetchBalance();

      alert("Опціон куплено успішно!");
    } catch (error) {
      console.error("Помилка торгівлі:", error);
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
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Торгівля опціонами</CardTitle>
        <CardDescription>
          Поточна ціна ETH: ${currentPrice}. Ваш баланс:{" "}
          {formatBalance(balance)} USDC
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Тип опціону</label>
            <select
              value={optionType}
              onChange={(e) => setOptionType(e.target.value as "call" | "put")}
              className="w-full p-2 border rounded-md"
            >
              <option value="call">Call (бичачий)</option>
              <option value="put">Put (ведмежий)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Страйк ($)</label>
            <Input
              type="number"
              min="0"
              step="1"
              value={strike}
              onChange={(e) => setStrike(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Кількість ETH</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Премія (USDC)</label>
            <Input type="text" value={premium} disabled className="bg-muted" />
          </div>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="text-sm space-y-1">
            <div>
              Тип:{" "}
              <span className="font-semibold">
                {optionType === "call" ? "Call" : "Put"}
              </span>
            </div>
            <div>
              Страйк: <span className="font-semibold">${strike}</span>
            </div>
            <div>
              Кількість: <span className="font-semibold">{amount} ETH</span>
            </div>
            <div>
              Премія: <span className="font-semibold">{premium} USDC</span>
            </div>
            <div>
              Термін дії: <span className="font-semibold">1 день</span>
            </div>
          </div>
        </div>

        <Button
          onClick={handleTrade}
          disabled={!address || isProcessing}
          className="w-full"
          size="lg"
        >
          {isProcessing ? "Обробка..." : `Купити ${optionType} опціон`}
        </Button>
      </CardContent>
    </Card>
  );
}
