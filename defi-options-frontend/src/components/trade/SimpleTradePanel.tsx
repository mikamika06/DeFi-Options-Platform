"use client";

import React, { useMemo, useState } from "react";
import { erc20Abi, formatUnits, maxUint256, parseUnits } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useSendTransaction,
  useWriteContract,
} from "wagmi";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useOptionSeries } from "@/hooks/useOptionSeries";
import { useOptionQuoteSubscription } from "@/hooks/useOptionQuoteSubscription";
import { useTradeExecution } from "@/hooks/useTradeExecution";
import {
  OPTIONS_MARKET_ADDRESS,
  QUOTE_TOKEN_ADDRESS,
} from "@/contracts/constants";
const SLIPPAGE_BPS_DEFAULT = 200n; // 2% buffer over quoted premium

export function SimpleTradePanel() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();

  const {
    series,
    fetching: seriesFetching,
    error: seriesError,
  } = useOptionSeries();

  const [selectedSeriesId, setSelectedSeriesId] = useState<string>("");
  const [amount, setAmount] = useState<string>("1");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("");

  const marketAddress = OPTIONS_MARKET_ADDRESS as `0x${string}`;
  const quoteTokenAddress = QUOTE_TOKEN_ADDRESS as `0x${string}`;

  React.useEffect(() => {
    if (!selectedSeriesId && series.length > 0) {
      setSelectedSeriesId(series[0].id);
    }
  }, [series, selectedSeriesId]);

  const selectedSeries = useMemo(
    () => series.find((item) => item.id === selectedSeriesId) ?? null,
    [series, selectedSeriesId]
  );

  const sizeNumber = useMemo(() => {
    const numeric = Number(amount);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
  }, [amount]);

  const quoteDecimals = selectedSeries?.quoteDecimals ?? 6;

  const {
    quote,
    totalFormatted,
    fetching: quoteFetching,
    error: quoteError,
  } = useOptionQuoteSubscription(
    selectedSeries?.id ?? null,
    sizeNumber,
    quoteDecimals
  );

  const { data: walletBalance, refetch: refetchWalletBalance } =
    useReadContract({
      address: quoteTokenAddress,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: address ? [address] : undefined,
      query: { enabled: Boolean(address) },
    });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: quoteTokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, marketAddress] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { executeTrade } = useTradeExecution();

  const formattedBalance = useMemo(() => {
    if (walletBalance === undefined) return "0.00";
    return formatUnits(walletBalance, quoteDecimals);
  }, [walletBalance, quoteDecimals]);

  const maxPremiumWithBuffer = useMemo(() => {
    if (!quote) return 0n;
    return quote.total + (quote.total * SLIPPAGE_BPS_DEFAULT) / 10_000n;
  }, [quote]);

  const handleTrade = async () => {
    if (!isConnected) {
      setLastMessage("Please connect your wallet to execute the trade.");
      return;
    }
    if (!publicClient) {
      setLastMessage("No RPC client available.");
      return;
    }
    if (!selectedSeries || !quote || sizeNumber <= 0) {
      setLastMessage("Please select a series and enter a positive size.");
      return;
    }

    try {
      setIsProcessing(true);
      setLastMessage("");

      const sizeWad = parseUnits(sizeNumber.toString(), 18).toString();
      const maxPremium = maxPremiumWithBuffer.toString();

      const requiredAllowance = maxPremiumWithBuffer;
      const currentAllowance = allowance ?? 0n;

      if (requiredAllowance > 0n && currentAllowance < requiredAllowance) {
        const approveHash = await writeContractAsync({
          address: quoteTokenAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [marketAddress, maxUint256],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        await refetchAllowance();
      }

      const tradeResponse = await executeTrade(
        selectedSeries.id,
        sizeWad,
        maxPremium
      );

      const calldata = tradeResponse.data?.tradeCalldata;
      if (!calldata) {
        throw new Error("Backend did not return calldata for trade.");
      }

      const txHash = await sendTransactionAsync({
        to: marketAddress,
        data: calldata as `0x${string}`,
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });

      await Promise.all([refetchWalletBalance(), refetchAllowance()]);
      setLastMessage("✅ Trade executed successfully.");
    } catch (error) {
      console.error("Simple trade failed:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      setLastMessage(`❌ Error: ${message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const disableTrade =
    !selectedSeries ||
    sizeNumber <= 0 ||
    quoteFetching ||
    seriesFetching ||
    isProcessing;

  return (
    <Card className="w-full border border-border/70 bg-white/95 shadow-lg">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl font-semibold text-foreground">
          Quick Option Purchase
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Selects the first available series and executes the trade through the
          backend with margin support. For full control, use the advanced form.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Series
          </label>
          <select
            className="w-full rounded-xl border border-border/60 bg-white px-3 py-2 text-sm"
            value={selectedSeriesId}
            onChange={(event) => setSelectedSeriesId(event.target.value)}
            disabled={seriesFetching || series.length === 0}
          >
            {series.map((item) => (
              <option key={item.id} value={item.id}>
                {item.underlyingSymbol} · {item.optionType} · strike{" "}
                {item.strike.toFixed(2)}
              </option>
            ))}
          </select>
          {seriesError && (
            <p className="text-xs text-red-600">
              Failed to fetch series: {seriesError.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Position Size (contracts)
          </label>
          <Input
            type="number"
            min="0"
            step="0.1"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            disabled={!isConnected}
          />
        </div>

        <div className="rounded-2xl border border-border/60 bg-muted/40 px-4 py-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Wallet Balance</span>
            <span className="font-semibold text-foreground">
              {formattedBalance} USDC
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-muted-foreground">
              Estimated Premium + Fee
            </span>
            <span className="font-semibold text-foreground">
              {quote ? `${totalFormatted} USDC` : "—"}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-muted-foreground">
              Limit with Buffer (2%)
            </span>
            <span className="font-semibold text-foreground">
              {quote
                ? `${formatUnits(maxPremiumWithBuffer, quoteDecimals)} USDC`
                : "—"}
            </span>
          </div>
          {quoteError && (
            <p className="mt-2 text-xs text-red-600">
              Failed to fetch quote: {quoteError.message}
            </p>
          )}
        </div>

        <Button
          onClick={handleTrade}
          disabled={disableTrade}
          className="w-full rounded-full py-4 text-base font-semibold"
        >
          {isProcessing ? "Processing trade..." : "Buy Option"}
        </Button>

        {lastMessage && (
          <p className="text-sm text-muted-foreground">{lastMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}
