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
import {
  COLLATERAL_MANAGER_ADDRESS,
  ORACLE_ROUTER_ADDRESS,
} from "@/contracts/constants";
import {
  COLLATERAL_SET_PRICE_MUTATION,
  ORACLE_SET_PRICE_MUTATION,
} from "../graphql/mutations";
import { useAdminMutation } from "../hooks/useAdminMutation";
import type { Asset } from "../types";

type Props = {
  assets: Asset[];
  onFeedback: (message: string) => void;
};

export function OracleControl({ assets, onFeedback }: Props) {
  const { executeAdminMutation } = useAdminMutation();

  const [selectedAssetId, setSelectedAssetId] = React.useState("");
  const [newAssetPrice, setNewAssetPrice] = React.useState("");
  const [oracleAsset, setOracleAsset] = React.useState("");
  const [oraclePrice, setOraclePrice] = React.useState("2000");
  const [oracleDecimals, setOracleDecimals] = React.useState("18");

  const [, runSetPriceMutation] = useMutation(COLLATERAL_SET_PRICE_MUTATION);
  const [, runOracleSetPriceMutation] = useMutation(ORACLE_SET_PRICE_MUTATION);

  React.useEffect(() => {
    if (!selectedAssetId && assets.length > 0) {
      setSelectedAssetId(assets[0].id);
    }
    if (!oracleAsset && assets.length > 0) {
      setOracleAsset(assets[0].id);
    }
  }, [assets, selectedAssetId, oracleAsset]);

  React.useEffect(() => {
    const asset = assets.find((item) => item.id === oracleAsset);
    if (asset?.decimals !== undefined && asset?.decimals !== null) {
      setOracleDecimals(String(asset.decimals));
    }
  }, [assets, oracleAsset]);

  const handleUpdateAssetPrice = async () => {
    if (!selectedAssetId || !newAssetPrice) {
      onFeedback("Select asset and specify new price.");
      return;
    }

    const result = await executeAdminMutation(
      runSetPriceMutation,
      {
        input: {
          asset: selectedAssetId,
          priceWad: parseUnits(newAssetPrice, 18).toString(),
        },
      },
      "collateralSetPriceCalldata",
      COLLATERAL_MANAGER_ADDRESS,
      "Asset price updated.",
      "Failed to update asset price."
    );

    onFeedback(result.message);
    if (result.success) {
      setNewAssetPrice("");
    }
  };

  const handleOracleSetPrice = async () => {
    if (!oracleAsset || !oraclePrice) {
      onFeedback("Select asset and specify price value.");
      return;
    }

    const result = await executeAdminMutation(
      runOracleSetPriceMutation,
      {
        input: {
          asset: oracleAsset,
          price: parseUnits(oraclePrice, Number(oracleDecimals)).toString(),
          decimals: Number(oracleDecimals),
        },
      },
      "oracleSetPriceCalldata",
      ORACLE_ROUTER_ADDRESS,
      "Spot price updated.",
      "Failed to update oracle price."
    );

    onFeedback(result.message);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>CollateralManager Asset Price</CardTitle>
          <CardDescription>
            Update asset price in CollateralManager.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Asset</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
            >
              <option value="">Select asset</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.symbol}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>New Price (WAD format)</Label>
            <Input
              placeholder="e.g., 2000"
              value={newAssetPrice}
              onChange={(e) => setNewAssetPrice(e.target.value)}
            />
          </div>

          <Button onClick={handleUpdateAssetPrice} className="w-full">
            Update Asset Price
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Oracle Spot Price</CardTitle>
          <CardDescription>Set spot price in oracle router.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Asset</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={oracleAsset}
              onChange={(e) => setOracleAsset(e.target.value)}
            >
              <option value="">Select asset</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.symbol}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Price</Label>
              <Input
                placeholder="2000"
                value={oraclePrice}
                onChange={(e) => setOraclePrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Decimals</Label>
              <Input
                placeholder="18"
                value={oracleDecimals}
                onChange={(e) => setOracleDecimals(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleOracleSetPrice} className="w-full">
            Set Oracle Price
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
