import { useMemo } from "react";
import { useQuery, gql } from "urql";
import { formatUnits } from "viem";

const GET_USER_RISK_QUERY = gql`
  query GetUserRisk($filter: RiskSnapshotFilterInput!) {
    riskSnapshots(filter: $filter) {
      id
      netDelta
      netGamma
      netVega
      marginRequiredWad
      marginAvailableWad
      liquidationPrice
      alertLevel
      timestamp
    }
  }
`;

export interface UserRiskMetrics {
  netDelta: number | null;
  netGamma: number | null;
  netVega: number | null;
  marginRequired: number;
  marginAvailable: number;
  liquidationPrice: number | null;
  alertLevel: string;
  timestamp: string;
}

export function useUserRisk(userAddress: string | undefined) {
  const [{ data, fetching, error }] = useQuery({
    query: GET_USER_RISK_QUERY,
    variables: {
      filter: {
        userAddress: userAddress ?? "",
        limit: 1
      }
    },
    pause: !userAddress,
    requestPolicy: "network-only",
    pollInterval: 5000
  });

  const risk: UserRiskMetrics | null = useMemo(() => {
    const snapshot = data?.riskSnapshots?.[0];
    if (!snapshot) return null;

    const parse = (value: string | null) => (value ? Number(value) : null);
    const fromWad = (value: string | null) => (value ? Number(formatUnits(BigInt(value), 18)) : 0);

    return {
      netDelta: parse(snapshot.netDelta),
      netGamma: parse(snapshot.netGamma),
      netVega: parse(snapshot.netVega),
      marginRequired: fromWad(snapshot.marginRequiredWad),
      marginAvailable: fromWad(snapshot.marginAvailableWad),
      liquidationPrice: parse(snapshot.liquidationPrice),
      alertLevel: snapshot.alertLevel,
      timestamp: snapshot.timestamp
    };
  }, [data]);

  return {
    risk,
    fetching,
    error
  };
}
