import { useMemo } from "react";
import { useQuery, gql } from "urql";
import { formatUnits, parseUnits } from "viem";

const QUOTE_QUERY = gql`
  query Quote($seriesId: String!, $size: String!) {
    quote(seriesId: $seriesId, size: $size) {
      premium
      fee
    }
  }
`;

export interface OptionQuote {
  premium: bigint;
  fee: bigint;
  total: bigint;
}

export function useOptionQuoteSubscription(
  seriesId: string | null,
  size: number,
  decimals: number
) {
  const sizeWad = useMemo(() => {
    if (!seriesId || size <= 0) return "0";
    return parseUnits(size.toString(), 18).toString();
  }, [seriesId, size]);

  const [{ data, fetching, error }] = useQuery({
    query: QUOTE_QUERY,
    variables: {
      seriesId: seriesId ?? "",
      size: sizeWad
    },
    pause: !seriesId || size <= 0,
    requestPolicy: "network-only",
    pollInterval: 5000
  });

  const quote: OptionQuote | null = useMemo(() => {
    if (!data?.quote) return null;
    const premium = BigInt(data.quote.premium ?? "0");
    const fee = BigInt(data.quote.fee ?? "0");
    return {
      premium,
      fee,
      total: premium + fee
    };
  }, [data]);

  const totalFormatted = useMemo(() => {
    if (!quote) return "0";
    return formatUnits(quote.total, decimals);
  }, [quote, decimals]);

  return {
    quote,
    totalFormatted,
    fetching,
    error
  };
}
