'use client';

import * as React from 'react';
import { StrategyLeg } from '@/types/strategy';
import { useOptionSeries } from '@/hooks/useOptionSeries';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PnLChart } from './PnLChart'; 

const MOCK_SPOT_PRICE = 3600; 

export function StrategyBuilder() {
    const [legs, setLegs] = React.useState<StrategyLeg[]>([]);
    const { series } = useOptionSeries('ETH'); 
    
    const addLeg = () => {
        if (series.length === 0) return;
        const defaultSeries = series[0];
        
        const newLeg: StrategyLeg = {
            id: Date.now().toString(),
            seriesId: defaultSeries.id,
            side: 'BUY',
            size: 1,
            strike: parseFloat(defaultSeries.strike),
            expiryDate: new Date(defaultSeries.expiry * 1000).toLocaleDateString(),
            premium: 100, // Temporary stub
        };
        setLegs([...legs, newLeg]);
    };
    
    const removeLeg = (id: string) => {
        setLegs(legs.filter(leg => leg.id !== id));
    };
    
    const executeStrategy = () => {
        console.log("Executing strategy:", legs);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-1 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Strategy Legs ({legs.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {legs.map(leg => (
                            <div key={leg.id} className="border p-3 rounded-md">
                                <div className="flex justify-between items-start">
                                    <p className="font-bold">{leg.side} {leg.size} x CALL @ {leg.strike}</p>
                                    <Button size="sm" variant="ghost" onClick={() => removeLeg(leg.id)}>×</Button>
                                </div>
                            </div>
                        ))}
                        <Button onClick={addLeg} variant="outline" className="w-full">
                            + Add Leg
                        </Button>
                        <Button onClick={executeStrategy} disabled={legs.length === 0} className="w-full mt-4">
                            Execute Strategy
                        </Button>
                    </CardContent>
                </Card>
            </div>
            
            <div className="lg:col-span-2">
                <PnLChart legs={legs} spotPrice={MOCK_SPOT_PRICE} />
            </div>
        </div>
    );
}

/*
export default function StrategiesPage() {
    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-6">Options Strategy Builder</h1>
            <StrategyBuilder />
        </div>
    );
}
*/