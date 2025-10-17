"use client";

import * as React from "react";
import { parseUnits } from "viem";
import { useWriteContract, useSendTransaction } from "wagmi";
import { useMutation, useQuery, gql } from "urql";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OptionsMarket_ABI } from "@/contracts/abis";
import { AccessGuard } from "./AccessGuard";
import {
  DEFAULT_ADMIN_ROLE,
  IV_UPDATER_ROLE,
  OPTIONS_MARKET_ADDRESS as MARKET_ADDRESS,
  IV_ORACLE_ADDRESS,
  ORACLE_ROUTER_ADDRESS,
  COLLATERAL_MANAGER_ADDRESS,
  LIQUIDITY_VAULT_ADDRESS,
  INSURANCE_FUND_ADDRESS,
  KEEPER_ROLE,
  RISK_MANAGER_ROLE,
  LIQUIDATOR_ROLE,
  COLLATERAL_MARGIN_ADMIN_ROLE,
  COLLATERAL_LIQUIDATOR_ROLE,
  COLLATERAL_MARGIN_ENGINE_ROLE,
  VAULT_MANAGER_ROLE,
  VAULT_FEE_COLLECTOR_ROLE,
  VAULT_PREMIUM_HANDLER_ROLE,
  INSURANCE_TREASURER_ROLE,
  INSURANCE_STRATEGIST_ROLE,
  INSURANCE_MARKET_ROLE
} from "@/contracts/constants";

const CREATE_SERIES_CALldata_MUTATION = gql`
  mutation CreateSeriesCalldata($input: CreateSeriesInput!) {
    createSeriesCalldata(input: $input)
  }
`;

const IV_UPDATE_CALldata_MUTATION = gql`
  mutation IvUpdateCalldata($input: IvUpdateInput!) {
    ivUpdateCalldata(input: $input)
  }
`;

const SETTLE_SERIES_CALldata_MUTATION = gql`
  mutation SettleSeriesCalldata($input: SettleSeriesInput!) {
    settleSeriesCalldata(input: $input)
  }
`;

const COLLATERAL_SET_PRICE_MUTATION = gql`
  mutation CollateralSetPriceCalldata($input: CollateralPriceInput!) {
    collateralSetPriceCalldata(input: $input)
  }
`;

const COLLATERAL_SET_CONFIG_MUTATION = gql`
  mutation CollateralSetConfigCalldata($input: CollateralAssetConfigInput!) {
    collateralSetConfigCalldata(input: $input)
  }
`;

const GRANT_ROLE_MUTATION = gql`
  mutation GrantRoleCalldata($input: GrantRoleInput!) {
    grantRoleCalldata(input: $input)
  }
`;

const ORACLE_SET_PRICE_MUTATION = gql`
  mutation OracleSetPriceCalldata($input: OraclePriceInput!) {
    oracleSetPriceCalldata(input: $input)
  }
`;

const ASSETS_QUERY = gql`
  query Assets {
    assets {
      id
      symbol
      decimals
    }
  }
`;

type OptionSide = "CALL" | "PUT";

type CreateSeriesFormState = {
  underlying: string;
  quote: string;
  strike: string;
  expiry: string;
  baseFeeBps: string;
  optionSide: OptionSide;
};

