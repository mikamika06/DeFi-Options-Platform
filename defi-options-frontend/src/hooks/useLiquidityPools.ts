import { useMemo } from "react";
import { useQuery, gql } from "urql";
import { formatUnits } from "viem";

const GET_POOLS_QUERY = gql`
  query GetPools {
    pools {
      id
      tvlWad
      utilization
      apy
      totalShares
      createdAt
      asset {
        id
        symbol
        decimals
      }
      metrics {
        hedgeReserveWad
        protocolFeesWad
        lastRebalanceAt
      }
    }
  }
`;

export interface LiquidityPool {
  id: string;
  assetSymbol: string;
  assetAddress: string;
  assetDecimals: number;
  tvl: number;
  tvlWad: string;
  apy: number | null;
  utilization: number | null;
  totalShares: string;
  createdAt: string | null;
  hedgeReserve: number;
  protocolFees: number;
}

interface PoolAssetFragment {
  id: string;
  symbol: string;
  decimals: number;
}

interface PoolMetricsFragment {
  hedgeReserveWad: string | null;
  protocolFeesWad: string | null;
  lastRebalanceAt: string | null;
}

interface PoolQueryItem {
  id: string;
  tvlWad: string;
  utilization: string | null;
  apy: string | null;
  totalShares: string | null;
  createdAt: string | null;
  asset: PoolAssetFragment | null;
  metrics: PoolMetricsFragment | null;
}

interface PoolsQueryResponse {
  pools: PoolQueryItem[];
}

export function useLiquidityPools() {
  const [{ data, fetching, error }] = useQuery({
    query: GET_POOLS_QUERY,
    requestPolicy: "cache-and-network"
  });

  const pools: LiquidityPool[] = useMemo(() => {
    const typed = data as PoolsQueryResponse | undefined;
    if (!typed?.pools) return [];
    return typed.pools.map((pool) => {
      const decimals = Number(pool.asset?.decimals ?? 18);
      const hedgeReserveWad = pool.metrics?.hedgeReserveWad ?? "0";
      const protocolFeesWad = pool.metrics?.protocolFeesWad ?? "0";

      return {
        id: pool.id,
        assetSymbol: pool.asset?.symbol ?? "",
        assetAddress: (pool.asset?.id ?? "").toLowerCase(),
        assetDecimals: decimals,
        tvl: Number(formatUnits(BigInt(pool.tvlWad ?? "0"), decimals)),
        tvlWad: pool.tvlWad,
        apy: pool.apy ? Number(pool.apy) : null,
        utilization: pool.utilization ? Number(pool.utilization) : null,
        totalShares: pool.totalShares ?? "0",
        createdAt: pool.createdAt ?? null,
        hedgeReserve: Number(formatUnits(BigInt(hedgeReserveWad), decimals)),
        protocolFees: Number(formatUnits(BigInt(protocolFeesWad), decimals))
      };
    });
  }, [data]);

  return {
    pools,
    fetching,
    error
  };
}
