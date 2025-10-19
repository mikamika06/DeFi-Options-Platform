"use client";

import * as React from "react";
import { useQuery } from "urql";
import { AccessGuard } from "./AccessGuard";
import {
  OPTIONS_MARKET_ADDRESS,
  COLLATERAL_MANAGER_ADDRESS,
  ORACLE_ROUTER_ADDRESS,
  LIQUIDITY_VAULT_ADDRESS,
  INSURANCE_FUND_ADDRESS,
  OPTION_TOKEN_ADDRESS,
  DEFAULT_ADMIN_ROLE,
} from "@/contracts/constants";
import { ASSETS_QUERY } from "./graphql/queries";

// OptionsMarket sections
import { OptionsMarketControl } from "./sections/OptionsMarketControl";
import { OptionsMarketAddresses } from "./sections/OptionsMarketAddresses";
import { OptionsMarketFees } from "./sections/OptionsMarketFees";
import { OptionsMarketIVUpdater } from "./sections/OptionsMarketIVUpdater";

// CollateralManager sections
import { CollateralManagerAssets } from "./sections/CollateralManagerAssets";

// Oracle sections
import { OracleControl } from "./sections/OracleControl";

// LiquidityVault sections
import { LiquidityVaultControl } from "./sections/LiquidityVaultControl";

// InsuranceFund sections
import { InsuranceFundControl } from "./sections/InsuranceFundControl";

// OptionToken sections
import { OptionTokenControl } from "./sections/OptionTokenControl";

export function AdminDashboard() {
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [{ data: assetsData }] = useQuery({ query: ASSETS_QUERY });
  const assets = assetsData?.assets ?? [];

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="rounded-md border border-muted-foreground/20 bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
          {feedback}
        </div>
      )}

      {/* OptionsMarket Admin Controls */}
      <AccessGuard
        requiredRole={DEFAULT_ADMIN_ROLE}
        contractAddress={OPTIONS_MARKET_ADDRESS as `0x${string}`}
      >
        <OptionsMarketControl assets={assets} onFeedback={setFeedback} />
        <OptionsMarketAddresses onFeedback={setFeedback} />
        <OptionsMarketFees onFeedback={setFeedback} />
        <OptionsMarketIVUpdater onFeedback={setFeedback} />
      </AccessGuard>

      {/* CollateralManager Admin Controls */}
      <AccessGuard
        requiredRole={DEFAULT_ADMIN_ROLE}
        contractAddress={COLLATERAL_MANAGER_ADDRESS as `0x${string}`}
      >
        <CollateralManagerAssets assets={assets} onFeedback={setFeedback} />
      </AccessGuard>

      {/* Oracle Admin Controls */}
      <AccessGuard
        requiredRole={DEFAULT_ADMIN_ROLE}
        contractAddress={ORACLE_ROUTER_ADDRESS as `0x${string}`}
      >
        <OracleControl assets={assets} onFeedback={setFeedback} />
      </AccessGuard>

      {/* LiquidityVault Admin Controls */}
      <AccessGuard
        requiredRole={DEFAULT_ADMIN_ROLE}
        contractAddress={LIQUIDITY_VAULT_ADDRESS as `0x${string}`}
      >
        <LiquidityVaultControl onFeedback={setFeedback} />
      </AccessGuard>

      {/* InsuranceFund Admin Controls */}
      <AccessGuard
        requiredRole={DEFAULT_ADMIN_ROLE}
        contractAddress={INSURANCE_FUND_ADDRESS as `0x${string}`}
      >
        <InsuranceFundControl onFeedback={setFeedback} />
      </AccessGuard>

      {/* OptionToken Admin Controls */}
      <AccessGuard
        requiredRole={DEFAULT_ADMIN_ROLE}
        contractAddress={OPTION_TOKEN_ADDRESS as `0x${string}`}
      >
        <OptionTokenControl onFeedback={setFeedback} />
      </AccessGuard>
    </div>
  );
}
