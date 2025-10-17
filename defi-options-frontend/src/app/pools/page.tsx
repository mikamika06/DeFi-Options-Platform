'use client';

import * as React from 'react';
import { useAccount } from 'wagmi'; 
import { PoolsDashboard } from '@/components/lp/PoolsDashboard';

export default function PoolsPage() {
  const { address } = useAccount(); 

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Дашборд Ліквідності</h1>
      <p className="text-muted-foreground mb-8">Забезпечте ліквідність для отримання премії, що сплачується опціонними трейдерами.</p>
      
      <PoolsDashboard userAddress={address} />
    </div>
  );
}