"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LIQUIDITY_VAULT_ADDRESS } from "@/contracts/constants";

interface LiquidityVaultControlProps {
  onFeedback: (msg: string) => void;
}

export function LiquidityVaultControl({
  onFeedback,
}: LiquidityVaultControlProps) {
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handlePause = async () => {
    try {
      setIsProcessing(true);
      // Placeholder - would need actual ABI
      onFeedback("Pause functionality will be implemented with contract ABI.");
    } catch (error) {
      console.error("Pause failed:", error);
      onFeedback("Failed to pause vault.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnpause = async () => {
    try {
      setIsProcessing(true);
      // Placeholder - would need actual ABI
      onFeedback("Unpause functionality will be implemented with contract ABI.");
    } catch (error) {
      console.error("Unpause failed:", error);
      onFeedback("Failed to unpause vault.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Liquidity Vault Control</CardTitle>
        <CardDescription>
          Contract: {LIQUIDITY_VAULT_ADDRESS}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Manage LiquidityVault state and operations. Contract ABI integration pending.
        </p>
        <div className="flex gap-4">
          <Button 
            onClick={handlePause} 
            variant="destructive"
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : "Pause Vault"}
          </Button>
          <Button 
            onClick={handleUnpause} 
            variant="default"
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : "Unpause Vault"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
