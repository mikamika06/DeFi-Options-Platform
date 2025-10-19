import { useCallback } from "react";
import { useSendTransaction } from "wagmi";

type MutationResponse = { data?: Record<string, string>; error?: unknown };

export function useAdminMutation() {
  const { sendTransactionAsync } = useSendTransaction();

  const executeAdminMutation = useCallback(
    async <TVars>(
      execute: (variables: TVars) => Promise<MutationResponse>,
      variables: TVars,
      dataKey: string,
      target: string,
      successMessage: string,
      errorMessage: string
    ): Promise<{ success: boolean; message: string }> => {
      try {
        const response = await execute(variables);
        if (response.error) {
          throw response.error;
        }
        const calldata = response.data?.[dataKey];
        if (!calldata) {
          throw new Error("No calldata received");
        }
        await sendTransactionAsync({
          to: target as `0x${string}`,
          data: calldata as `0x${string}`,
        });
        return { success: true, message: successMessage };
      } catch (error) {
        console.error(`${dataKey} failed`, error);
        return { success: false, message: errorMessage };
      }
    },
    [sendTransactionAsync]
  );

  return { executeAdminMutation };
}
