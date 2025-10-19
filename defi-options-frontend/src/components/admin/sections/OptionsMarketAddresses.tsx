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
import { OPTIONS_MARKET_ADDRESS } from "@/contracts/constants";
import {
  OPTIONS_MARKET_SET_FEE_RECIPIENT_MUTATION,
  OPTIONS_MARKET_SET_ORACLE_ROUTER_MUTATION,
  OPTIONS_MARKET_SET_IV_ORACLE_MUTATION,
  OPTIONS_MARKET_SET_COLLATERAL_MANAGER_MUTATION,
  OPTIONS_MARKET_SET_LIQUIDITY_VAULT_MUTATION,
  OPTIONS_MARKET_SET_INSURANCE_FUND_MUTATION,
} from "../graphql/mutations";
import { useAdminMutation } from "../hooks/useAdminMutation";
import type { OptionsAddresses } from "../types";

type Props = {
  onFeedback: (message: string) => void;
};

export function OptionsMarketAddresses({ onFeedback }: Props) {
  const { executeAdminMutation } = useAdminMutation();

  const [optionsAddresses, setOptionsAddresses] =
    React.useState<OptionsAddresses>({
      feeRecipient: "",
      oracleRouter: "",
      ivOracle: "",
      collateralManager: "",
      liquidityVault: "",
      insuranceFund: "",
    });

  const [, runSetFeeRecipientMutation] = useMutation(
    OPTIONS_MARKET_SET_FEE_RECIPIENT_MUTATION
  );
  const [, runSetOracleRouterMutation] = useMutation(
    OPTIONS_MARKET_SET_ORACLE_ROUTER_MUTATION
  );
  const [, runSetIvOracleMutation] = useMutation(
    OPTIONS_MARKET_SET_IV_ORACLE_MUTATION
  );
  const [, runSetCollateralManagerMutation] = useMutation(
    OPTIONS_MARKET_SET_COLLATERAL_MANAGER_MUTATION
  );
  const [, runSetLiquidityVaultMutation] = useMutation(
    OPTIONS_MARKET_SET_LIQUIDITY_VAULT_MUTATION
  );
  const [, runSetInsuranceFundMutation] = useMutation(
    OPTIONS_MARKET_SET_INSURANCE_FUND_MUTATION
  );

  const handleSetFeeRecipient = async () => {
    const result = await executeAdminMutation(
      runSetFeeRecipientMutation,
      { address: optionsAddresses.feeRecipient },
      "optionsMarketSetFeeRecipient",
      OPTIONS_MARKET_ADDRESS,
      "Fee recipient updated.",
      "Failed to update fee recipient."
    );
    onFeedback(result.message);
  };

  const handleSetOracleRouter = async () => {
    const result = await executeAdminMutation(
      runSetOracleRouterMutation,
      { address: optionsAddresses.oracleRouter },
      "optionsMarketSetOracleRouter",
      OPTIONS_MARKET_ADDRESS,
      "Oracle router address updated.",
      "Failed to update oracle router."
    );
    onFeedback(result.message);
  };

  const handleSetIvOracle = async () => {
    const result = await executeAdminMutation(
      runSetIvOracleMutation,
      { address: optionsAddresses.ivOracle },
      "optionsMarketSetIvOracle",
      OPTIONS_MARKET_ADDRESS,
      "IV oracle address updated.",
      "Failed to update IV oracle."
    );
    onFeedback(result.message);
  };

  const handleSetCollateralManager = async () => {
    const result = await executeAdminMutation(
      runSetCollateralManagerMutation,
      { address: optionsAddresses.collateralManager },
      "optionsMarketSetCollateralManager",
      OPTIONS_MARKET_ADDRESS,
      "CollateralManager address updated.",
      "Failed to update CollateralManager."
    );
    onFeedback(result.message);
  };

  const handleSetLiquidityVault = async () => {
    const result = await executeAdminMutation(
      runSetLiquidityVaultMutation,
      { address: optionsAddresses.liquidityVault },
      "optionsMarketSetLiquidityVault",
      OPTIONS_MARKET_ADDRESS,
      "LiquidityVault address updated.",
      "Failed to update LiquidityVault."
    );
    onFeedback(result.message);
  };

  const handleSetInsuranceFund = async () => {
    const result = await executeAdminMutation(
      runSetInsuranceFundMutation,
      { address: optionsAddresses.insuranceFund },
      "optionsMarketSetInsuranceFund",
      OPTIONS_MARKET_ADDRESS,
      "InsuranceFund address updated.",
      "Failed to update InsuranceFund."
    );
    onFeedback(result.message);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>OptionsMarket Key Addresses</CardTitle>
        <CardDescription>
          Update addresses of contracts interacting with OptionsMarket.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            placeholder="Fee recipient"
            value={optionsAddresses.feeRecipient}
            onChange={(e) =>
              setOptionsAddresses((prev) => ({
                ...prev,
                feeRecipient: e.target.value,
              }))
            }
          />
          <Button onClick={handleSetFeeRecipient}>Set Fee Recipient</Button>
        </div>

        <div className="grid items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            placeholder="Oracle router address"
            value={optionsAddresses.oracleRouter}
            onChange={(e) =>
              setOptionsAddresses((prev) => ({
                ...prev,
                oracleRouter: e.target.value,
              }))
            }
          />
          <Button onClick={handleSetOracleRouter}>Set Oracle Router</Button>
        </div>

        <div className="grid items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            placeholder="IV oracle address"
            value={optionsAddresses.ivOracle}
            onChange={(e) =>
              setOptionsAddresses((prev) => ({
                ...prev,
                ivOracle: e.target.value,
              }))
            }
          />
          <Button onClick={handleSetIvOracle}>Set IV Oracle</Button>
        </div>

        <div className="grid items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            placeholder="CollateralManager address"
            value={optionsAddresses.collateralManager}
            onChange={(e) =>
              setOptionsAddresses((prev) => ({
                ...prev,
                collateralManager: e.target.value,
              }))
            }
          />
          <Button onClick={handleSetCollateralManager}>
            Set CollateralManager
          </Button>
        </div>

        <div className="grid items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            placeholder="LiquidityVault address"
            value={optionsAddresses.liquidityVault}
            onChange={(e) =>
              setOptionsAddresses((prev) => ({
                ...prev,
                liquidityVault: e.target.value,
              }))
            }
          />
          <Button onClick={handleSetLiquidityVault}>Set LiquidityVault</Button>
        </div>

        <div className="grid items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            placeholder="InsuranceFund address"
            value={optionsAddresses.insuranceFund}
            onChange={(e) =>
              setOptionsAddresses((prev) => ({
                ...prev,
                insuranceFund: e.target.value,
              }))
            }
          />
          <Button onClick={handleSetInsuranceFund}>Set InsuranceFund</Button>
        </div>
      </CardContent>
    </Card>
  );
}
