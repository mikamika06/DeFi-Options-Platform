"use client";

import * as React from "react";
import { useWriteContract } from "wagmi";
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
import { OptionsMarket_ABI } from "@/contracts/abis";
import { OPTIONS_MARKET_ADDRESS } from "@/contracts/constants";
import {
  CREATE_SERIES_CALLDATA_MUTATION,
  SETTLE_SERIES_CALLDATA_MUTATION,
} from "../graphql/mutations";
import { useAdminMutation } from "../hooks/useAdminMutation";
import type { CreateSeriesFormState, Asset } from "../types";

type Props = {
  assets: Asset[];
  onFeedback: (message: string) => void;
};

export function OptionsMarketControl({ assets, onFeedback }: Props) {
  const { writeContractAsync } = useWriteContract();
  const { executeAdminMutation } = useAdminMutation();

  const [createSeriesForm, setCreateSeriesForm] =
    React.useState<CreateSeriesFormState>({
      underlying: "",
      quote: "",
      strike: "",
      expiry: "",
      baseFeeBps: "100",
      optionSide: "CALL",
    });
  const [seriesIdToSettle, setSeriesIdToSettle] = React.useState("");
  const [settleResidualRecipient, setSettleResidualRecipient] =
    React.useState("");

  const [{ fetching: createSeriesFetching }, runCreateSeriesMutation] =
    useMutation(CREATE_SERIES_CALLDATA_MUTATION);
  const [{ fetching: settleFetching }, runSettleMutation] = useMutation(
    SETTLE_SERIES_CALLDATA_MUTATION
  );

  const handleTogglePause = async (isPause: boolean) => {
    try {
      const fnName = isPause ? "pause" : "unpause";
      await writeContractAsync({
        address: OPTIONS_MARKET_ADDRESS as `0x${string}`,
        abi: OptionsMarket_ABI,
        functionName: fnName,
      });
      onFeedback(isPause ? "Market paused." : "Market unpaused.");
    } catch (error) {
      console.error("pause/unpause failed", error);
      onFeedback("Failed to change market state.");
    }
  };

  const handleCreateSeries = async () => {
    const { underlying, quote, strike, expiry, baseFeeBps, optionSide } =
      createSeriesForm;
    if (!underlying || !quote || !strike || !expiry || !baseFeeBps) {
      onFeedback("Fill all fields to create series.");
      return;
    }

    const result = await executeAdminMutation(
      runCreateSeriesMutation,
      {
        input: {
          underlying,
          quote,
          strikeWad: parseUnits(strike, 18).toString(),
          expiry,
          isCall: optionSide === "CALL",
          baseFeeBps: Number(baseFeeBps),
        },
      },
      "createSeriesCalldata",
      OPTIONS_MARKET_ADDRESS,
      "New series created successfully.",
      "Failed to create series."
    );

    onFeedback(result.message);
    if (result.success) {
      setCreateSeriesForm((prev) => ({ ...prev, strike: "", expiry: "" }));
    }
  };

  const handleSettleSeries = async () => {
    if (!seriesIdToSettle) {
      onFeedback("Specify series ID for settlement.");
      return;
    }

    const result = await executeAdminMutation(
      runSettleMutation,
      {
        input: {
          seriesId: seriesIdToSettle,
          residualRecipient: settleResidualRecipient || null,
        },
      },
      "settleSeriesCalldata",
      OPTIONS_MARKET_ADDRESS,
      "Series marked as settled.",
      "Failed to settle series."
    );

    onFeedback(result.message);
    if (result.success) {
      setSeriesIdToSettle("");
      setSettleResidualRecipient("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Protocol Control</CardTitle>
        <CardDescription>
          Manage OptionsMarket state (pause/unpause) and issue new series.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-wrap gap-4">
          <Button onClick={() => handleTogglePause(true)} variant="destructive">
            Pause Market
          </Button>
          <Button onClick={() => handleTogglePause(false)} variant="default">
            Unpause Market
          </Button>
        </div>

        <div className="rounded-md border p-4 space-y-3">
          <h3 className="font-semibold">Create New Series</h3>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Underlying Asset</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={createSeriesForm.underlying}
                onChange={(e) =>
                  setCreateSeriesForm((prev) => ({
                    ...prev,
                    underlying: e.target.value,
                  }))
                }
              >
                <option value="">Select underlying</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.symbol}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Quote Asset</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={createSeriesForm.quote}
                onChange={(e) =>
                  setCreateSeriesForm((prev) => ({
                    ...prev,
                    quote: e.target.value,
                  }))
                }
              >
                <option value="">Select quote</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Strike Price</Label>
              <Input
                placeholder="e.g. 2000"
                value={createSeriesForm.strike}
                onChange={(e) =>
                  setCreateSeriesForm((prev) => ({
                    ...prev,
                    strike: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Expiry (Unix timestamp)</Label>
              <Input
                placeholder="e.g. 1735689600"
                value={createSeriesForm.expiry}
                onChange={(e) =>
                  setCreateSeriesForm((prev) => ({
                    ...prev,
                    expiry: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Base Fee (bps)</Label>
              <Input
                placeholder="100"
                value={createSeriesForm.baseFeeBps}
                onChange={(e) =>
                  setCreateSeriesForm((prev) => ({
                    ...prev,
                    baseFeeBps: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Option Type</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={createSeriesForm.optionSide}
                onChange={(e) =>
                  setCreateSeriesForm((prev) => ({
                    ...prev,
                    optionSide: e.target.value as "CALL" | "PUT",
                  }))
                }
              >
                <option value="CALL">CALL</option>
                <option value="PUT">PUT</option>
              </select>
            </div>
          </div>

          <Button
            onClick={handleCreateSeries}
            disabled={createSeriesFetching}
            className="w-full"
          >
            {createSeriesFetching ? "Creating..." : "Create Series"}
          </Button>
        </div>

        <div className="rounded-md border p-4 space-y-3">
          <h3 className="font-semibold">Settle Series</h3>
          <Input
            placeholder="Series ID (bytes32)"
            value={seriesIdToSettle}
            onChange={(e) => setSeriesIdToSettle(e.target.value)}
          />
          <Input
            placeholder="Residual recipient (optional)"
            value={settleResidualRecipient}
            onChange={(e) => setSettleResidualRecipient(e.target.value)}
          />
          <Button
            onClick={handleSettleSeries}
            disabled={settleFetching}
            className="w-full"
          >
            {settleFetching ? "Settling..." : "Settle Series"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
