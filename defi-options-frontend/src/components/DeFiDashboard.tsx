"use client";

import React, { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { DEPLOYMENT_ADDRESSES } from "@/contracts/constants";
import { OptionsListPanel } from "@/components/options/OptionsListPanel";
import { useOptionSeries } from "@/hooks/useOptionSeries";

// Contract addresses from deployment
const CONTRACTS = {
  optionToken: DEPLOYMENT_ADDRESSES.optionToken,
  collateralManager: DEPLOYMENT_ADDRESSES.collateralManager,
  liquidityVault: DEPLOYMENT_ADDRESSES.liquidityVault,
  insuranceFund: DEPLOYMENT_ADDRESSES.insuranceFund,
  optionsMarket: DEPLOYMENT_ADDRESSES.optionsMarket,
  quoteToken: DEPLOYMENT_ADDRESSES.quoteToken,
  underlyingToken: DEPLOYMENT_ADDRESSES.underlyingToken,
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

  // Get options data for dashboard stats
  const { series: optionSeries, fetching: optionsFetching } = useOptionSeries();

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

  const formatKey = (value: string) =>
    value
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (char) => char.toUpperCase());

  const statCards = useMemo(() => {
    if (!accountData) return [];

    const activeOptions = optionSeries.filter((s) => !s.isSettled).length;
    const totalOptions = optionSeries.length;

    return [
      {
        key: "quoteBalance",
        label: "Quote Balance",
        value: `${accountData.quoteBalance} USDC`,
        badge: { label: "Primary Asset", tone: "primary" as const },
      },
      {
        key: "underlyingBalance",
        label: "Underlying",
        value: `${accountData.underlyingBalance} ETH`,
        badge: { label: "Underlying Asset", tone: "neutral" as const },
      },
      {
        key: "collateralBalance",
        label: "Collateral",
        value: `${accountData.collateralBalance} USDC`,
        badge: { label: "Deposited", tone: "primary" as const },
      },
      {
        key: "optionsAvailable",
        label: "Options Series",
        value: optionsFetching
          ? "Loading..."
          : `${activeOptions}/${totalOptions}`,
        badge: { label: "Active/Total", tone: "primary" as const },
      },
    ];
  }, [accountData, optionSeries, optionsFetching]);

  return (
    <div className="space-y-8">
      <Card className="border border-border/60 bg-white/95 shadow-md">
        <CardHeader className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <CardTitle className="text-3xl font-bold text-foreground">
              DeFi Options Platform
            </CardTitle>
            <CardDescription className="max-w-2xl text-base leading-relaxed text-muted-foreground">
              Manage options positions, liquidity, and insurance from a unified
              interface. Connect your wallet to access real-time data from the
              protocol.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              onClick={refreshData}
              disabled={!account || isLoading}
              variant="outline"
              className="rounded-full border-border/80 bg-white/90 px-6 text-sm font-medium shadow-sm hover:border-primary/30 hover:text-primary"
            >
              {isLoading ? "Loading…" : "🔄 Refresh Data"}
            </Button>
            <Button
              onClick={connectWallet}
              variant="default"
              className="rounded-full px-6 text-sm font-semibold shadow-sm hover:shadow-md"
            >
              {account
                ? `${account.slice(0, 6)}…${account.slice(-4)}`
                : "Connect Wallet"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="border-t border-border/60 pt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Key Contracts
          </p>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(CONTRACTS).map(([key, value]) => (
              <div
                key={key}
                className="rounded-xl border border-border/70 bg-white/80 px-4 py-3 text-muted-foreground transition-shadow hover:shadow-sm"
              >
                <span className="block text-xs font-semibold uppercase tracking-wider text-foreground/70">
                  {formatKey(key)}
                </span>
                <code className="mt-1 block truncate font-mono text-xs text-foreground/80">
                  {value}
                </code>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert className="border border-red-100 bg-red-50/80 text-red-700">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {accountData && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((item) => (
            <Card
              key={item.key}
              className="border border-border/60 bg-white shadow-sm transition-shadow hover:shadow-lg"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {item.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-3xl font-semibold text-foreground">
                  {item.value}
                </p>
                <Badge
                  variant={
                    item.badge.tone === "primary" ? "secondary" : "outline"
                  }
                  className={`w-fit rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${
                    item.badge.tone === "primary"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted/70 text-muted-foreground"
                  }`}
                >
                  {item.badge.label}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {accountData && (
        <Tabs defaultValue="trading" className="w-full space-y-6">
          <TabsList className="w-full flex-wrap justify-start gap-2">
            <TabsTrigger value="trading" className="flex-1 sm:flex-none">
              Trading
            </TabsTrigger>
            <TabsTrigger value="options" className="flex-1 sm:flex-none">
              Options
            </TabsTrigger>
            <TabsTrigger value="liquidity" className="flex-1 sm:flex-none">
              Liquidity
            </TabsTrigger>
            <TabsTrigger value="collateral" className="flex-1 sm:flex-none">
              Collateral
            </TabsTrigger>
            <TabsTrigger value="insurance" className="flex-1 sm:flex-none">
              Insurance Fund
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trading">
            <Card className="border border-border/60 bg-white/95 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">
                  Options Trading
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Advanced trading interface with integrated limits, IV
                  analysis, and risk metrics.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-2xl border border-dashed border-border/60 bg-white/70 px-6 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Trading interface connects to OptionsMarketV2 at:
                  </p>
                  <code className="mt-3 inline-block rounded-full bg-muted px-4 py-2 text-xs font-semibold text-foreground">
                    {CONTRACTS.optionsMarket}
                  </code>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="options">
            <div className="space-y-6">
              <OptionsListPanel showActions={false} />
              <Card className="border border-border/60 bg-white/95 shadow-sm">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Navigate to trading or options administration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => window.open("/trade", "_blank")}
                      className="flex items-center gap-2"
                    >
                      📈 Trade Options
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.open("/positions", "_blank")}
                      className="flex items-center gap-2"
                    >
                      📊 My Positions
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.open("/admin", "_blank")}
                      className="flex items-center gap-2"
                    >
                      ⚙️ Admin Panel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="liquidity">
            <Card className="border border-border/60 bg-white/95 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">
                  Liquidity Management
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Monitor pool metrics and reserve checkpoints.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    Provided Liquidity
                  </span>
                  <span className="text-lg font-semibold text-foreground">
                    {accountData.liquidityProvided} LP
                  </span>
                </div>
                <Separator />
                <div className="rounded-2xl border border-dashed border-border/60 bg-white/70 px-6 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    LiquidityVault interface connected to contract:
                  </p>
                  <code className="mt-3 inline-block rounded-full bg-muted px-4 py-2 text-xs font-semibold text-foreground">
                    {CONTRACTS.liquidityVault}
                  </code>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="collateral">
            <Card className="border border-border/60 bg-white/95 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">
                  Collateral and Margin
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Monitor margin requirements and collateral balance.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-muted/60 px-4 py-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Deposit
                    </span>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {accountData.collateralBalance} USDC
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/60 px-4 py-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Margin Requirement
                    </span>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {accountData.marginRequirement} USDC
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="rounded-2xl border border-dashed border-border/60 bg-white/70 px-6 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Managed by CollateralManager at address:
                  </p>
                  <code className="mt-3 inline-block rounded-full bg-muted px-4 py-2 text-xs font-semibold text-foreground">
                    {CONTRACTS.collateralManager}
                  </code>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insurance">
            <Card className="border border-border/60 bg-white/95 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">
                  Insurance Fund
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Supports loss coverage and collects premiums from the market.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    Insurance Balance
                  </span>
                  <span className="text-lg font-semibold text-foreground">
                    {accountData.insuranceBalance} USDC
                  </span>
                </div>
                <Separator />
                <div className="rounded-2xl border border-dashed border-border/60 bg-white/70 px-6 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Current InsuranceFund address:
                  </p>
                  <code className="mt-3 inline-block rounded-full bg-muted px-4 py-2 text-xs font-semibold text-foreground">
                    {CONTRACTS.insuranceFund}
                  </code>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* <Alert className="border-blue-200 bg-blue-50">
        <AlertDescription className="text-blue-800">
          <strong>🚀 Platform Status:</strong> All contracts deployed and
          connected. Using Direct RPC methods for reliable blockchain
          interaction.
        </AlertDescription>
      </Alert> */}
    </div>
  );
}
