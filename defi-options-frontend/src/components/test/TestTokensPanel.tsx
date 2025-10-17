"use client";

import React, { useState } from "react";
import { parseUnits, encodeFunctionData } from "viem";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  usePublicClient,
  useSendTransaction,
} from "wagmi";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  QUOTE_TOKEN_ADDRESS,
  OPTIONS_MARKET_ADDRESS,
} from "@/contracts/constants";
import { minimalERC20Abi } from "@/contracts/minimalERC20Abi";

export function TestTokensPanel() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMinting, setIsMinting] = useState(false);

  // Жорстко задаємо адресу CleanERC20 контракту для тестування
  const quoteTokenAddress =
    "0xCA8c8688914e0F7096c920146cd0Ad85cD7Ae8b9" as `0x${string}`;
  const marketAddress = OPTIONS_MARKET_ADDRESS as `0x${string}`;

  // Debug: виводити адреси в консоль
  console.log("🔍 Using hardcoded addresses:", {
    quoteToken: quoteTokenAddress,
    market: marketAddress,
    fromConstants: QUOTE_TOKEN_ADDRESS,
  });

  // Read USDC balance
  const { data: usdcBalance, refetch: refetchBalance } = useReadContract({
    address: quoteTokenAddress,
    abi: minimalERC20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Read USDC allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: quoteTokenAddress,
    abi: minimalERC20Abi,
    functionName: "allowance",
    args: address ? [address, marketAddress] : undefined,
    query: { enabled: !!address },
  });

  const handleApprove = async () => {
    if (!address || !publicClient) return;

    try {
      setIsProcessing(true);

      const approveAmount = parseUnits("1000", 6); // 1000 USDC

      console.log("Approving 1000 USDC...");
      console.log("Token:", quoteTokenAddress);
      console.log("Spender:", marketAddress);
      console.log("Amount:", approveAmount.toString());

      const hash = await writeContractAsync({
        address: quoteTokenAddress,
        abi: minimalERC20Abi,
        functionName: "approve",
        args: [marketAddress, approveAmount],
        gas: 100000n,
        gasPrice: parseUnits("1", 9),
      });

      console.log("Transaction hash:", hash);
      await publicClient.waitForTransactionReceipt({ hash });

      await refetchAllowance();
      alert("Approve успішний!");
    } catch (error) {
      console.error("Помилка approve:", error);
      alert(`Помилка: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMint = async () => {
    if (!address || !publicClient) return;

    try {
      setIsMinting(true);

      const mintAmount = parseUnits("1000", 6); // 1000 USDC

      console.log("🧪 Початок тесту мінту...");
      console.log("💰 Мінт", mintAmount.toString(), "mUSDC для", address);

      // Method 1: Direct sendTransaction with encoded data
      try {
        console.log("� Спроба 1: Direct sendTransaction");
        const data = encodeFunctionData({
          abi: minimalERC20Abi,
          functionName: "mint",
          args: [address, mintAmount],
        });

        const hash = await sendTransactionAsync({
          to: quoteTokenAddress,
          data: data,
          gas: 100000n,
        });

        console.log("✅ Transaction hash (method 1):", hash);
        await publicClient.waitForTransactionReceipt({ hash });

        await refetchBalance();
        console.log("✅ Токени отримано успішно (method 1)!");
        alert("Токени отримано успішно!");
        return;
      } catch (error1) {
        console.log("❌ Method 1 failed:", error1);

        // Method 2: writeContractAsync fallback
        console.log("🔄 Спроба 2: writeContractAsync");
        const hash = await writeContractAsync({
          address: quoteTokenAddress,
          abi: minimalERC20Abi,
          functionName: "mint",
          args: [address, mintAmount],
          gas: 100000n,
        });

        console.log("✅ Transaction hash (method 2):", hash);
        await publicClient.waitForTransactionReceipt({ hash });

        await refetchBalance();
        console.log("✅ Токени отримано успішно (method 2)!");
        alert("Токени отримано успішно!");
      }
    } catch (error) {
      console.error("❌ Помилка:", error);
      alert(`Помилка: ${error}`);
    } finally {
      setIsMinting(false);
    }
  };

  const formatBalance = (value: bigint | undefined, decimals = 6) => {
    if (value === undefined) return "0.00";
    try {
      return (Number(value) / Math.pow(10, decimals)).toFixed(2);
    } catch {
      return "0.00";
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Тест токенів</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-sm text-gray-600">USDC Баланс:</div>
          <div className="font-mono">{formatBalance(usdcBalance)} USDC</div>
        </div>

        <div>
          <div className="text-sm text-gray-600">Allowance:</div>
          <div className="font-mono">{formatBalance(allowance)} USDC</div>
        </div>

        <div>
          <div className="text-sm text-gray-600">Адреси:</div>
          <div className="text-xs font-mono break-all">
            Token: {quoteTokenAddress}
          </div>
          <div className="text-xs font-mono break-all">
            Market: {marketAddress}
          </div>
          <div className="text-xs font-mono break-all">Your: {address}</div>
        </div>

        <div className="space-y-2">
          <Button
            onClick={handleMint}
            disabled={!address || isMinting}
            className="w-full"
            variant="outline"
          >
            {isMinting ? "Мінтинг..." : "Отримати 1000 USDC"}
          </Button>

          <Button
            onClick={handleApprove}
            disabled={!address || isProcessing}
            className="w-full"
          >
            {isProcessing ? "Обробка..." : "Approve 1000 USDC"}
          </Button>

          <Button
            onClick={() =>
              console.log("Debug info:", {
                quoteTokenAddress,
                marketAddress,
                address,
                usdcBalance,
                allowance,
              })
            }
            className="w-full text-xs"
            variant="secondary"
          >
            Debug Log Info
          </Button>

          <Button
            onClick={async () => {
              if (!address) return;
              try {
                const cleanAddress =
                  "0xCA8c8688914e0F7096c920146cd0Ad85cD7Ae8b9";
                console.log("🧪 Testing direct CleanERC20 mint...");
                const hash = await sendTransactionAsync({
                  to: cleanAddress as `0x${string}`,
                  data: encodeFunctionData({
                    abi: minimalERC20Abi,
                    functionName: "mint",
                    args: [address, parseUnits("1000", 6)],
                  }),
                  gas: 100000n,
                });
                console.log("✅ Direct mint successful:", hash);
                alert("Direct mint successful!");
              } catch (error) {
                console.error("❌ Direct mint failed:", error);
                alert(`Direct mint failed: ${error}`);
              }
            }}
            className="w-full text-xs"
            variant="destructive"
          >
            Test Direct CleanERC20 Mint
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
