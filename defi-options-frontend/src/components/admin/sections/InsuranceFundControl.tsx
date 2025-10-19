"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { INSURANCE_FUND_ADDRESS } from "@/contracts/constants";

interface InsuranceFundControlProps {
  onFeedback: (msg: string) => void;
}

export function InsuranceFundControl({
  onFeedback,
}: InsuranceFundControlProps) {
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handlePause = async () => {
    try {
      setIsProcessing(true);
      // Placeholder - would need actual ABI
      onFeedback("Pause functionality will be implemented with contract ABI.");
    } catch (error) {
      console.error("Pause failed:", error);
      onFeedback("Failed to pause insurance fund.");
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
      onFeedback("Failed to unpause insurance fund.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Insurance Fund Control</CardTitle>
        <CardDescription>
          Contract: {INSURANCE_FUND_ADDRESS}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Manage InsuranceFund state and operations. Contract ABI integration pending.
        </p>
        <div className="flex gap-4">
          <Button 
            onClick={handlePause} 
            variant="destructive"
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : "Pause Fund"}
          </Button>
          <Button 
            onClick={handleUnpause} 
            variant="default"
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : "Unpause Fund"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
