"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useUserRisk } from "@/hooks/useUserRisk";

interface PortfolioRiskDashboardProps {
    userAddress: `0x${string}` | undefined;
}

export function PortfolioRiskDashboard({ userAddress }: PortfolioRiskDashboardProps) {
    const { risk, fetching, error } = useUserRisk(userAddress);

    if (!userAddress) {
        return <div className="text-center text-muted-foreground">Connect your wallet to view risk metrics.</div>;
    }

    if (fetching) {
        return <div className="text-center">Updating risk data...</div>;
    }

    if (error) {
        return <div className="text-red-500">Request error: {error.message}</div>;
    }

    if (!risk) {
        return <div className="text-center text-muted-foreground">No current risk data.</div>;
    }

    const metric = (value: number | null, suffix = "") =>
        value != null ? `${value.toFixed(4)}${suffix}` : "N/A";

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Net Delta (Δ)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metric(risk.netDelta)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Net Gamma (Γ)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metric(risk.netGamma)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Net Vega (ν)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metric(risk.netVega)}</div>
                    </CardContent>
                </Card>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-yellow-500">
                    <CardHeader>
                        <CardTitle>Margin Requirement</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-yellow-500">${risk.marginRequired.toFixed(2)}</div>
                        <p className="text-sm text-muted-foreground mt-2">Minimum collateral for current positions.</p>
                    </CardContent>
                </Card>

                <Card className="border-red-500">
                    <CardHeader>
                        <CardTitle>Liquidation Price</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-500">{risk.liquidationPrice != null ? `$${risk.liquidationPrice.toFixed(2)}` : "N/A"}</div>
                        <p className="text-sm text-muted-foreground mt-2">The price at which forced closure of positions is possible.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
