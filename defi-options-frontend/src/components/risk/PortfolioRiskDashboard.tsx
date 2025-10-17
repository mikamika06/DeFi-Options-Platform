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
    return <div className="text-center text-muted-foreground">Підключіть гаманець, щоб переглянути ризикові метрики.</div>;
  }

  if (fetching) {
    return <div className="text-center">Оновлення ризикових даних...</div>;
  }

  if (error) {
    return <div className="text-red-500">Помилка запиту: {error.message}</div>;
  }

  if (!risk) {
    return <div className="text-center text-muted-foreground">Немає актуальних ризикових даних.</div>;
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
            <CardTitle>Вимога до маржі</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500">${risk.marginRequired.toFixed(2)}</div>
            <p className="text-sm text-muted-foreground mt-2">Мінімальний колатерал для поточних позицій.</p>
          </CardContent>
        </Card>

        <Card className="border-red-500">
          <CardHeader>
            <CardTitle>Ціна ліквідації</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{risk.liquidationPrice != null ? `$${risk.liquidationPrice.toFixed(2)}` : "N/A"}</div>
            <p className="text-sm text-muted-foreground mt-2">Ціна, при якій можливе примусове закриття позицій.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
