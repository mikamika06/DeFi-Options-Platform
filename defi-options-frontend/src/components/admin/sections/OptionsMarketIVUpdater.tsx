"use client";

import * as React from "react";
import { useMutation } from "urql";
import { parseUnits } from "viem";
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
import { IV_ORACLE_ADDRESS } from "@/contracts/constants";
import { IV_UPDATE_CALLDATA_MUTATION } from "../graphql/mutations";
import { useAdminMutation } from "../hooks/useAdminMutation";

type Props = {
  onFeedback: (message: string) => void;
};

export function OptionsMarketIVUpdater({ onFeedback }: Props) {
  const { executeAdminMutation } = useAdminMutation();
  const [seriesIdToUpdate, setSeriesIdToUpdate] = React.useState("");
  const [newIV, setNewIV] = React.useState("");

  const [{ fetching: ivUpdateFetching }, runIvUpdateMutation] = useMutation(
    IV_UPDATE_CALLDATA_MUTATION
  );

  const handleUpdateIV = async () => {
    if (!seriesIdToUpdate || !newIV) {
      onFeedback("Specify series and new IV value.");
      return;
    }

    const result = await executeAdminMutation(
      runIvUpdateMutation,
      {
        input: {
          seriesId: seriesIdToUpdate,
          ivWad: parseUnits(newIV, 18).toString(),
        },
      },
      "ivUpdateCalldata",
      IV_ORACLE_ADDRESS,
      "IV updated successfully.",
      "Failed to update IV."
    );

    onFeedback(result.message);
    if (result.success) {
      setNewIV("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update Implied Volatility</CardTitle>
        <CardDescription>
          Update IV for a specific option series.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Series ID (bytes32)</Label>
          <Input
            placeholder="0x..."
            value={seriesIdToUpdate}
            onChange={(e) => setSeriesIdToUpdate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>New IV (decimal, e.g., 0.5 for 50%)</Label>
          <Input
            placeholder="0.5"
            value={newIV}
            onChange={(e) => setNewIV(e.target.value)}
          />
        </div>

        <Button
          onClick={handleUpdateIV}
          disabled={ivUpdateFetching}
          className="w-full"
        >
          {ivUpdateFetching ? "Updating..." : "Update IV"}
        </Button>
      </CardContent>
    </Card>
  );
}