export function AdminDashboard() {
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();

  const [createSeriesForm, setCreateSeriesForm] = React.useState<CreateSeriesFormState>({
    underlying: "",
    quote: "",
    strike: "",
    expiry: "",
    baseFeeBps: "100",
    optionSide: "CALL"
  });
  const [seriesIdToUpdate, setSeriesIdToUpdate] = React.useState("");
  const [newIV, setNewIV] = React.useState("");
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = React.useState("");
  const [newAssetPrice, setNewAssetPrice] = React.useState("");
  const [configAssetId, setConfigAssetId] = React.useState("");
  const [configEnabled, setConfigEnabled] = React.useState(true);
  const [configCollateralFactor, setConfigCollateralFactor] = React.useState("8500");
  const [configLiquidationThreshold, setConfigLiquidationThreshold] = React.useState("9000");
  const [configDecimals, setConfigDecimals] = React.useState("6");
  const [selectedContractForRole, setSelectedContractForRole] = React.useState(MARKET_ADDRESS);
  const [selectedRoleValue, setSelectedRoleValue] = React.useState(DEFAULT_ADMIN_ROLE);
  const [roleRecipient, setRoleRecipient] = React.useState("");
  const [oracleAsset, setOracleAsset] = React.useState("");
  const [oraclePrice, setOraclePrice] = React.useState("2000");
  const [oracleDecimals, setOracleDecimals] = React.useState("18");
  const [seriesIdToSettle, setSeriesIdToSettle] = React.useState("");
  const [settleResidualRecipient, setSettleResidualRecipient] = React.useState("");

  const [{ fetching: createSeriesFetching }, runCreateSeriesMutation] = useMutation(CREATE_SERIES_CALldata_MUTATION);
  const [{ fetching: ivUpdateFetching }, runIvUpdateMutation] = useMutation(IV_UPDATE_CALldata_MUTATION);
  const [{ fetching: setPriceFetching }, runSetPriceMutation] = useMutation(COLLATERAL_SET_PRICE_MUTATION);
  const [{ fetching: setConfigFetching }, runSetConfigMutation] = useMutation(COLLATERAL_SET_CONFIG_MUTATION);
  const [{ fetching: grantRoleFetching }, runGrantRoleMutation] = useMutation(GRANT_ROLE_MUTATION);
  const [{ fetching: oracleSetPriceFetching }, runOracleSetPriceMutation] = useMutation(ORACLE_SET_PRICE_MUTATION);
  const [{ fetching: settleFetching }, runSettleMutation] = useMutation(SETTLE_SERIES_CALldata_MUTATION);
  const [{ data: assetsData }] = useQuery({ query: ASSETS_QUERY });
  const assets = assetsData?.assets ?? [];

  React.useEffect(() => {
    if (!selectedAssetId && assets.length > 0) {
      setSelectedAssetId(assets[0].id);
    }
    if (!configAssetId && assets.length > 0) {
      setConfigAssetId(assets[0].id);
      if (assets[0]?.decimals !== undefined && assets[0]?.decimals !== null) {
        setConfigDecimals(String(assets[0].decimals));
      }
    }
    if (!oracleAsset && assets.length > 0) {
      setOracleAsset(assets[0].id);
    }
  }, [assets, selectedAssetId, configAssetId, oracleAsset]);

  React.useEffect(() => {
    const asset = assets.find((item: { id: string; decimals: number | null }) => item.id === configAssetId);
    if (asset?.decimals !== undefined && asset?.decimals !== null) {
      setConfigDecimals(String(asset.decimals));
    }
  }, [assets, configAssetId]);

  React.useEffect(() => {
    const asset = assets.find((item: { id: string; decimals: number | null }) => item.id === oracleAsset);
    if (asset?.decimals !== undefined && asset?.decimals !== null) {
      setOracleDecimals(String(asset.decimals));
    }
  }, [assets, oracleAsset]);

  const contractOptions = React.useMemo(
    () => [
      { label: "OptionsMarket", value: MARKET_ADDRESS },
      { label: "CollateralManager", value: COLLATERAL_MANAGER_ADDRESS },
      { label: "LiquidityVault", value: LIQUIDITY_VAULT_ADDRESS },
      { label: "InsuranceFund", value: INSURANCE_FUND_ADDRESS }
    ],
    []
  );

  const roleOptionsByContract = React.useMemo(
    () => ({
      [MARKET_ADDRESS.toLowerCase()]: [
        { label: "DEFAULT_ADMIN_ROLE", value: DEFAULT_ADMIN_ROLE },
        { label: "IV_UPDATER_ROLE", value: IV_UPDATER_ROLE },
        { label: "KEEPER_ROLE", value: KEEPER_ROLE },
        { label: "RISK_MANAGER_ROLE", value: RISK_MANAGER_ROLE },
        { label: "LIQUIDATOR_ROLE", value: LIQUIDATOR_ROLE }
      ],
      [COLLATERAL_MANAGER_ADDRESS.toLowerCase()]: [
        { label: "MARGIN_ADMIN_ROLE", value: COLLATERAL_MARGIN_ADMIN_ROLE },
        { label: "LIQUIDATOR_ROLE", value: COLLATERAL_LIQUIDATOR_ROLE },
        { label: "MARGIN_ENGINE_ROLE", value: COLLATERAL_MARGIN_ENGINE_ROLE }
      ],
      [LIQUIDITY_VAULT_ADDRESS.toLowerCase()]: [
        { label: "VAULT_MANAGER_ROLE", value: VAULT_MANAGER_ROLE },
        { label: "FEE_COLLECTOR_ROLE", value: VAULT_FEE_COLLECTOR_ROLE },
        { label: "PREMIUM_HANDLER_ROLE", value: VAULT_PREMIUM_HANDLER_ROLE }
      ],
      [INSURANCE_FUND_ADDRESS.toLowerCase()]: [
        { label: "TREASURER_ROLE", value: INSURANCE_TREASURER_ROLE },
        { label: "STRATEGIST_ROLE", value: INSURANCE_STRATEGIST_ROLE },
        { label: "MARKET_ROLE", value: INSURANCE_MARKET_ROLE }
      ]
    }),
    []
  );

  const availableRoleOptions = React.useMemo(
    () => roleOptionsByContract[selectedContractForRole.toLowerCase()] ?? [],
    [roleOptionsByContract, selectedContractForRole]
  );

  React.useEffect(() => {
    if (availableRoleOptions.length && !availableRoleOptions.some((option) => option.value === selectedRoleValue)) {
      setSelectedRoleValue(availableRoleOptions[0].value);
    }
  }, [availableRoleOptions, selectedRoleValue]);

  const handleTogglePause = async (isPause: boolean) => {
    try {
      const fnName = isPause ? "pause" : "unpause";
      await writeContractAsync({
        address: MARKET_ADDRESS as `0x${string}`,
        abi: OptionsMarket_ABI,
        functionName: fnName
      });
      setFeedback(isPause ? "Ринок призупинено." : "Ринок відновлено.");
    } catch (error) {
      console.error("pause/unpause failed", error);
      setFeedback("Не вдалося змінити стан ринку.");
    }
  };

  const handleSettleSeries = async () => {
    if (!seriesIdToSettle) {
      setFeedback("Вкажіть ідентифікатор серії для сеттлменту.");
      return;
    }

    try {
      const response = await runSettleMutation({
        input: {
          seriesId: seriesIdToSettle,
          residualRecipient: settleResidualRecipient || null
        }
      });
      const calldata = response.data?.settleSeriesCalldata;
      if (!calldata) {
        throw response.error ?? new Error("Не отримано calldata для settleSeries");
      }
      await sendTransactionAsync({
        to: MARKET_ADDRESS as `0x${string}`,
        data: calldata as `0x${string}`
      });
      setFeedback("Серію позначено як settled.");
      setSeriesIdToSettle("");
      setSettleResidualRecipient("");
    } catch (error) {
      console.error("settle series failed", error);
      setFeedback("Не вдалося виконати settle серії.");
    }
  };

  const handleUpdateAssetPrice = async () => {
    if (!selectedAssetId || !newAssetPrice) {
      setFeedback("Оберіть актив та вкажіть нову ціну.");
      return;
    }

    try {
      const priceWad = parseUnits(newAssetPrice, 18).toString();
      const response = await runSetPriceMutation({
        input: { asset: selectedAssetId, priceWad }
      });
      const calldata = response.data?.collateralSetPriceCalldata;
      if (!calldata) {
        throw response.error ?? new Error("Не отримано calldata для setAssetPrice");
      }
      await sendTransactionAsync({
        to: COLLATERAL_MANAGER_ADDRESS as `0x${string}`,
        data: calldata as `0x${string}`
      });
      setFeedback("Ціну активу оновлено.");
      setNewAssetPrice("");
    } catch (error) {
      console.error("set asset price failed", error);
      setFeedback("Не вдалося оновити ціну активу.");
    }
  };

  const handleUpdateAssetConfig = async () => {
    if (!configAssetId) {
      setFeedback("Оберіть актив для конфігурації.");
      return;
    }

    try {
      const payload = {
        asset: configAssetId,
        isEnabled: configEnabled,
        collateralFactorBps: Number(configCollateralFactor),
        liquidationThresholdBps: Number(configLiquidationThreshold),
        decimals: Number(configDecimals)
      };

      const response = await runSetConfigMutation({ input: payload });
      const calldata = response.data?.collateralSetConfigCalldata;
      if (!calldata) {
        throw response.error ?? new Error("Не отримано calldata для setAssetConfig");
      }
      await sendTransactionAsync({
        to: COLLATERAL_MANAGER_ADDRESS as `0x${string}`,
        data: calldata as `0x${string}`
      });
      setFeedback("Конфігурацію активу оновлено.");
    } catch (error) {
      console.error("set asset config failed", error);
      setFeedback("Не вдалося оновити конфігурацію активу.");
    }
  };

  const handleGrantRole = async () => {
    if (!selectedContractForRole || !selectedRoleValue || !roleRecipient) {
      setFeedback("Заповніть всі поля для видачі ролі.");
      return;
    }

    try {
      const response = await runGrantRoleMutation({
        input: {
          contract: selectedContractForRole,
          role: selectedRoleValue,
          account: roleRecipient
        }
      });
      const calldata = response.data?.grantRoleCalldata;
      if (!calldata) {
        throw response.error ?? new Error("Не отримано calldata для grantRole");
      }
      await sendTransactionAsync({
        to: selectedContractForRole as `0x${string}`,
        data: calldata as `0x${string}`
      });
      setFeedback("Роль успішно надано.");
      setRoleRecipient("");
    } catch (error) {
      console.error("grant role failed", error);
      setFeedback("Не вдалося надати роль.");
    }
  };

  const handleOracleSetPrice = async () => {
    if (!oracleAsset || !oraclePrice) {
      setFeedback("Оберіть актив та вкажіть значення ціни.");
      return;
    }

    try {
      const price = parseUnits(oraclePrice, Number(oracleDecimals)).toString();
      const response = await runOracleSetPriceMutation({
        input: {
          asset: oracleAsset,
          price,
          decimals: Number(oracleDecimals)
        }
      });
      const calldata = response.data?.oracleSetPriceCalldata;
      if (!calldata) {
        throw response.error ?? new Error("Не отримано calldata для oracle set price");
      }
      await sendTransactionAsync({
        to: ORACLE_ROUTER_ADDRESS as `0x${string}`,
        data: calldata as `0x${string}`
      });
      setFeedback("Спот-ціна оновлена.");
    } catch (error) {
      console.error("oracle set price failed", error);
      setFeedback("Не вдалося оновити ціну оракула.");
    }
  };

  const handleCreateSeries = async () => {
    const { underlying, quote, strike, expiry, baseFeeBps, optionSide } = createSeriesForm;
    if (!underlying || !quote || !strike || !expiry || !baseFeeBps) {
      setFeedback("Заповніть усі поля для створення серії.");
      return;
    }

    try {
      const strikeWad = parseUnits(strike, 18).toString();
      const payload = {
        underlying,
        quote,
        strikeWad,
        expiry,
        isCall: optionSide === "CALL",
        baseFeeBps: Number(baseFeeBps)
      };

      const response = await runCreateSeriesMutation({ input: payload });
      const calldata = response.data?.createSeriesCalldata;
      if (!calldata) {
        throw response.error ?? new Error("Не отримано calldata для createSeries");
      }

      await sendTransactionAsync({
        to: MARKET_ADDRESS as `0x${string}`,
        data: calldata as `0x${string}`
      });
      setFeedback("Нову серію створено.");
      setCreateSeriesForm((prev) => ({ ...prev, strike: "", expiry: "", baseFeeBps: prev.baseFeeBps }));
    } catch (error) {
      console.error("create series failed", error);
      setFeedback("Не вдалося створити серію.");
    }
  };

  const handleUpdateIV = async () => {
    if (!seriesIdToUpdate || !newIV) {
      setFeedback("Вкажіть серію та нове значення IV.");
      return;
    }

    try {
      const ivWad = parseUnits(newIV, 18).toString();
      const response = await runIvUpdateMutation({
        input: { seriesId: seriesIdToUpdate, ivWad }
      });
      const calldata = response.data?.ivUpdateCalldata;
      if (!calldata) {
        throw response.error ?? new Error("Не отримано calldata для ivUpdate");
      }

      await sendTransactionAsync({
        to: IV_ORACLE_ADDRESS as `0x${string}`,
        data: calldata as `0x${string}`
      });
      setFeedback("IV оновлено успішно.");
      setNewIV("");
    } catch (error) {
      console.error("iv update failed", error);
      setFeedback("Не вдалося оновити IV.");
    }
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="rounded-md border border-muted-foreground/20 bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
          {feedback}
        </div>
      )}

      <AccessGuard requiredRole={DEFAULT_ADMIN_ROLE} contractAddress={MARKET_ADDRESS as `0x${string}`}>
        <Card>
          <CardHeader>
            <CardTitle>Контроль протоколу</CardTitle>
            <CardDescription>Керування станом OptionsMarket (pause/unpause) та випуск нових серій.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-4">
              <Button variant="destructive" onClick={() => handleTogglePause(true)}>
                Пауза ринку
              </Button>
              <Button variant="secondary" onClick={() => handleTogglePause(false)}>
                Розпауза ринку
              </Button>
            </div>

            <div className="rounded-md border p-4 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide">Створити нову серію</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  placeholder="Адреса underlying"
                  value={createSeriesForm.underlying}
                  onChange={(event) =>
                    setCreateSeriesForm((prev) => ({ ...prev, underlying: event.target.value }))
                  }
                />
                <Input
                  placeholder="Адреса quote"
                  value={createSeriesForm.quote}
                  onChange={(event) => setCreateSeriesForm((prev) => ({ ...prev, quote: event.target.value }))}
                />
                <Input
                  placeholder="Strike (у базовому форматі, напр. 2000)"
                  value={createSeriesForm.strike}
                  onChange={(event) => setCreateSeriesForm((prev) => ({ ...prev, strike: event.target.value }))}
                />
                <Input
                  placeholder="Expiry (UNIX секунд)"
                  value={createSeriesForm.expiry}
                  onChange={(event) => setCreateSeriesForm((prev) => ({ ...prev, expiry: event.target.value }))}
                />
                <Input
                  placeholder="Base fee (bps)"
                  value={createSeriesForm.baseFeeBps}
                  onChange={(event) => setCreateSeriesForm((prev) => ({ ...prev, baseFeeBps: event.target.value }))}
                />
                <label className="sr-only" htmlFor="option-side">
                  Тип опціону
                </label>
                <select
                  id="option-side"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={createSeriesForm.optionSide}
                  onChange={(event) =>
                    setCreateSeriesForm((prev) => ({ ...prev, optionSide: event.target.value as OptionSide }))
                  }
                >
                  <option value="CALL">Call</option>
                  <option value="PUT">Put</option>
                </select>
              </div>
              <Button onClick={handleCreateSeries} disabled={createSeriesFetching}>
                {createSeriesFetching ? "Генерація calldata…" : "Створити серію"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </AccessGuard>

      <AccessGuard requiredRole={IV_UPDATER_ROLE} contractAddress={MARKET_ADDRESS as `0x${string}`}>
        <Card>
          <CardHeader>
            <CardTitle>Оновлення волатильності</CardTitle>
            <CardDescription>Встановлення mark IV для конкретної серії опціону.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Series ID (bytes32)"
              value={seriesIdToUpdate}
              onChange={(event) => setSeriesIdToUpdate(event.target.value)}
            />
            <div className="flex gap-3">
              <Input
                placeholder="Нове значення IV (наприклад 0.65)"
                value={newIV}
                onChange={(event) => setNewIV(event.target.value)}
              />
              <Button onClick={handleUpdateIV} disabled={!seriesIdToUpdate || !newIV || ivUpdateFetching}>
                {ivUpdateFetching ? "Надсилання…" : "Оновити IV"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </AccessGuard>

      <AccessGuard requiredRole={DEFAULT_ADMIN_ROLE} contractAddress={MARKET_ADDRESS as `0x${string}`}>
        <Card>
          <CardHeader>
            <CardTitle>Settlements</CardTitle>
            <CardDescription>Завершення серій та переказ залишків (опційно) на адресу.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Series ID (bytes32)"
                value={seriesIdToSettle}
                onChange={(event) => setSeriesIdToSettle(event.target.value)}
              />
              <Input
                placeholder="Адреса одержувача залишків (опційно)"
                value={settleResidualRecipient}
                onChange={(event) => setSettleResidualRecipient(event.target.value)}
              />
            </div>
            <Button onClick={handleSettleSeries} disabled={settleFetching || !seriesIdToSettle}>
              {settleFetching ? "Надсилання…" : "Settle серію"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ціни активів</CardTitle>
            <CardDescription>Оновлення вартості забезпечення у CollateralManager (1e18 precision).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedAssetId}
                onChange={(event) => setSelectedAssetId(event.target.value)}
              >
                {assets.map((asset: { id: string; symbol: string | null }) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.symbol ?? "UNKNOWN"} · {asset.id.slice(0, 6)}…
                  </option>
                ))}
              </select>
              <Input
                placeholder="Нова ціна (наприклад 1.00)"
                value={newAssetPrice}
                onChange={(event) => setNewAssetPrice(event.target.value)}
              />
            </div>
            <Button onClick={handleUpdateAssetPrice} disabled={setPriceFetching || !selectedAssetId || !newAssetPrice}>
              {setPriceFetching ? "Надсилання…" : "Оновити ціну"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Спот-ціна (Oracle)</CardTitle>
            <CardDescription>Ручне оновлення spot-значення в FlexibleOracleRouter.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={oracleAsset}
                onChange={(event) => setOracleAsset(event.target.value)}
              >
                {assets.map((asset: { id: string; symbol: string | null }) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.symbol ?? "UNKNOWN"} · {asset.id.slice(0, 6)}…
                  </option>
                ))}
              </select>
              <Input
                placeholder="Ціна (наприклад 2000)"
                value={oraclePrice}
                onChange={(event) => setOraclePrice(event.target.value)}
              />
              <Input
                placeholder="Decimals"
                value={oracleDecimals}
                onChange={(event) => setOracleDecimals(event.target.value)}
              />
            </div>
            <Button onClick={handleOracleSetPrice} disabled={oracleSetPriceFetching || !oracleAsset || !oraclePrice}>
              {oracleSetPriceFetching ? "Надсилання…" : "Оновити oracle"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Конфігурація активів</CardTitle>
            <CardDescription>Увімкнення активу та оновлення факторів маржі.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={configAssetId}
                onChange={(event) => setConfigAssetId(event.target.value)}
              >
                {assets.map((asset: { id: string; symbol: string | null; decimals: number | null }) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.symbol ?? "UNKNOWN"} · {asset.id.slice(0, 6)}…
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={configEnabled ? "enabled" : "disabled"}
                onChange={(event) => setConfigEnabled(event.target.value === "enabled")}
              >
                <option value="enabled">Увімкнено</option>
                <option value="disabled">Вимкнено</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                placeholder="Collateral factor (bps)"
                value={configCollateralFactor}
                onChange={(event) => setConfigCollateralFactor(event.target.value)}
              />
              <Input
                placeholder="Liquidation threshold (bps)"
                value={configLiquidationThreshold}
                onChange={(event) => setConfigLiquidationThreshold(event.target.value)}
              />
              <Input
                placeholder="Decimals"
                value={configDecimals}
                onChange={(event) => setConfigDecimals(event.target.value)}
              />
            </div>
            <Button onClick={handleUpdateAssetConfig} disabled={setConfigFetching || !configAssetId}>
              {setConfigFetching ? "Надсилання…" : "Зберегти конфігурацію"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Видача ролей</CardTitle>
            <CardDescription>Керування правами доступу у ключових контрактах.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedContractForRole}
                onChange={(event) => setSelectedContractForRole(event.target.value)}
              >
                {contractOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedRoleValue}
                onChange={(event) => setSelectedRoleValue(event.target.value)}
              >
                {availableRoleOptions.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Адреса одержувача"
                value={roleRecipient}
                onChange={(event) => setRoleRecipient(event.target.value)}
              />
            </div>
            <Button onClick={handleGrantRole} disabled={grantRoleFetching || !roleRecipient}>
              {grantRoleFetching ? "Надсилання…" : "Надати роль"}
            </Button>
          </CardContent>
        </Card>
      </AccessGuard>
    </div>
  );
}
