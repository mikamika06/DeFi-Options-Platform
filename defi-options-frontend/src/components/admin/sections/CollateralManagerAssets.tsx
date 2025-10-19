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
import { COLLATERAL_MANAGER_ADDRESS } from "@/contracts/constants";
import { COLLATERAL_SET_CONFIG_MUTATION } from "../graphql/mutations";
import { useAdminMutation } from "../hooks/useAdminMutation";
import type { Asset } from "../types";

type Props = {
  assets: Asset[];
  onFeedback: (message: string) => void;
};

export function CollateralManagerAssets({ assets, onFeedback }: Props) {
  const { executeAdminMutation } = useAdminMutation();

  const [configAssetId, setConfigAssetId] = React.useState("");
  const [configEnabled, setConfigEnabled] = React.useState(true);
  const [configCollateralFactor, setConfigCollateralFactor] =
    React.useState("8500");
  const [configLiquidationThreshold, setConfigLiquidationThreshold] =
    React.useState("9000");
  const [configDecimals, setConfigDecimals] = React.useState("6");

  const [, runSetConfigMutation] = useMutation(COLLATERAL_SET_CONFIG_MUTATION);

  React.useEffect(() => {
    if (!configAssetId && assets.length > 0) {
      setConfigAssetId(assets[0].id);
      if (assets[0]?.decimals !== undefined && assets[0]?.decimals !== null) {
        setConfigDecimals(String(assets[0].decimals));
      }
    }
  }, [assets, configAssetId]);

  React.useEffect(() => {
    const asset = assets.find((item) => item.id === configAssetId);
    if (asset?.decimals !== undefined && asset?.decimals !== null) {
      setConfigDecimals(String(asset.decimals));
    }
  }, [assets, configAssetId]);

  const handleUpdateAssetConfig = async () => {
    if (!configAssetId) {
      onFeedback("Select asset for configuration.");
      return;
    }

    const result = await executeAdminMutation(
      runSetConfigMutation,
      {
        input: {
          asset: configAssetId,
          isEnabled: configEnabled,
          collateralFactorBps: Number(configCollateralFactor),
          liquidationThresholdBps: Number(configLiquidationThreshold),
          decimals: Number(configDecimals),
        },
      },
      "collateralSetConfigCalldata",
      COLLATERAL_MANAGER_ADDRESS,
      "Asset configuration updated.",
      "Failed to update asset configuration."
    );

    onFeedback(result.message);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Configuration</CardTitle>
        <CardDescription>
          Configure collateral assets and their parameters.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Asset</Label>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={configAssetId}
            onChange={(e) => setConfigAssetId(e.target.value)}
          >
            <option value="">Select asset</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.symbol}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="enabled-switch">Asset Enabled</Label>
          <input
            type="checkbox"
            id="enabled-switch"
            className="h-4 w-4"
            checked={configEnabled}
            onChange={(e) => setConfigEnabled(e.target.checked)}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Collateral Factor (bps)</Label>
            <Input
              placeholder="8500"
              value={configCollateralFactor}
              onChange={(e) => setConfigCollateralFactor(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Liquidation Threshold (bps)</Label>
            <Input
              placeholder="9000"
              value={configLiquidationThreshold}
              onChange={(e) => setConfigLiquidationThreshold(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Decimals</Label>
          <Input
            placeholder="6"
            value={configDecimals}
            onChange={(e) => setConfigDecimals(e.target.value)}
          />
        </div>

        <Button onClick={handleUpdateAssetConfig} className="w-full">
          Update Asset Configuration
        </Button>
      </CardContent>
    </Card>
  );
}
