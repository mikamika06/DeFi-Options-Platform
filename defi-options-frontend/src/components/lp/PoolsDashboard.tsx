import * as React from "react";
import { useLiquidityPools } from "@/hooks/useLiquidityPools";
import { useUserLPShares } from "@/hooks/useUserLPShares";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { LiquidityPool } from "@/hooks/useLiquidityPools";
import type { UserLpShare } from "@/hooks/useUserLPShares";
import { LpTransactionModal } from "./LpTransactionModal";

interface PoolsDashboardProps {
    userAddress: `0x${string}` | undefined;
}

export function PoolsDashboard({ userAddress }: PoolsDashboardProps) {
    const { pools, fetching: poolsFetching } = useLiquidityPools();
    const { lpShares, fetching: sharesFetching } = useUserLPShares(userAddress);
    const [modalState, setModalState] = React.useState<{
        mode: "deposit" | "withdraw";
        pool: LiquidityPool | null;
    }>({ mode: "deposit", pool: null });

    const totalUserValue = lpShares.reduce((sum, share) => sum + share.entryTvl, 0);

    if (poolsFetching)
        return <div className="text-center">Loading pool data...</div>;

    return (
        <div className="space-y-8">
            <Card className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-xl">
                <CardHeader>
                    <CardTitle>Your Liquidity</CardTitle>
                    <CardDescription className="text-gray-300">
                        Total value of your shares in all pools.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-extrabold mb-2">
                        {sharesFetching ? "Loading..." : `$${totalUserValue.toFixed(2)}`}
                    </div>
                    {!userAddress && (
                        <p className="text-yellow-400 mt-4">
                            Connect a wallet to view your shares.
                        </p>
                    )}
                </CardContent>
            </Card>

            <h2 className="text-2xl font-semibold mt-10">Available Liquidity Pools</h2>
            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pools.map((pool: LiquidityPool) => {
                    const userShare = lpShares.find((s: UserLpShare) => s.poolId === pool.id);

                    const utilization = pool.utilization != null ? `${(pool.utilization * 100).toFixed(2)}%` : "—";
                    const apy = pool.apy != null ? `${pool.apy.toFixed(2)}%` : "—";

                    return (
                        <Card key={pool.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <CardTitle>{pool.assetSymbol} Pool</CardTitle>
                                <CardDescription>ID: {pool.id.slice(0, 8)}...</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between"><span className="text-muted-foreground">TVL:</span><span>${pool.tvl.toFixed(2)}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Utilization:</span><span>{utilization}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">APY:</span><span className="text-green-500">{apy}</span></div>

                                <Separator />

                                {userShare && (
                                    <div className="p-3 bg-blue-50 dark:bg-gray-800 rounded-md text-sm space-y-1">
                                        <div className="flex justify-between">
                                            <span>Your LP Shares</span>
                                            <span className="font-medium">{userShare.shares.toFixed(4)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Entry Value</span>
                                            <span className="font-medium">${userShare.entryTvl.toFixed(2)}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-between pt-2">
                                    <Button
                                        variant="default"
                                        className="w-[48%]"
                                        disabled={!userAddress}
                                        onClick={() => setModalState({ mode: "deposit", pool })}
                                    >
                                        Deposit
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-[48%]"
                                        disabled={!userShare || !userAddress}
                                        onClick={() => setModalState({ mode: "withdraw", pool })}
                                    >
                                        Withdraw
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
            <LpTransactionModal
                open={Boolean(modalState.pool)}
                onOpenChange={(open) => {
                    if (!open) {
                        setModalState((state) => ({ ...state, pool: null }));
                    }
                }}
                mode={modalState.mode}
                pool={modalState.pool}
                userAddress={userAddress}
            />
        </div>
    );
}
