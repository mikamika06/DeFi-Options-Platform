import { useMutation, gql } from "urql";

const TRADE_CALldata_MUTATION = gql`
  mutation TradeCalldata($seriesId: String!, $size: String!, $maxPremium: String!) {
    tradeCalldata(seriesId: $seriesId, size: $size, maxPremium: $maxPremium)
  }
`;

const EXERCISE_CALldata_MUTATION = gql`
  mutation ExerciseCalldata($seriesId: String!, $size: String!, $minPayout: String!) {
    exerciseCalldata(seriesId: $seriesId, size: $size, minPayout: $minPayout)
  }
`;

const OPEN_SHORT_CALldata_MUTATION = gql`
  mutation OpenShortCalldata($input: OpenShortInput!) {
    openShortCalldata(input: $input)
  }
`;

const CLOSE_SHORT_CALldata_MUTATION = gql`
  mutation CloseShortCalldata($input: CloseShortInput!) {
    closeShortCalldata(input: $input)
  }
`;

export function useTradeExecution() {
  const [tradeResult, executeTradeMutation] = useMutation(TRADE_CALldata_MUTATION);
  const [exerciseResult, executeExerciseMutation] = useMutation(EXERCISE_CALldata_MUTATION);
  const [openShortResult, executeOpenShortMutation] = useMutation(OPEN_SHORT_CALldata_MUTATION);
  const [closeShortResult, executeCloseShortMutation] = useMutation(CLOSE_SHORT_CALldata_MUTATION);

  const executeTrade = (seriesId: string, sizeWad: string, maxPremiumWad: string) =>
    executeTradeMutation({ seriesId, size: sizeWad, maxPremium: maxPremiumWad });

  const getExerciseCalldata = (seriesId: string, sizeWad: string, minPayoutWad: string) =>
    executeExerciseMutation({ seriesId, size: sizeWad, minPayout: minPayoutWad });

  const getOpenShortCalldata = (seriesId: string, sizeWad: string, recipient: string) =>
    executeOpenShortMutation({ input: { seriesId, size: sizeWad, recipient } });

  const getCloseShortCalldata = (seriesId: string, sizeWad: string) =>
    executeCloseShortMutation({ input: { seriesId, size: sizeWad } });

  return {
    tradeResult,
    exerciseResult,
    openShortResult,
    closeShortResult,
    executeTrade,
    getExerciseCalldata,
    getOpenShortCalldata,
    getCloseShortCalldata
  };
}
