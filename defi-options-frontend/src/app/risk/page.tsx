// Файл: src/app/risk/page.tsx (Новий)
'use client';

import * as React from 'react';
import { useAccount } from 'wagmi'; 
import { PortfolioRiskDashboard } from '@/components/risk/PortfolioRiskDashboard';

export default function RiskPage() {
  const { address, isConnected } = useAccount();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Панель Управління Ризиками</h1>
      <p className="text-muted-foreground mb-8">
        Відстежуйте свої сукупні греки та вимоги до маржі в реальному часі.
      </p>
      
      {!isConnected ? (
        <div className="text-center text-lg py-12">Підключіть гаманець для перегляду ризиків портфеля.</div>
      ) : (
        <PortfolioRiskDashboard userAddress={address} />
      )}
    </div>
  );
}