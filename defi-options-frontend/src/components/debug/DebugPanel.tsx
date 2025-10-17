"use client";

import React, { useState } from "react";
import { parseUnits } from "viem";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QUOTE_TOKEN_ADDRESS } from "@/contracts/constants";

export function DebugPanel() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [log, setLog] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addLog = (message: string) => {
    console.log(message);
    setLog((prev) => [
      ...prev.slice(-10),
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const testMint = async () => {
    if (!address || !publicClient) return;

    try {
      setIsProcessing(true);
      addLog("🧪 Початок тесту мінту...");

      const mintAmount = parseUnits("1000", 6);
      addLog(`💰 Мінт ${mintAmount} mUSDC для ${address}`);

      const mintHash = await writeContractAsync({
        address: QUOTE_TOKEN_ADDRESS as `0x${string}`,
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

      addLog(`📝 TX Hash: ${mintHash}`);
      addLog("⏳ Чекаємо підтвердження...");

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: mintHash,
      });

      if (receipt.status === "success") {
        addLog("✅ Мінт успішний!");
      } else {
        addLog("❌ Мінт провалився");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Невідома помилка";
      addLog(`❌ Помилка: ${message}`);
      console.error("Деталі помилки:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!address) {
    return (
      <Card className="w-full max-w-2xl mx-auto mb-4">
        <CardHeader>
          <CardTitle className="text-sm">🔧 Debug Panel</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Підключіть гаманець для тестування
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto mb-4">
      <CardHeader>
        <CardTitle className="text-sm">🔧 Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={testMint}
          disabled={isProcessing}
          size="sm"
          variant="outline"
        >
          {isProcessing ? "Тестування..." : "🧪 Тест мінту"}
        </Button>

        <div className="bg-black text-green-400 p-3 rounded text-xs font-mono max-h-48 overflow-y-auto">
          {log.length === 0 ? (
            <div className="text-muted-foreground">
              Логи з&apos;являться тут...
            </div>
          ) : (
            log.map((entry, i) => <div key={i}>{entry}</div>)
          )}
        </div>
      </CardContent>
    </Card>
  );
}
