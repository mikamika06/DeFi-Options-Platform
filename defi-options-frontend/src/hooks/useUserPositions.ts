import { useMemo } from "react";
import { useQuery, gql } from "urql";
import { formatUnits } from "viem";

const GET_POSITIONS_QUERY = gql`
  query GetUserPositions($filter: PositionFilterInput!) {
    positions(filter: $filter) {
      id
      seriesId
      positionType
      sizeWad
      avgPriceWad
      pnlUnrealizedWad
      pnlRealizedWad
      lastUpdated
      series {
        id
        optionType
        strikeWad
        expiry
        underlying {
          symbol
          id
        }
        quote {
          symbol
          decimals
        }
      }
    }
  }
`;

export interface UserPosition {
  id: string;
  seriesId: string;
  positionType: "LONG" | "SHORT";
  size: number;
  sizeWad: string;
  avgPrice: number;
  avgPriceWad: string;
  pnlUnrealized: number;
  pnlRealized: number;
  lastUpdated: string;
  underlyingSymbol: string;
  quoteSymbol: string;
  quoteDecimals: number;
  strike: number;
  expiry: number;
}

interface PositionSeriesFragment {
  id: string;
  optionType: "CALL" | "PUT";
  strikeWad: string | null;
  expiry: string | null;
  underlying: { symbol: string | null; id: string | null } | null;
  quote: { symbol: string | null; decimals: number | null } | null;
}

interface PositionFragment {
  id: string;
  seriesId: string;
  positionType: "LONG" | "SHORT";
  sizeWad: string | null;
  avgPriceWad: string | null;
  pnlUnrealizedWad: string | null;
  pnlRealizedWad: string | null;
  lastUpdated: string;
  series: PositionSeriesFragment;
}

interface PositionsQueryResponse {
  positions: PositionFragment[];
}

export function useUserPositions(userAddress: string | undefined) {
  const [{ data, fetching, error }] = useQuery({
    query: GET_POSITIONS_QUERY,
    variables: {
      filter: {
        userAddress: userAddress ?? ""
      }
    },
    pause: !userAddress,
    requestPolicy: "cache-and-network"
  });

  const positions: UserPosition[] = useMemo(() => {
    const typed = data as PositionsQueryResponse | undefined;
    if (!typed?.positions) return [];
    return typed.positions.map((item) => {
      const decimals = Number(item.series.quote?.decimals ?? 18);

      const sizeWad = item.sizeWad ?? "0";
      const avgPriceWad = item.avgPriceWad ?? "0";
      const pnlUnrealizedWad = item.pnlUnrealizedWad ?? "0";
      const pnlRealizedWad = item.pnlRealizedWad ?? "0";
      const strikeWad = item.series.strikeWad ?? "0";
      const expiry = item.series.expiry ?? "0";

      return {
        id: item.id,
        seriesId: item.seriesId,
        positionType: item.positionType,
        size: Number(formatUnits(BigInt(sizeWad), 18)),
        sizeWad,
        avgPrice: Number(formatUnits(BigInt(avgPriceWad), decimals)),
        avgPriceWad,
        pnlUnrealized: Number(formatUnits(BigInt(pnlUnrealizedWad), decimals)),
        pnlRealized: Number(formatUnits(BigInt(pnlRealizedWad), decimals)),
        lastUpdated: item.lastUpdated,
        underlyingSymbol: item.series.underlying?.symbol ?? "",
        quoteSymbol: item.series.quote?.symbol ?? "",
        quoteDecimals: decimals,
        strike: Number(formatUnits(BigInt(strikeWad), 18)),
        expiry: Number(expiry)
      };
    });
  }, [data]);

  return {
    positions,
    fetching,
    error
  };
}
