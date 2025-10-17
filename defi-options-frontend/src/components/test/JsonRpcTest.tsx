"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function JsonRpcTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  const CONTRACT_ADDRESS = "0x19cEcCd6942ad38562Ee10bAfd44776ceB67e923";
  const USER_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  // const PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

  const sendJsonRpcRequest = async (method: string, params: unknown[] = []) => {
    const response = await fetch("http://localhost:8545", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params,
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }
    return data.result;
  };

  const testMintDirectly = async () => {
    setIsLoading(true);
    setResult("");

    try {
      console.log("🧪 Testing mint via direct JSON-RPC...");

      // Get nonce
      const nonce = await sendJsonRpcRequest("eth_getTransactionCount", [
        USER_ADDRESS,
        "latest",
      ]);
      console.log("📊 Current nonce:", nonce);

      // Encode mint(address,uint256) with 1000 USDC (1000000000 wei)
      const mintData = `0x40c10f19000000000000000000000000${USER_ADDRESS.slice(
        2
      )}000000000000000000000000000000000000000000000000000000003b9aca00`;

      // Estimate gas
      const gasEstimate = await sendJsonRpcRequest("eth_estimateGas", [
        {
          from: USER_ADDRESS,
          to: CONTRACT_ADDRESS,
          data: mintData,
        },
      ]);
      console.log("⛽ Gas estimate:", gasEstimate);

      // Get gas price
      const gasPrice = await sendJsonRpcRequest("eth_gasPrice", []);
      console.log("💰 Gas price:", gasPrice);

      // Create raw transaction (not used in this simple test)
      // const tx = {
      //   nonce,
      //   gasPrice,
      //   gasLimit: gasEstimate,
      //   to: CONTRACT_ADDRESS,
      //   value: '0x0',
      //   data: mintData
      // };

      // For testing, we'll just try to call the contract directly
      const callResult = await sendJsonRpcRequest("eth_call", [
        {
          from: USER_ADDRESS,
          to: CONTRACT_ADDRESS,
          data: mintData,
        },
        "latest",
      ]);

      console.log("📞 Call result:", callResult);
      setResult(`✅ Direct JSON-RPC call successful! Result: ${callResult}`);
    } catch (error) {
      console.error("❌ JSON-RPC test failed:", error);
      setResult(`❌ Failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testBalance = async () => {
    setIsLoading(true);

    try {
      console.log("📊 Checking balance via JSON-RPC...");

      // Encode balanceOf(address)
      const balanceData = `0x70a08231000000000000000000000000${USER_ADDRESS.slice(
        2
      )}`;

      const result = await sendJsonRpcRequest("eth_call", [
        {
          to: CONTRACT_ADDRESS,
          data: balanceData,
        },
        "latest",
      ]);

      const balanceWei = parseInt(result, 16);
      const balanceUSDC = (balanceWei / Math.pow(10, 6)).toFixed(2);

      console.log("💰 Balance:", balanceUSDC, "USDC");
      setResult(`💰 Current balance: ${balanceUSDC} USDC`);
    } catch (error) {
      console.error("❌ Balance check failed:", error);
      setResult(`❌ Balance check failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testContractName = async () => {
    setIsLoading(true);

    try {
      console.log("📝 Checking contract name...");

      // Encode name()
      const nameData = "0x06fdde03";

      const result = await sendJsonRpcRequest("eth_call", [
        {
          to: CONTRACT_ADDRESS,
          data: nameData,
        },
        "latest",
      ]);

      // Decode result (simplified)
      console.log("📛 Name result:", result);
      setResult(`📛 Contract call successful! Raw result: ${result}`);
    } catch (error) {
      console.error("❌ Name check failed:", error);
      setResult(`❌ Name check failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>🔗 JSON-RPC Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-sm text-gray-600">Contract:</div>
          <div className="text-xs font-mono break-all">{CONTRACT_ADDRESS}</div>
        </div>

        <div>
          <div className="text-sm text-gray-600">User:</div>
          <div className="text-xs font-mono break-all">{USER_ADDRESS}</div>
        </div>

        {result && (
          <div className="p-3 bg-gray-100 rounded text-sm">{result}</div>
        )}

        <div className="space-y-2">
          <Button
            onClick={testContractName}
            disabled={isLoading}
            className="w-full text-xs"
            variant="outline"
          >
            {isLoading ? "Testing..." : "Test Contract Name()"}
          </Button>

          <Button
            onClick={testBalance}
            disabled={isLoading}
            className="w-full text-xs"
            variant="outline"
          >
            {isLoading ? "Checking..." : "Check Balance"}
          </Button>

          <Button
            onClick={testMintDirectly}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Testing..." : "Test Mint (eth_call)"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
