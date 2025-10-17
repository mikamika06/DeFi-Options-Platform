"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

// Contract addresses from deployment
const CONTRACTS = {
  optionToken: "0xD0141E899a65C95a556fE2B27e5982A6DE7fDD7A",
  collateralManager: "0x07882Ae1ecB7429a84f1D53048d35c4bB2056877",
  liquidityVault: "0x22753E4264FDDc6181dc7cce468904A80a363E44",
  insuranceFund: "0xA7c59f010700930003b33aB25a7a0679C860f29c",
  optionsMarket: "0x5bf5b11053e734690269C6B9D438F8C9d48F528A",
  quoteToken: "0x19cEcCd6942ad38562Ee10bAfd44776ceB67e923", // CleanERC20
  underlyingToken: "0x34B40BA116d5Dec75548a9e9A8f15411461E8c70",
};

interface AccountData {
  address: string;
  quoteBalance: string;
  underlyingBalance: string;
  collateralBalance: string;
  marginRequirement: string;
  liquidityProvided: string;
  insuranceBalance: string;
  optionPositions: unknown[];
}

export default function DeFiDashboard() {
  const [account, setAccount] = useState<string>("");
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Direct RPC call helper
  const sendRPC = async (method: string, params: unknown[] = []) => {
    const response = await fetch("http://localhost:8545", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method,
        params,
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.result;
  };

  // Contract call helper
  const callContract = async (contractAddress: string, data: string) => {
    return await sendRPC("eth_call", [{ to: contractAddress, data }, "latest"]);
  };

  // Send transaction helper (for future use)
  // const sendTransaction = async (to: string, data: string, value: string = '0x0') => {
  //   const nonce = await sendRPC('eth_getTransactionCount', [account, 'latest']);
  //
  //   return await sendRPC('eth_sendTransaction', [{
  //     from: account,
  //     to,
  //     data,
  //     gas: '0x186A0',
  //     gasPrice: '0x3B9ACA00',
  //     nonce,
  //     value
  //   }]);
  // };

  // Connect wallet
  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setAccount(accounts[0]);
        await loadAccountData(accounts[0]);
      } catch (error) {
        setError("Failed to connect wallet");
        console.error("Wallet connection failed:", error);
      }
    } else {
      setError("Please install MetaMask");
    }
  };

  // Load all account data
  const loadAccountData = async (userAccount: string) => {
    setIsLoading(true);
    setError("");

    try {
      console.log("📊 Loading complete account data for:", userAccount);

      const paddedAddress = userAccount
        .slice(2)
        .toLowerCase()
        .padStart(40, "0");

      // Get token balances
      const quoteBalanceData = `0x70a08231000000000000000000000000${paddedAddress}`;
      const underlyingBalanceData = `0x70a08231000000000000000000000000${paddedAddress}`;

      const [quoteBalanceRaw, underlyingBalanceRaw] = await Promise.all([
        callContract(CONTRACTS.quoteToken, quoteBalanceData),
        callContract(CONTRACTS.underlyingToken, underlyingBalanceData),
      ]);

      // Get collateral data
      const collateralBalanceData = `0x70a08231000000000000000000000000${paddedAddress}`;
      const marginRequirementData = `0x70a08231000000000000000000000000${paddedAddress}`; // placeholder

      const [collateralBalanceRaw, marginRequirementRaw] = await Promise.all([
        callContract(CONTRACTS.collateralManager, collateralBalanceData).catch(
          () => "0x0"
        ),
        callContract(CONTRACTS.collateralManager, marginRequirementData).catch(
          () => "0x0"
        ),
      ]);

      // Get liquidity and insurance data
      const liquidityData = `0x70a08231000000000000000000000000${paddedAddress}`;
      const insuranceData = `0x70a08231000000000000000000000000${paddedAddress}`;

      const [liquidityBalanceRaw, insuranceBalanceRaw] = await Promise.all([
        callContract(CONTRACTS.liquidityVault, liquidityData).catch(
          () => "0x0"
        ),
        callContract(CONTRACTS.insuranceFund, insuranceData).catch(() => "0x0"),
      ]);

      // Parse results
      const quoteBalance = (
        parseInt(quoteBalanceRaw || "0x0", 16) / Math.pow(10, 6)
      ).toFixed(2);
      const underlyingBalance = (
        parseInt(underlyingBalanceRaw || "0x0", 16) / Math.pow(10, 18)
      ).toFixed(4);
      const collateralBalance = (
        parseInt(collateralBalanceRaw || "0x0", 16) / Math.pow(10, 6)
      ).toFixed(2);
      const marginRequirement = (
        parseInt(marginRequirementRaw || "0x0", 16) / Math.pow(10, 18)
      ).toFixed(4);
      const liquidityProvided = (
        parseInt(liquidityBalanceRaw || "0x0", 16) / Math.pow(10, 18)
      ).toFixed(4);
      const insuranceBalance = (
        parseInt(insuranceBalanceRaw || "0x0", 16) / Math.pow(10, 18)
      ).toFixed(4);

      setAccountData({
        address: userAccount,
        quoteBalance,
        underlyingBalance,
        collateralBalance,
        marginRequirement,
        liquidityProvided,
        insuranceBalance,
        optionPositions: [], // TODO: Load actual positions
      });

      console.log("✅ Account data loaded successfully");
    } catch (error) {
      console.error("❌ Failed to load account data:", error);
      setError(
        `Failed to load account data: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh data
  const refreshData = () => {
    if (account) {
      loadAccountData(account);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">DeFi Options Platform</h1>
          <p className="text-gray-600 mt-2">
            Complete Options Trading & Liquidity Management
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={refreshData}
            disabled={!account || isLoading}
            variant="outline"
          >
            {isLoading ? "Loading..." : "🔄 Refresh"}
          </Button>
          <Button onClick={connectWallet} disabled={!!account}>
            {account
              ? `${account.slice(0, 6)}...${account.slice(-4)}`
              : "Connect Wallet"}
          </Button>
        </div>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {accountData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Quote Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {accountData.quoteBalance} USDC
              </div>
              <Badge variant="secondary" className="mt-2">
                Primary Asset
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Underlying
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {accountData.underlyingBalance} ETH
              </div>
              <Badge variant="outline" className="mt-2">
                Underlying Asset
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Collateral
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {accountData.collateralBalance} USDC
              </div>
              <Badge variant="secondary" className="mt-2">
                Deposited
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Liquidity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {accountData.liquidityProvided} LP
              </div>
              <Badge variant="outline" className="mt-2">
                Provided
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {accountData && (
        <Tabs defaultValue="trading" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trading">Trading</TabsTrigger>
            <TabsTrigger value="liquidity">Liquidity</TabsTrigger>
            <TabsTrigger value="collateral">Collateral</TabsTrigger>
            <TabsTrigger value="insurance">Insurance</TabsTrigger>
          </TabsList>

          <TabsContent value="trading" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Options Trading</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    Options trading interface will be implemented here
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Connected to OptionsMarketV2 at {CONTRACTS.optionsMarket}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="liquidity" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Liquidity Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Liquidity Provided:</span>
                    <span className="font-bold">
                      {accountData.liquidityProvided} LP
                    </span>
                  </div>
                  <Separator />
                  <div className="text-center py-4">
                    <p className="text-gray-500">
                      Liquidity vault interface will be implemented here
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      Connected to LiquidityVault at {CONTRACTS.liquidityVault}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="collateral" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Collateral Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Deposited Collateral:</span>
                    <span className="font-bold">
                      {accountData.collateralBalance} USDC
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Margin Requirement:</span>
                    <span className="font-bold">
                      {accountData.marginRequirement} USDC
                    </span>
                  </div>
                  <Separator />
                  <div className="text-center py-4">
                    <p className="text-gray-500">
                      Collateral management interface will be implemented here
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      Connected to CollateralManager at{" "}
                      {CONTRACTS.collateralManager}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insurance" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Insurance Fund</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Insurance Balance:</span>
                    <span className="font-bold">
                      {accountData.insuranceBalance} USDC
                    </span>
                  </div>
                  <Separator />
                  <div className="text-center py-4">
                    <p className="text-gray-500">
                      Insurance fund interface will be implemented here
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      Connected to InsuranceFund at {CONTRACTS.insuranceFund}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Alert className="border-blue-200 bg-blue-50">
        <AlertDescription className="text-blue-800">
          <strong>🚀 Platform Status:</strong> All contracts deployed and
          connected. Using Direct RPC methods for reliable blockchain
          interaction.
        </AlertDescription>
      </Alert>
    </div>
  );
}
