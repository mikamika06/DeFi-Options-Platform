
'use client';

import * as React from 'react';
import { useAccount } from 'wagmi';
import { PositionsTable } from '@/components/portfolio/PositionsTable';

export default function PositionsPage() {
  const { address, isConnected } = useAccount();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Ваш Портфель Опціонів</h1>
      
      {!isConnected ? (
        <p className="text-center text-lg">Будь ласка, підключіть гаманець, щоб переглянути ваші позиції.</p>
      ) : (
        <PositionsTable userAddress={address ?? ''} />
      )}
    </div>
  );
}
