"use client";

import * as React from "react";
import { useMutation } from "urql";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OPTIONS_MARKET_ADDRESS } from "@/contracts/constants";
import {
  OPTIONS_MARKET_SET_INSURANCE_FEE_MUTATION,
  OPTIONS_MARKET_SET_SETTLEMENT_SHARES_MUTATION,
} from "../graphql/mutations";
import { useAdminMutation } from "../hooks/useAdminMutation";
import type { SettlementShares } from "../types";

type Props = {
  onFeedback: (message: string) => void;
};

export function OptionsMarketFees({ onFeedback }: Props) {
  const { executeAdminMutation } = useAdminMutation();

  const [insuranceFeeBps, setInsuranceFeeBps] = React.useState("0");
  const [settlementShares, setSettlementShares] =
    React.useState<SettlementShares>({
      vaultShareBps: "0",
      insuranceShareBps: "0",
    });

  const [, runSetInsuranceFeeMutation] = useMutation(
    OPTIONS_MARKET_SET_INSURANCE_FEE_MUTATION
  );
  const [, runSetSettlementSharesMutation] = useMutation(
    OPTIONS_MARKET_SET_SETTLEMENT_SHARES_MUTATION
  );

  const handleSetInsuranceFee = async () => {
    const result = await executeAdminMutation(
      runSetInsuranceFeeMutation,
      { feeBps: Number(insuranceFeeBps) },
      "optionsMarketSetInsuranceFeeBps",
      OPTIONS_MARKET_ADDRESS,
      "Insurance fee share updated.",
      "Failed to update insurance fee."
    );
    onFeedback(result.message);
  };

  const handleSetSettlementShares = async () => {
    const result = await executeAdminMutation(
      runSetSettlementSharesMutation,
      {
        input: {
          vaultShareBps: Number(settlementShares.vaultShareBps),
          insuranceShareBps: Number(settlementShares.insuranceShareBps),
        },
      },
      "optionsMarketSetSettlementShares",
      OPTIONS_MARKET_ADDRESS,
      "Settlement shares updated.",
      "Failed to update settlement shares."
    );
    onFeedback(result.message);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fee Parameters and Distribution</CardTitle>
        <CardDescription>
          Manage insurance deductions and settlement distribution.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="space-y-2">
            <Label>Insurance Fee (bps)</Label>
            <Input
              placeholder="e.g., 50"
              value={insuranceFeeBps}
              onChange={(e) => setInsuranceFeeBps(e.target.value)}
            />
          </div>
          <Button onClick={handleSetInsuranceFee} className="mt-8">
            Set Insurance Fee
          </Button>
        </div>

        <div className="space-y-3">
          <Label>Settlement Shares</Label>
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              placeholder="Vault share (bps)"
              value={settlementShares.vaultShareBps}
              onChange={(e) =>
                setSettlementShares((prev) => ({
                  ...prev,
                  vaultShareBps: e.target.value,
                }))
              }
            />
            <Input
              placeholder="Insurance share (bps)"
              value={settlementShares.insuranceShareBps}
              onChange={(e) =>
                setSettlementShares((prev) => ({
                  ...prev,
                  insuranceShareBps: e.target.value,
                }))
              }
            />
            <Button onClick={handleSetSettlementShares}>Set Shares</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
