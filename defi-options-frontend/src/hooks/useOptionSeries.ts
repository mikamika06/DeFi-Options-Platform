import { useMemo } from "react";
import { useQuery, gql } from "urql";
import { formatUnits } from "viem";

const GET_SERIES_QUERY = gql`
  query GetSeries($filter: SeriesFilterInput) {
    series(filter: $filter) {
      id
      optionType
      strikeWad
      expiry
      isSettled
      underlying {
        id
        symbol
        decimals
      }
      quote {
        id
        symbol
        decimals
      }
      metrics {
        markIv
      }
    }
  }
`;

export interface OptionSeries {
  id: string;
  optionType: "CALL" | "PUT";
  strike: number;
  strikeWad: string;
  expiry: number;
  isSettled: boolean;
  underlyingSymbol: string;
  underlyingAddress: string;
  quoteSymbol: string;
  quoteAddress: string;
  quoteDecimals: number;
  iv?: number | null;
}

interface SeriesAssetFragment {
  id: string;
  symbol: string;
  decimals: number;
}

interface SeriesMetricsFragment {
  markIv: string | null;
}

interface SeriesQueryItem {
  id: string;
  optionType: "CALL" | "PUT";
  strikeWad: string;
  expiry: string;
  isSettled: boolean;
  underlying: SeriesAssetFragment | null;
  quote: SeriesAssetFragment | null;
  metrics: SeriesMetricsFragment | null;
}

interface SeriesQueryResponse {
  series: SeriesQueryItem[];
}

export function useOptionSeries(underlyingAddress?: string) {
  const [{ data, fetching, error }] = useQuery({
    query: GET_SERIES_QUERY,
    variables: {
      filter: {
        underlyingId: underlyingAddress ? underlyingAddress.toLowerCase() : undefined,
        expiryFrom: Math.floor(Date.now() / 1000).toString()
      }
    },
    requestPolicy: "cache-and-network"
  });

  const series: OptionSeries[] = useMemo(() => {
    const typed = data as SeriesQueryResponse | undefined;
    if (!typed?.series) return [];
    return typed.series.map((item) => {
      const strikeWad = item.strikeWad ?? "0";
      const expiry = Number(item.expiry ?? "0");
      const underlying = item.underlying;
      const quote = item.quote;

      return {
        id: item.id,
        optionType: item.optionType,
        strike: Number(formatUnits(BigInt(strikeWad), 18)),
        strikeWad,
        expiry,
        isSettled: Boolean(item.isSettled),
        underlyingSymbol: underlying?.symbol ?? "",
        underlyingAddress: (underlying?.id ?? "").toLowerCase(),
        quoteSymbol: quote?.symbol ?? "",
        quoteAddress: (quote?.id ?? "").toLowerCase(),
        quoteDecimals: Number(quote?.decimals ?? 18),
        iv: item.metrics?.markIv ? Number(item.metrics.markIv) : null
      };
    });
  }, [data]);

  return {
    series,
    fetching,
    error
  };
}
