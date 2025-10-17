import { useMemo } from "react";
import { useQuery, gql } from "urql";
import { formatUnits } from "viem";

const GET_USER_LP_SHARES_QUERY = gql`
  query GetUserLpShares($user: String!) {
    lpPositions(userAddress: $user) {
      userAddress
      shares
      entryTvlWad
      createdAt
      pool {
        id
        asset {
          symbol
          id
          decimals
        }
        tvlWad
      }
    }
  }
`;

export interface UserLpShare {
  poolId: string;
  userAddress: string;
  sharesWad: string;
  shares: number;
  entryTvl: number;
  assetSymbol: string;
  assetDecimals: number;
  createdAt: string | null;
}

interface LpAssetFragment {
  symbol: string;
  id: string;
  decimals: number;
}

interface LpPoolFragment {
  id: string;
  asset: LpAssetFragment | null;
  tvlWad: string | null;
}

interface LpPositionFragment {
  userAddress: string;
  shares: string | null;
  entryTvlWad: string | null;
  createdAt: string | null;
  pool: LpPoolFragment | null;
}

interface UserLpSharesQueryResponse {
  lpPositions: LpPositionFragment[];
}

export function useUserLPShares(userAddress: string | undefined) {
  const [{ data, fetching, error }] = useQuery({
    query: GET_USER_LP_SHARES_QUERY,
    variables: { user: userAddress ?? "" },
    pause: !userAddress,
    requestPolicy: "cache-and-network"
  });

  const lpShares: UserLpShare[] = useMemo(() => {
    const typed = data as UserLpSharesQueryResponse | undefined;
    if (!typed?.lpPositions) return [];
    return typed.lpPositions.map((position) => {
      const sharesRaw = position.shares ?? "0";
      const pool = position.pool;
      const poolAsset = pool?.asset;
      const decimals = Number(poolAsset?.decimals ?? 18);
      const entryTvlRaw = position.entryTvlWad ?? "0";

      return {
        poolId: pool?.id ?? "",
        userAddress: position.userAddress,
        sharesWad: sharesRaw,
        shares: Number(formatUnits(BigInt(sharesRaw), 18)),
        entryTvl: Number(formatUnits(BigInt(entryTvlRaw), decimals)),
        assetSymbol: poolAsset?.symbol ?? "",
        assetDecimals: decimals,
        createdAt: position.createdAt ?? null
      };
    });
  }, [data]);

  return {
    lpShares,
    fetching,
    error
  };
}
