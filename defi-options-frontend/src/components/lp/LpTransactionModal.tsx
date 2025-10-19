"use client";

import * as React from "react";
import { parseUnits } from "viem";
import { useSendTransaction } from "wagmi";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { LiquidityPool } from "@/hooks/useLiquidityPools";
import { useLiquidityActions } from "@/hooks/useLiquidityActions";
import { LIQUIDITY_VAULT_ADDRESS } from "@/contracts/constants";

interface LpTransactionModalProps {
    mode: "deposit" | "withdraw";
    pool: LiquidityPool | null;
    userAddress: `0x${string}` | undefined;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function LpTransactionModal({ mode, pool, userAddress, open, onOpenChange }: LpTransactionModalProps) {
    const [amount, setAmount] = React.useState<string>("");
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
    const { sendTransactionAsync, isPending } = useSendTransaction();
    const { getDepositCalldata, getWithdrawCalldata, depositResult, withdrawResult } = useLiquidityActions();

    React.useEffect(() => {
        if (!open) {
            setAmount("");
            setErrorMessage(null);
        }
    }, [open]);

    const isMutating =
        depositResult.fetching || withdrawResult.fetching || isPending;

    const handleSubmit = async () => {
        if (!pool) return;
        if (!userAddress) {
            setErrorMessage("Connect your wallet to perform the transaction.");
            return;
        }
        if (!amount || Number(amount) <= 0) {
            setErrorMessage("Enter a positive amount.");
            return;
        }

        try {
            setErrorMessage(null);
            const assets = parseUnits(amount, pool.assetDecimals).toString();

            if (mode === "deposit") {
                const response = await getDepositCalldata(assets, userAddress);
                if (response.error) {
                    throw response.error;
                }
                const calldata = response.data?.lpDepositCalldata;
                if (!calldata) {
                    throw new Error("Failed to get deposit calldata.");
                }
                await sendTransactionAsync({
                    to: LIQUIDITY_VAULT_ADDRESS as `0x${string}`,
                    data: calldata as `0x${string}`
                });
            } else {
                const response = await getWithdrawCalldata(assets, userAddress, userAddress);
                if (response.error) {
                    throw response.error;
                }
                const calldata = response.data?.lpWithdrawCalldata;
                if (!calldata) {
                    throw new Error("Failed to get withdrawal calldata.");
                }
                await sendTransactionAsync({
                    to: LIQUIDITY_VAULT_ADDRESS as `0x${string}`,
                    data: calldata as `0x${string}`
                });
            }

            onOpenChange(false);
        } catch (error) {
            console.error("LP transaction failed", error);
            setErrorMessage(error instanceof Error ? error.message : "Transaction failed.");
        }
    };

    const title = mode === "deposit" ? "Deposit to Pool" : "Withdraw from Pool";
    const description = pool
        ? `${mode === "deposit" ? "Deposit" : "Withdraw"} ${pool.assetSymbol} asset in pool ${pool.id.slice(0, 6)}…`
        : "";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <label htmlFor="lp-amount" className="text-sm font-medium">
                            Amount ({pool?.assetSymbol ?? ""})
                        </label>
                        <Input
                            id="lp-amount"
                            type="number"
                            min="0"
                            step="0.0001"
                            value={amount}
                            onChange={(event) => setAmount(event.target.value)}
                        />
                    </div>
                    {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
                </div>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isMutating}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isMutating}>
                        {mode === "deposit" ? "Confirm Deposit" : "Confirm Withdrawal"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
