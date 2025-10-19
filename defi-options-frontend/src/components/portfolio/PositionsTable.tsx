"use client";

import * as React from "react";
import { useSendTransaction } from "wagmi";
import { useUserPositions } from "@/hooks/useUserPositions";
import type { UserPosition } from "@/hooks/useUserPositions";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useTradeExecution } from "@/hooks/useTradeExecution";
import { OPTIONS_MARKET_ADDRESS } from "@/contracts/constants";

interface PositionsTableProps {
    userAddress: string;
}

export function PositionsTable({ userAddress }: PositionsTableProps) {
    const { positions, fetching, error } = useUserPositions(userAddress);
    const { getExerciseCalldata, getCloseShortCalldata } = useTradeExecution();
    const { sendTransactionAsync } = useSendTransaction();
    const [processingId, setProcessingId] = React.useState<string | null>(null);

    const handleClosePosition = async (position: UserPosition) => {
        if (!position.sizeWad || position.sizeWad === "0") return;
        setProcessingId(position.id);
        try {
            if (position.positionType === "LONG") {
                const response = await getExerciseCalldata(position.seriesId, position.sizeWad, "0");
                if (response.error) throw response.error;
                const calldata = response.data?.exerciseCalldata;
                if (!calldata) throw new Error("Exercise calldata not found");
                await sendTransactionAsync({
                    to: OPTIONS_MARKET_ADDRESS as `0x${string}`,
                    data: calldata as `0x${string}`
                });
            } else {
                const response = await getCloseShortCalldata(position.seriesId, position.sizeWad);
                if (response.error) throw response.error;
                const calldata = response.data?.closeShortCalldata;
                if (!calldata) throw new Error("Close short calldata not found");
                await sendTransactionAsync({
                    to: OPTIONS_MARKET_ADDRESS as `0x${string}`,
                    data: calldata as `0x${string}`
                });
            }
        } catch (txError) {
            console.error("Failed to close position", txError);
        } finally {
            setProcessingId(null);
        }
    };

    if (fetching)
        return <div className="text-center">Loading your portfolio...</div>;
    if (error)
        return <div className="text-red-500">Error: {error.message}</div>;
    if (positions.length === 0)
        return (
            <div className="text-center text-lg">
                You have no open options positions.
            </div>
        );

    return (
        <Table>
            <TableCaption>Overview of your open options positions.</TableCaption>
            <TableHeader>
                <TableRow>
                    <TableHead>Option</TableHead>
                    <TableHead>Type / Strike</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                    <TableHead className="text-right">Avg. Premium</TableHead>
                    <TableHead className="text-right">Unrealized PnL</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {positions.map((pos) => {
                    const pnlColor = pos.pnlUnrealized >= 0 ? "text-green-500" : "text-red-500";
                    return (
                        <TableRow key={pos.id}>
                            <TableCell className="font-medium">{pos.underlyingSymbol}</TableCell>
                            <TableCell>
                                {pos.positionType} @ ${pos.strike.toFixed(2)}
                            </TableCell>
                            <TableCell>{new Date(pos.expiry * 1000).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">{pos.size.toFixed(4)}</TableCell>
                            <TableCell className="text-right">${pos.avgPrice.toFixed(4)}</TableCell>
                            <TableCell className={`text-right font-bold ${pnlColor}`}>
                                ${pos.pnlUnrealized.toFixed(4)}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={processingId === pos.id}
                                    onClick={() => handleClosePosition(pos)}
                                >
                                    {pos.positionType === "LONG" ? "Exercise" : "Close"}
                                </Button>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}
