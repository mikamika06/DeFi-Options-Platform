"use client";

import * as React from "react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOptionSeries } from "@/hooks/useOptionSeries";
import type { OptionSeries } from "@/hooks/useOptionSeries";
import {
    AlertCircle,
    TrendingUp,
    TrendingDown,
    Calendar,
    DollarSign,
} from "lucide-react";

interface OptionsListPanelProps {
    onSelectSeries?: (series: OptionSeries) => void;
    showActions?: boolean;
}

export function OptionsListPanel({
    onSelectSeries,
    showActions = false,
}: OptionsListPanelProps) {
    const { series, fetching, error } = useOptionSeries();
    const [filterType, setFilterType] = React.useState<"ALL" | "CALL" | "PUT">(
        "ALL"
    );
    const [sortBy, setSortBy] = React.useState<"expiry" | "strike" | "volume">(
        "expiry"
    );

    const filteredAndSortedSeries = React.useMemo(() => {
        let filtered = series;

        // Filter by option type
        if (filterType !== "ALL") {
            filtered = filtered.filter((s) => s.optionType === filterType);
        }

        // Sort by selected criteria
        return filtered.sort((a, b) => {
            switch (sortBy) {
                case "expiry":
                    return a.expiry - b.expiry;
                case "strike":
                    return a.strike - b.strike;
                case "volume":
                    // Sort by implied volatility as proxy for volume/activity
                    const aIv = a.iv || 0;
                    const bIv = b.iv || 0;
                    return bIv - aIv;
                default:
                    return 0;
            }
        });
    }, [series, filterType, sortBy]);

    const groupedByExpiry = React.useMemo(() => {
        const groups = new Map<string, OptionSeries[]>();

        filteredAndSortedSeries.forEach((series) => {
            const expiryDate = format(new Date(series.expiry * 1000), "yyyy-MM-dd", {
                locale: uk,
            });
            const existing = groups.get(expiryDate) || [];
            groups.set(expiryDate, [...existing, series]);
        });

        return Array.from(groups.entries()).map(([date, seriesList]) => ({
            expiry: date,
            series: seriesList.sort((a, b) => a.strike - b.strike),
        }));
    }, [filteredAndSortedSeries]);

    const getMoneyness = (series: OptionSeries, spotPrice = 3600) => {
        const ratio = series.strike / spotPrice;
        if (series.optionType === "CALL") {
            if (ratio < 0.95) return "ITM"; // In The Money
            if (ratio > 1.05) return "OTM"; // Out of The Money
            return "ATM"; // At The Money
        } else {
            if (ratio > 1.05) return "ITM";
            if (ratio < 0.95) return "OTM";
            return "ATM";
        }
    };

    const getMoneynessColor = (moneyness: string) => {
        switch (moneyness) {
            case "ITM":
                return "bg-green-100 text-green-800";
            case "ATM":
                return "bg-yellow-100 text-yellow-800";
            case "OTM":
                return "bg-gray-100 text-gray-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const getDaysToExpiry = (expiry: number) => {
        const now = Date.now() / 1000;
        const days = Math.max(0, Math.floor((expiry - now) / (24 * 60 * 60)));
        return days;
    };

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        Loading Error
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-red-600">{error.message}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Available Options</span>
                        <Badge variant="secondary">{series.length} series</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Filters and Controls */}
                    <div className="mb-6 flex flex-wrap items-center gap-4">
                        <Tabs
                            value={filterType}
                            onValueChange={(v) => setFilterType(v as typeof filterType)}
                        >
                            <TabsList>
                                <TabsTrigger value="ALL">All</TabsTrigger>
                                <TabsTrigger value="CALL">Call Options</TabsTrigger>
                                <TabsTrigger value="PUT">Put Options</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Sort by:</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                                className="rounded-md border border-input bg-background px-3 py-1 text-sm"
                            >
                                <option value="expiry">By Expiry</option>
                                <option value="strike">By Strike</option>
                                <option value="volume">By Activity</option>
                            </select>
                        </div>
                    </div>

                    {/* Loading State */}
                    {fetching && (
                        <div className="py-8 text-center">
                            <div className="inline-flex items-center gap-2 text-muted-foreground">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                Loading options...
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!fetching && series.length === 0 && (
                        <div className="py-8 text-center">
                            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                <DollarSign className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium">No Available Options</h3>
                            <p className="text-sm text-muted-foreground">
                                Create new series through the admin panel or wait for them to appear
                            </p>
                        </div>
                    )}

                    {/* Options Table by Expiry */}
                    {!fetching && series.length > 0 && (
                        <div className="space-y-8">
                            {groupedByExpiry.map(({ expiry, series: expiryOptions }) => (
                                <div key={expiry} className="space-y-4">
                                    <div className="flex items-center gap-2 border-b pb-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="font-semibold">Expiry: {expiry}</h3>
                                        <Badge variant="outline">
                                            {getDaysToExpiry(expiryOptions[0].expiry)} days
                                        </Badge>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead className="text-right">Strike</TableHead>
                                                    <TableHead>Moneyness</TableHead>
                                                    <TableHead>Asset</TableHead>
                                                    <TableHead className="text-right">IV</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    {showActions && <TableHead>Actions</TableHead>}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {expiryOptions.map((option) => {
                                                    const moneyness = getMoneyness(option);

                                                    return (
                                                        <TableRow
                                                            key={option.id}
                                                            className="cursor-pointer hover:bg-muted/50"
                                                        >
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    {option.optionType === "CALL" ? (
                                                                        <TrendingUp className="h-4 w-4 text-green-600" />
                                                                    ) : (
                                                                        <TrendingDown className="h-4 w-4 text-red-600" />
                                                                    )}
                                                                    <span
                                                                        className={`font-medium ${
                                                                            option.optionType === "CALL"
                                                                                ? "text-green-600"
                                                                                : "text-red-600"
                                                                        }`}
                                                                    >
                                                                        {option.optionType}
                                                                    </span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono">
                                                                ${option.strike.toLocaleString()}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge className={getMoneynessColor(moneyness)}>
                                                                    {moneyness}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="space-y-1">
                                                                    <div className="font-medium">
                                                                        {option.underlyingSymbol}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        Quote: {option.quoteSymbol}
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {option.iv ? (
                                                                    <span className="font-mono">
                                                                        {(option.iv * 100).toFixed(1)}%
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-muted-foreground">
                                                                        —
                                                                    </span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    variant={
                                                                        option.isSettled ? "destructive" : "default"
                                                                    }
                                                                >
                                                                    {option.isSettled ? "Settled" : "Active"}
                                                                </Badge>
                                                            </TableCell>
                                                            {showActions && (
                                                                <TableCell>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => onSelectSeries?.(option)}
                                                                        disabled={option.isSettled}
                                                                    >
                                                                        Select
                                                                    </Button>
                                                                </TableCell>
                                                            )}
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Filtered Empty State */}
                    {!fetching &&
                        series.length > 0 &&
                        filteredAndSortedSeries.length === 0 && (
                            <div className="py-8 text-center">
                                <p className="text-muted-foreground">
                                    No options match the selected filters
                                </p>
                            </div>
                        )}
                </CardContent>
            </Card>
        </div>
    );
}
