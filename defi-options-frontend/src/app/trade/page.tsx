"use client";

import * as React from "react";
import { useAccount } from "wagmi";

import { QuickTopUpPanel } from "@/components/common/QuickTopUpPanel";
import { TradeAnalytics } from "@/components/trade/TradeAnalytics";
import { OptionForm } from "@/components/trade/OptionForm";
import { useOptionSeries } from "@/hooks/useOptionSeries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TradePage() {
    const { series, fetching, error } = useOptionSeries();
    const { isConnected } = useAccount();

    const hasSeries = series.length > 0;

    return (
        <div className="space-y-10">
            <section className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">
                    Options Trading
                </h1>
                <p className="text-muted-foreground">
                    Select series, form trades, and manage margin in one place.
                    Available only for connected wallets.
                </p>
            </section>

            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                <div className="space-y-6">
                    {!isConnected ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Connect Wallet</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground">
                                To start trading, click the Connect Wallet button in the top right corner.
                            </CardContent>
                        </Card>
                    ) : !hasSeries ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>No Available Series</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground">
                                {fetching
                                    ? "Loading available series..."
                                    : "Create a new series via the admin panel or smoke test to activate trading."}
                            </CardContent>
                        </Card>
                    ) : (
                        <OptionForm availableSeries={series} />
                    )}

                    <TradeAnalytics />

                    {error && (
                        <Card>
                            <CardHeader>
                                <CardTitle>GraphQL Error</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-red-600">
                                {error.message}
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="space-y-6">
                    <QuickTopUpPanel />
                </div>
            </div>
        </div>
    );
}
