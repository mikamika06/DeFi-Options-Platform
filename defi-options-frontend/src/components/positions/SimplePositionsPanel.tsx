"use client";

import React from "react";
import { useAccount } from "wagmi";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card";

export function SimplePositionsPanel() {
    const { address } = useAccount();

    // Use the actual series ID from deployed contracts
    const seriesId =
        "0x5db427ad8ca78ffaf392a13625833b77f98951e70c69181a12a0908fd2eb8aca";

    if (!address) {
        return (
            <Card className="w-full max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>My Positions</CardTitle>
                    <CardDescription>
                        Connect your wallet to view positions
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>My Positions</CardTitle>
                <CardDescription>Active positions and options balance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Position Information</h3>
                    <div className="space-y-2 text-sm">
                        <div>
                            <div className="text-muted-foreground">Active Series ID</div>
                            <div className="text-xs font-mono break-all">{seriesId}</div>
                        </div>
                        <div>
                            <div className="text-muted-foreground">Strike Price</div>
                            <div className="font-semibold">$3000</div>
                        </div>
                        <div>
                            <div className="text-muted-foreground">Option Type</div>
                            <div className="font-semibold">ETH Call Option</div>
                        </div>
                    </div>
                </div>

                <div className="text-center text-muted-foreground py-4">
                     Positions will be displayed after purchasing options
                </div>
            </CardContent>
        </Card>
    );
}
