import { useMutation, gql } from "urql";

const LP_DEPOSIT_CALldata = gql`
  mutation LpDepositCalldata($input: LpDepositInput!) {
    lpDepositCalldata(input: $input)
  }
`;

const LP_WITHDRAW_CALldata = gql`
  mutation LpWithdrawCalldata($input: LpWithdrawInput!) {
    lpWithdrawCalldata(input: $input)
  }
`;

export function useLiquidityActions() {
  const [depositResult, executeDepositMutation] = useMutation(LP_DEPOSIT_CALldata);
  const [withdrawResult, executeWithdrawMutation] = useMutation(LP_WITHDRAW_CALldata);

  const getDepositCalldata = (assetsWad: string, receiver: string) =>
    executeDepositMutation({ input: { assets: assetsWad, receiver } });

  const getWithdrawCalldata = (assetsWad: string, receiver: string, owner: string) =>
    executeWithdrawMutation({ input: { assets: assetsWad, receiver, owner } });

  return {
    depositResult,
    withdrawResult,
    getDepositCalldata,
    getWithdrawCalldata
  };
}
