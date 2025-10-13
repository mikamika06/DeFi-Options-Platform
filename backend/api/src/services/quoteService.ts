import type { GraphQLContext } from "../context";
import type { QuoteDTO } from "../graphql/types";

export async function getQuote(ctx: GraphQLContext, seriesId: string, size: string): Promise<QuoteDTO> {
  const sizeBigInt = BigInt(size);
  const [premium, fee] = await ctx.sdk.optionsMarket.quote(seriesId, sizeBigInt);
  return {
    premium: premium.toString(),
    fee: fee.toString()
  };
}
