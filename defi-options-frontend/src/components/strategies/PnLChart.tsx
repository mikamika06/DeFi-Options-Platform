import * as React from 'react';
import { StrategyLeg } from '@/types/strategy';
import { Card, CardContent } from '@/components/ui/card';

interface PnLChartProps {
    legs: StrategyLeg[];
    spotPrice: number;
}

const calculateLegPnL = (leg: StrategyLeg, finalSpot: number): number => {
    const isCall = leg.seriesId.includes('CALL'); 
    const multiplier = leg.side === 'BUY' ? 1 : -1;
    let intrinsicValue = 0;

    if (isCall) {
        intrinsicValue = Math.max(0, finalSpot - leg.strike);
    } else { 
        intrinsicValue = Math.max(0, leg.strike - finalSpot);
    }
    
    return (intrinsicValue - leg.premium) * leg.size * multiplier;
};

export function PnLChart({ legs, spotPrice }: PnLChartProps) {
    const priceRange = Array.from({ length: 51 }, (_, i) => spotPrice * 0.8 + i * (spotPrice * 0.4 / 50));

    const pnlData = priceRange.map(price => {
        const totalPnL = legs.reduce((sum, leg) => sum + calculateLegPnL(leg, price), 0);
        return { price, pnl: totalPnL };
    });
    
    
    const maxPnL = Math.max(...pnlData.map(d => d.pnl));
    const minPnL = Math.min(...pnlData.map(d => d.pnl));

    return (
        <Card>
            <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">Profit/Loss Profile</h3>
                <div className="w-full h-64 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center border border-dashed">
                    <p className="text-muted-foreground">P&L Chart (Viz. Placeholder)</p>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center mt-4 text-sm">
                    <div>
                        <p className="text-muted-foreground">Max. Profit</p>
                        <p className="font-bold text-green-500">{maxPnL.toFixed(2)} USD</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Current Price</p>
                        <p className="font-bold">{spotPrice.toFixed(2)} USD</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Max. Loss</p>
                        <p className="font-bold text-red-500">{minPnL.toFixed(2)} USD</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}