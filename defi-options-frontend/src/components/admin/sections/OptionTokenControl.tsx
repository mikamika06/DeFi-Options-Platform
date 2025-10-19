"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OPTION_TOKEN_ADDRESS } from "@/contracts/constants";

interface OptionTokenControlProps {
  onFeedback: (msg: string) => void;
}

export function OptionTokenControl({ onFeedback }: OptionTokenControlProps) {
  const [baseURI, setBaseURI] = React.useState("");
  const [minterAddress, setMinterAddress] = React.useState("");
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleSetBaseURI = async () => {
    if (!baseURI) {
      onFeedback("Please enter a base URI");
      return;
    }
    try {
      setIsProcessing(true);
      // Placeholder - would need actual ABI and GraphQL mutation
      onFeedback("Base URI functionality will be implemented with contract ABI.");
    } catch (error) {
      console.error("Set base URI failed:", error);
      onFeedback("Failed to set base URI.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGrantMinter = async () => {
    if (!minterAddress || !minterAddress.startsWith("0x")) {
      onFeedback("Please enter a valid address");
      return;
    }
    try {
      setIsProcessing(true);
      // Placeholder - would need actual ABI
      onFeedback("Grant minter functionality will be implemented with contract ABI.");
    } catch (error) {
      console.error("Grant minter failed:", error);
      onFeedback("Failed to grant minter role.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevokeMinter = async () => {
    if (!minterAddress || !minterAddress.startsWith("0x")) {
      onFeedback("Please enter a valid address");
      return;
    }
    try {
      setIsProcessing(true);
      // Placeholder - would need actual ABI
      onFeedback("Revoke minter functionality will be implemented with contract ABI.");
    } catch (error) {
      console.error("Revoke minter failed:", error);
      onFeedback("Failed to revoke minter role.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>OptionToken Control</CardTitle>
        <CardDescription>
          Contract: {OPTION_TOKEN_ADDRESS}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Manage OptionToken metadata and minter roles. Contract ABI integration pending.
        </p>
        
        <div className="space-y-2">
          <Label htmlFor="baseURI">Base URI for Token Metadata</Label>
          <div className="flex gap-2">
            <Input
              id="baseURI"
              value={baseURI}
              onChange={(e) => setBaseURI(e.target.value)}
              placeholder="ipfs://..."
              disabled={isProcessing}
            />
            <Button 
              onClick={handleSetBaseURI}
              disabled={isProcessing || !baseURI}
            >
              {isProcessing ? "Processing..." : "Set URI"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="minterAddress">Minter Address</Label>
          <div className="flex gap-2">
            <Input
              id="minterAddress"
              value={minterAddress}
              onChange={(e) => setMinterAddress(e.target.value)}
              placeholder="0x..."
              disabled={isProcessing}
            />
            <Button 
              onClick={handleGrantMinter} 
              variant="default"
              disabled={isProcessing || !minterAddress}
            >
              {isProcessing ? "Processing..." : "Grant Minter"}
            </Button>
            <Button 
              onClick={handleRevokeMinter} 
              variant="destructive"
              disabled={isProcessing || !minterAddress}
            >
              {isProcessing ? "Processing..." : "Revoke Minter"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
