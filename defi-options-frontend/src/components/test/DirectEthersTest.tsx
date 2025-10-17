"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Ethers fallback approach
declare global {
  interface Window {
    ethereum?: unknown;
  }
}

export function DirectEthersTest() {
  const [account, setAccount] = useState<string>("");
  const [balance, setBalance] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(false);

  const CONTRACT_ADDRESS = "0x19cEcCd6942ad38562Ee10bAfd44776ceB67e923";

  // Simple ABI for mint function - removed unused

  useEffect(() => {
    connectWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setAccount(accounts[0]);
        // Use direct method to avoid MetaMask cache issues
        await getBalanceViaDirect(accounts[0]);
      } catch (error) {
        console.error("Failed to connect wallet:", error);
      }
    }
  };

  const getBalance = async (address: string) => {
    if (!window.ethereum || !address) {
      console.log("❌ No window.ethereum or address");
      setBalance("No wallet");
      return;
    }

    try {
      console.log("🔍 Getting balance via MetaMask for:", address);
      console.log("📡 Contract address:", CONTRACT_ADDRESS);

      // Ensure we have proper hex format
      const paddedAddress = address.slice(2).toLowerCase().padStart(40, "0");
      const callData = `0x70a08231000000000000000000000000${paddedAddress}`;

      console.log("📝 Call data:", callData);

      const result = await window.ethereum.request({
        method: "eth_call",
        params: [
          {
            to: CONTRACT_ADDRESS,
            data: callData,
          },
          "latest",
        ],
      });

      console.log("📊 Raw result:", result);

      if (!result || result === "0x") {
        console.log("⚠️ Empty result, setting balance to 0");
        setBalance("0.00");
        return;
      }

      const balanceWei = parseInt(result, 16);
      const balanceUSDC = (balanceWei / Math.pow(10, 6)).toFixed(2);
      console.log("💰 Parsed balance:", balanceUSDC, "USDC");
      setBalance(balanceUSDC);
    } catch (error) {
      console.error("❌ MetaMask balance failed:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      setBalance("MetaMask Cache Error");

      // Auto-fallback to direct method
      console.log("🔄 Auto-falling back to direct method...");
      await getBalanceViaDirect(address);
    }
  };

  const getBalanceViaDirect = async (address: string) => {
    try {
      console.log("🔄 Getting balance via direct fetch...");
      const paddedAddress = address.slice(2).toLowerCase().padStart(40, "0");
      const callData = `0x70a08231000000000000000000000000${paddedAddress}`;

      const response = await fetch("http://localhost:8545", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_call",
          params: [{ to: CONTRACT_ADDRESS, data: callData }, "latest"],
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const balanceWei = parseInt(data.result, 16);
      const balanceUSDC = (balanceWei / Math.pow(10, 6)).toFixed(2);
      console.log("✅ Direct fetch balance:", balanceUSDC, "USDC");
      setBalance(balanceUSDC);
    } catch (error) {
      console.error("❌ Direct fetch failed:", error);
      setBalance("Fetch Error");
    }
  };

  const checkAllowance = async () => {
    if (!account) {
      alert("Please connect wallet first");
      return;
    }

    try {
      console.log("🔍 Checking allowance...");
      const marketAddress = "0x5bf5b11053e734690269C6B9D438F8C9d48F528A";

      // Encode allowance function call: allowance(address,address)
      const paddedOwner = account.slice(2).toLowerCase().padStart(40, "0");
      const paddedSpender = marketAddress
        .slice(2)
        .toLowerCase()
        .padStart(40, "0");
      const callData = `0xdd62ed3e000000000000000000000000${paddedOwner}000000000000000000000000${paddedSpender}`;

      const response = await fetch("http://localhost:8545", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_call",
          params: [{ to: CONTRACT_ADDRESS, data: callData }, "latest"],
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const allowanceWei = parseInt(data.result, 16);
      const allowanceUSDC = (allowanceWei / Math.pow(10, 6)).toFixed(2);
      console.log("✅ Current allowance:", allowanceUSDC, "USDC");
      alert(`Allowance: ${allowanceUSDC} USDC for Market`);
    } catch (error) {
      console.error("❌ Allowance check failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      alert(`Allowance check failed: ${errorMessage}`);
    }
  };

  const transferTokens = async () => {
    if (!account) {
      alert("Please connect wallet first");
      return;
    }

    const recipient = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Second test account
    setIsLoading(true);

    try {
      console.log("🚀 Starting direct transfer...");
      console.log("👤 From:", account);
      console.log("🎯 To:", recipient);
      console.log("💰 Amount: 100 USDC");

      // Encode transfer function call: transfer(address,uint256) with 100 USDC
      const paddedRecipient = recipient
        .slice(2)
        .toLowerCase()
        .padStart(40, "0");
      const transferData = `0xa9059cbb000000000000000000000000${paddedRecipient}0000000000000000000000000000000000000000000000000000000005f5e100`; // 100000000 wei = 100 USDC

      // Get current nonce
      const nonceResponse = await fetch("http://localhost:8545", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getTransactionCount",
          params: [account, "latest"],
        }),
      });
      const nonceData = await nonceResponse.json();
      const nonce = nonceData.result;

      // Send transaction via direct RPC
      const txResponse = await fetch("http://localhost:8545", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_sendTransaction",
          params: [
            {
              from: account,
              to: CONTRACT_ADDRESS,
              data: transferData,
              gas: "0x186A0",
              gasPrice: "0x3B9ACA00",
              nonce: nonce,
            },
          ],
        }),
      });

      const txData = await txResponse.json();

      if (txData.error) {
        throw new Error(`Transaction failed: ${txData.error.message}`);
      }

      const txHash = txData.result;
      console.log("✅ Transfer transaction sent:", txHash);

      // Auto refresh balance after successful transfer
      setTimeout(() => getBalanceViaDirect(account), 2000);
      alert(
        `Transfer successful! Sent 100 USDC to ${recipient.slice(0, 10)}...`
      );
    } catch (error) {
      console.error("❌ Transfer failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      alert(`Transfer failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const mintViaDirect = async () => {
    if (!account) {
      alert("Please connect wallet first");
      return;
    }

    setIsLoading(true);

    try {
      console.log(
        "🚀 Starting direct fetch mint (bypassing MetaMask cache)..."
      );

      // Use direct JSON-RPC to mint tokens
      const paddedAddress = account.slice(2).toLowerCase().padStart(40, "0");
      const mintData = `0x40c10f19000000000000000000000000${paddedAddress}000000000000000000000000000000000000000000000000000000003b9aca00`;

      console.log("📡 Sending mint transaction via direct RPC...");
      console.log("📝 Data:", mintData);
      console.log("🎯 To:", CONTRACT_ADDRESS);
      console.log("👤 From:", account);

      // Get current nonce
      const nonceResponse = await fetch("http://localhost:8545", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getTransactionCount",
          params: [account, "latest"],
        }),
      });
      const nonceData = await nonceResponse.json();
      const nonce = nonceData.result;
      console.log("📊 Current nonce:", nonce);

      // Send transaction via direct RPC
      const txResponse = await fetch("http://localhost:8545", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_sendTransaction",
          params: [
            {
              from: account,
              to: CONTRACT_ADDRESS,
              data: mintData,
              gas: "0x186A0",
              gasPrice: "0x3B9ACA00",
              nonce: nonce,
            },
          ],
        }),
      });

      const txData = await txResponse.json();

      if (txData.error) {
        throw new Error(`Transaction failed: ${txData.error.message}`);
      }

      const txHash = txData.result;
      console.log("✅ Transaction sent:", txHash);

      // Auto refresh balance after successful mint
      setTimeout(() => getBalanceViaDirect(account), 2000);
      alert(`Mint successful! Transaction: ${txHash.slice(0, 10)}...`);
    } catch (error) {
      console.error("❌ Direct mint failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      alert(`Direct mint failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const mintTokens = async () => {
    if (!window.ethereum || !account) {
      alert("Please connect wallet first");
      return;
    }

    setIsLoading(true);

    try {
      console.log("🚀 Starting MetaMask mint (may have cache issues)...");

      // Encode mint function call: mint(address,uint256) with 1000 USDC (1000000000 wei)
      const paddedAddress = account.slice(2).toLowerCase().padStart(40, "0");
      const mintData = `0x40c10f19000000000000000000000000${paddedAddress}000000000000000000000000000000000000000000000000000000003b9aca00`;

      console.log("📡 Sending mint transaction...");
      console.log("📝 Data:", mintData);
      console.log("🎯 To:", CONTRACT_ADDRESS);
      console.log("👤 From:", account);

      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to: CONTRACT_ADDRESS,
            data: mintData,
            gas: "0x186A0", // 100000
          },
        ],
      });

      console.log("✅ Transaction sent:", txHash);

      // Wait for transaction
      let receipt = null;
      let attempts = 0;
      while (!receipt && attempts < 30) {
        try {
          receipt = await window.ethereum.request({
            method: "eth_getTransactionReceipt",
            params: [txHash],
          });
          if (!receipt) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            attempts++;
          }
        } catch (receiptError) {
          console.log("⏳ Receipt check failed, retrying...", receiptError);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          attempts++;
        }
      }

      if (receipt) {
        console.log("✅ Transaction confirmed:", receipt);
        await getBalance(account);
        alert("Mint successful! Check your balance.");
      } else {
        console.log("⏰ Transaction pending...");
        alert(
          "Transaction sent, but confirmation is taking time. Check your wallet."
        );
      }
    } catch (error) {
      console.error("❌ Mint failed:", error);
      alert(`Mint failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const approveViaDirect = async () => {
    if (!account) {
      alert("Please connect wallet first");
      return;
    }

    setIsLoading(true);

    try {
      console.log("🚀 Starting direct approve (bypassing MetaMask cache)...");

      // Market address from deployment
      const marketAddress = "0x5bf5b11053e734690269C6B9D438F8C9d48F528A";

      console.log("🎯 Spender:", marketAddress);
      console.log("� Amount: 1000 USDC");

      // Encode approve function call: approve(address,uint256) with 1000 USDC
      const paddedSpender = marketAddress
        .slice(2)
        .toLowerCase()
        .padStart(40, "0");
      const approveData = `0x095ea7b3000000000000000000000000${paddedSpender}000000000000000000000000000000000000000000000000000000003b9aca00`;

      // Get current nonce
      const nonceResponse = await fetch("http://localhost:8545", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getTransactionCount",
          params: [account, "latest"],
        }),
      });
      const nonceData = await nonceResponse.json();
      const nonce = nonceData.result;
      console.log("📊 Current nonce:", nonce);

      // Send transaction via direct RPC
      const txResponse = await fetch("http://localhost:8545", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_sendTransaction",
          params: [
            {
              from: account,
              to: CONTRACT_ADDRESS,
              data: approveData,
              gas: "0x186A0",
              gasPrice: "0x3B9ACA00",
              nonce: nonce,
            },
          ],
        }),
      });

      const txData = await txResponse.json();

      if (txData.error) {
        throw new Error(`Transaction failed: ${txData.error.message}`);
      }

      const txHash = txData.result;
      console.log("✅ Approve transaction sent:", txHash);

      alert(`Approve successful! Transaction: ${txHash.slice(0, 10)}...`);
    } catch (error) {
      console.error("❌ Direct approve failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      alert(`Direct approve failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const approveTokens = async () => {
    if (!window.ethereum || !account) {
      alert("Please connect wallet first");
      return;
    }

    setIsLoading(true);

    try {
      console.log("🚀 Starting MetaMask approve (may have cache issues)...");

      // Market address from deployment
      const marketAddress = "0x5bf5b11053e734690269C6B9D438F8C9d48F528A";

      console.log("🎯 Spender:", marketAddress);
      console.log("💰 Amount: 1000 USDC");

      // Encode approve function call: approve(address,uint256) with 1000 USDC
      const approveData = `0x095ea7b3000000000000000000000000${marketAddress
        .slice(2)
        .toLowerCase()}000000000000000000000000000000000000000000000000000000003b9aca00`;

      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to: CONTRACT_ADDRESS,
            data: approveData,
            gas: "0x186A0", // 100000
          },
        ],
      });

      console.log("✅ Approve transaction sent:", txHash);
      alert("Approve transaction sent! Check your wallet.");
    } catch (error) {
      console.error("❌ Approve failed:", error);
      alert(`Approve failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>🧪 Direct Ethers Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-sm text-gray-600">Account:</div>
          <div className="font-mono text-xs break-all">
            {account || "Not connected"}
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-600">CleanERC20 Balance:</div>
          <div className="font-mono">{balance} cUSDC</div>
        </div>

        <div>
          <div className="text-sm text-gray-600">Contract:</div>
          <div className="text-xs font-mono break-all">{CONTRACT_ADDRESS}</div>
        </div>

        <div className="space-y-2">
          <Button
            onClick={connectWallet}
            disabled={!!account}
            className="w-full"
            variant="outline"
          >
            {account ? "Connected" : "Connect Wallet"}
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={mintTokens}
              disabled={!account || isLoading}
              className="text-xs"
            >
              {isLoading ? "Processing..." : "Mint (MetaMask)"}
            </Button>

            <Button
              onClick={mintViaDirect}
              disabled={!account || isLoading}
              className="text-xs"
              variant="secondary"
            >
              {isLoading ? "Processing..." : "Mint (Direct)"}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={approveTokens}
              disabled={!account || isLoading}
              className="text-xs"
              variant="secondary"
            >
              {isLoading ? "Processing..." : "Approve (MetaMask)"}
            </Button>

            <Button
              onClick={approveViaDirect}
              disabled={!account || isLoading}
              className="text-xs"
              variant="secondary"
            >
              {isLoading ? "Processing..." : "Approve (Direct)"}
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => {
                console.log("🔄 Manual balance refresh...");
                getBalance(account);
              }}
              disabled={!account}
              className="text-xs"
              variant="ghost"
            >
              🔄 Balance (MM)
            </Button>

            <Button
              onClick={() => {
                console.log("🔄 Direct balance refresh...");
                getBalanceViaDirect(account);
              }}
              disabled={!account}
              className="text-xs"
              variant="ghost"
            >
              🔄 Balance (Direct)
            </Button>

            <Button
              onClick={checkAllowance}
              disabled={!account}
              className="text-xs"
              variant="ghost"
            >
              🔍 Allowance
            </Button>
          </div>

          <Button
            onClick={transferTokens}
            disabled={!account || isLoading}
            className="w-full text-xs"
            variant="outline"
          >
            {isLoading ? "Processing..." : "🔄 Transfer 100 USDC (Test)"}
          </Button>

          <Button
            onClick={async () => {
              console.log("🧹 Clearing MetaMask cache...");
              try {
                // Force reconnect to local network
                await window.ethereum.request({
                  method: "wallet_switchEthereumChain",
                  params: [{ chainId: "0x7a69" }],
                });
                console.log("✅ Network reset");
                // Auto refresh balance after reset
                setTimeout(() => getBalanceViaDirect(account), 1000);
              } catch (resetError) {
                console.log(
                  "⚠️ Reset failed, trying direct balance anyway",
                  resetError
                );
                getBalanceViaDirect(account);
              }
            }}
            disabled={!account}
            className="w-full text-xs"
            variant="destructive"
          >
            🧹 Clear MetaMask Cache & Refresh
          </Button>

          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="text-sm text-amber-800">
              <strong>⚠️ MetaMask Cache Issues:</strong>
              <ul className="mt-2 space-y-1 text-xs">
                <li>• MetaMask has cached old blockchain state</li>
                <li>
                  • Use &quot;Direct&quot; buttons which bypass MetaMask cache
                </li>
                <li>• ✅ Mint (Direct) - працює</li>
                <li>• ✅ Approve (Direct) - використовуйте замість MetaMask</li>
                <li>• ✅ Transfer - додано для тестування</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
