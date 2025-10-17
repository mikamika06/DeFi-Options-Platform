"use client";

import * as React from "react";
import { format } from "date-fns";
import { parseUnits, formatUnits, erc20Abi, maxUint256 } from "viem";
import { useAccount, useSendTransaction, useReadContract, useWriteContract, usePublicClient } from "wagmi";

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { OptionSeries } from "@/hooks/useOptionSeries";
import { useOptionQuoteSubscription } from "@/hooks/useOptionQuoteSubscription";
import { useTradeExecution } from "@/hooks/useTradeExecution";
import { OPTIONS_MARKET_ADDRESS } from "@/contracts/constants";

interface OptionFormProps {
  availableSeries: OptionSeries[];
}

const ZERO = BigInt(0);
const SLIPPAGE_DENOMINATOR = BigInt(10_000);
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export function OptionForm({ availableSeries }: OptionFormProps) {
  const [selectedSeriesId, setSelectedSeriesId] = React.useState<string>(() => availableSeries[0]?.id ?? "");
  const [amount, setAmount] = React.useState<string>("1");
  const [slippageBps, setSlippageBps] = React.useState<number>(50);
  const [tradeSide, setTradeSide] = React.useState<"long" | "short">("long");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const { address } = useAccount();
  const marketAddress = React.useMemo(() => OPTIONS_MARKET_ADDRESS as `0x${string}`, []);

  React.useEffect(() => {
    if (availableSeries.length === 0) {
      setSelectedSeriesId("");
      return;
    }
    if (!selectedSeriesId || !availableSeries.some((s) => s.id === selectedSeriesId)) {
      setSelectedSeriesId(availableSeries[0].id);
    }
  }, [availableSeries, selectedSeriesId]);

  const selectedSeries = React.useMemo(
    () => availableSeries.find((series) => series.id === selectedSeriesId) ?? null,
    [availableSeries, selectedSeriesId]
  );

  const sizeNumber = Number(amount) || 0;
  const quoteDecimals = selectedSeries?.quoteDecimals ?? 6;

  const { quote, totalFormatted, fetching: quoteFetching } = useOptionQuoteSubscription(
    selectedSeries?.id ?? null,
    sizeNumber,
    quoteDecimals
  );

  const totalPremium = quote?.total ?? ZERO;
  const premiumOnly = quote?.premium ?? ZERO;
  const premiumFormatted = React.useMemo(() => formatUnits(premiumOnly, quoteDecimals), [premiumOnly, quoteDecimals]);

  const maxPremium = React.useMemo(() => {
    if (totalPremium === ZERO) return ZERO;
    return totalPremium + (totalPremium * BigInt(slippageBps)) / SLIPPAGE_DENOMINATOR;
  }, [totalPremium, slippageBps]);

  const { executeTrade, getOpenShortCalldata } = useTradeExecution();
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const quoteTokenAddress = React.useMemo(() => {
    if (!selectedSeries?.quoteAddress || !selectedSeries.quoteAddress.startsWith("0x")) return undefined;
    return selectedSeries.quoteAddress as `0x${string}`;
  }, [selectedSeries]);

  const {
    data: allowanceData,
    refetch: refetchAllowance,
    isFetching: allowanceFetching
  } = useReadContract({
    address: quoteTokenAddress ?? ZERO_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: [address ?? ZERO_ADDRESS, marketAddress],
    query: {
      enabled: Boolean(address && quoteTokenAddress)
    }
  });

  const handleTrade = async () => {
    if (!selectedSeries || sizeNumber <= 0) return;
    if (!quote) return;

    try {
      setIsProcessing(true);
      const sizeWad = parseUnits(sizeNumber.toString(), 18).toString();
      if (tradeSide === "long") {
        if (!address || !quoteTokenAddress || !publicClient) {
          console.error("wallet or quote token not ready");
          return;
        }
        const maxPremiumWad = maxPremium.toString();
        const requiredAllowance = maxPremium > ZERO ? maxPremium : ZERO;
        const currentAllowance = allowanceData ?? ZERO;

        if (requiredAllowance > ZERO && currentAllowance < requiredAllowance) {
          try {
            const hash = await writeContractAsync({
              address: quoteTokenAddress,
              abi: erc20Abi,
              functionName: "approve",
              args: [marketAddress, maxUint256]
            });
            await publicClient.waitForTransactionReceipt({ hash });
            await refetchAllowance();
          } catch (approveError) {
            console.error("approval failed", approveError);
            return;
          }
        }

        const response = await executeTrade(selectedSeries.id, sizeWad, maxPremiumWad);
        const calldata = response.data?.tradeCalldata;
        if (!calldata) {
          console.error("calldata not returned");
          return;
        }

        await sendTransactionAsync({
          to: marketAddress,
          data: calldata as `0x${string}`
        });
      } else {
        if (!address) {
          console.error("wallet not connected");
          return;
        }
        const response = await getOpenShortCalldata(selectedSeries.id, sizeWad, address);
        const calldata = response.data?.openShortCalldata;
        if (!calldata) {
          console.error("calldata not returned");
          return;
        }
        await sendTransactionAsync({
          to: marketAddress,
          data: calldata as `0x${string}`
        });
      }
    } catch (error) {
      console.error("trade failed", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const prettyExpiry = selectedSeries
    ? format(new Date(selectedSeries.expiry * 1000), "yyyy-MM-dd HH:mm")
    : "—";

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Торгівля опціонами</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Серія</label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={selectedSeriesId}
            onChange={(event) => setSelectedSeriesId(event.target.value)}
          >
            {availableSeries.map((series) => (
              <option key={series.id} value={series.id}>
                {series.underlyingSymbol} · {series.optionType} · strike {series.strike} · exp{" "}
                {format(new Date(series.expiry * 1000), "yyyy-MM-dd")}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Дія</label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={tradeSide}
            onChange={(event) => setTradeSide(event.target.value as "long" | "short")}
          >
            <option value="long">Купити опціон (Long)</option>
            <option value="short">Відкрити шорт (Writer)</option>
          </select>
        </div>

        <div className="grid grid-cols-6 gap-4">
          <div className="col-span-3 space-y-2">
            <label className="text-sm font-medium">Кількість контрактів</label>
            <Input
              type="number"
              min="0"
              step="0.1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <div className="col-span-3 space-y-2">
            <label className="text-sm font-medium">Сліпедж (bps)</label>
            <Input
              type="number"
              min="0"
              step="10"
              value={slippageBps}
              onChange={(event) => setSlippageBps(Number(event.target.value) || 0)}
            />
          </div>
        </div>

        <div className="rounded-md border p-4 space-y-1 text-sm">
          <div>
            <span className="text-muted-foreground">Премія + комісія:</span> {totalFormatted}{" "}
            {selectedSeries?.quoteSymbol}
            {quoteFetching && <span className="ml-2 text-xs text-muted-foreground">оновлення…</span>}
          </div>
          {tradeSide === "short" && (
            <div>
              <span className="text-muted-foreground">Вимога до маржі:</span> {premiumFormatted}{" "}
              {selectedSeries?.quoteSymbol}
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Максимум (з урахуванням сліпеджу):</span>{" "}
            {formatUnits(maxPremium, quoteDecimals)} {selectedSeries?.quoteSymbol}
          </div>
          <div>
            <span className="text-muted-foreground">Експірація:</span> {prettyExpiry}
          </div>
        </div>

        <Button
          className="w-full"
          disabled={
            !selectedSeries ||
            sizeNumber <= 0 ||
            !quote ||
            quoteFetching ||
            (tradeSide === "short" && !address) ||
            isProcessing ||
            allowanceFetching
          }
          onClick={handleTrade}
        >
          {isProcessing ? "Підтвердження…" : tradeSide === "long" ? "Виконати угоду" : "Відкрити шорт"}
        </Button>
      </CardContent>
    </Card>
  );
}
