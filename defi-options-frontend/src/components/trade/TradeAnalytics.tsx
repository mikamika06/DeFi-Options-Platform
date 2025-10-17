"use client";

import * as React from "react";
import { useOptionSeries } from "@/hooks/useOptionSeries"; // Хук з Кроку 2.2
import type { OptionSeries } from "@/hooks/useOptionSeries";
import { IVSmileChart } from "@/components/risk/IVSmileChart";
import { Card, CardContent } from "@/components/ui/card";

interface IVPoint {
  strike: number;
  iv: number;
}

export function TradeAnalytics() {
  const [selectedUnderlying, setSelectedUnderlying] = React.useState("ETH");
  const [selectedExpiry, setSelectedExpiry] = React.useState<string | null>(
    null
  );

  const { series, fetching } = useOptionSeries(selectedUnderlying);

  const availableExpiries: string[] = React.useMemo(() => {
    const dates = new Set(
      series.map((s: OptionSeries) =>
        new Date(s.expiry * 1000).toLocaleDateString("uk-UA")
      )
    );
    return Array.from(dates);
  }, [series]);

  React.useEffect(() => {
    if (!selectedExpiry && availableExpiries.length > 0) {
      setSelectedExpiry(availableExpiries[0] as string);
    }
  }, [availableExpiries, selectedExpiry]);

  const ivSmileData: IVPoint[] = React.useMemo(() => {
    if (!selectedExpiry) return [];

    const filteredSeries = series.filter(
      (s: OptionSeries) =>
        new Date(s.expiry * 1000).toLocaleDateString("uk-UA") ===
          selectedExpiry && s.iv != null 
    );

    return filteredSeries
      .map((s: OptionSeries) => ({
        strike: s.strike,
        iv: Number(s.iv)
      }))
      .sort((a: IVPoint, b: IVPoint) => a.strike - b.strike);
  }, [series, selectedExpiry]);

  return (
    <Card className="p-4">
      <CardContent>
        <div className="mb-4 flex space-x-4">
          <select
            onChange={(e) => setSelectedUnderlying(e.target.value)}
            value={selectedUnderlying}
            disabled={fetching}
          >
            <option value="ETH">ETH</option>
            <option value="BTC">BTC</option>
          </select>
          <select
            onChange={(e) => setSelectedExpiry(e.target.value)}
            value={selectedExpiry || ""}
            disabled={fetching || availableExpiries.length === 0}
          >
            {availableExpiries.map((date: string) => (
              <option key={date} value={date}>
                {date}
              </option>
            ))}
          </select>
        </div>

        {fetching && (
          <div className="text-center">Завантаження IV даних...</div>
        )}

        {!fetching && selectedExpiry && (
          <IVSmileChart
            data={ivSmileData}
            underlying={selectedUnderlying}
            expiry={selectedExpiry}
          />
        )}
      </CardContent>
    </Card>
  );
}
