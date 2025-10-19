"use client";

import * as React from "react";

interface IVPoint {
    strike: number;
    iv: number; // Implied Volatility
}

interface IVSmileChartProps {
    data: IVPoint[];
    underlying: string;
    expiry: string;
}

export function IVSmileChart({ data, underlying, expiry }: IVSmileChartProps) {
    const chartContainerRef = React.useRef<HTMLDivElement>(null);
    // const chartRef = React.useRef<IChartApi | null>(null);
    // const seriesRef = React.useRef<ILineSeriesApi | null>(null);

    React.useEffect(() => {
        if (!chartContainerRef.current) return;

        console.log(`Rendering IV Smile for ${underlying} @ ${expiry}:`, data);

        return () => {
            // if (chartRef.current) chartRef.current.remove();
        };
    }, [data, underlying, expiry]);

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-semibold">
                IV Smile: {underlying} (Expiry: {expiry})
            </h3>
            <div
                ref={chartContainerRef}
                className="w-full h-80 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center border border-dashed"
            >
                <p className="text-muted-foreground">
                    {data.length > 0
                        ? "IV Smile Chart (TradingView Charts Placeholder)"
                        : "Select an asset and expiry for visualization"}
                </p>
            </div>

            {data.length > 0 && (
                <div className="max-h-40 overflow-y-auto border rounded-lg p-2">
                    <p className="font-medium text-sm mb-1">IV Data (Strike {"->"} IV)</p>
                    <div className="text-xs space-y-0.5">
                        {data.map((p, index) => (
                            <span key={index} className="inline-block mr-4">
                                {p.strike}: {p.iv.toFixed(4)}%
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
