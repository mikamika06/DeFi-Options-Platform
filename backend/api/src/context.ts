import { JsonRpcProvider } from "ethers";

import { prisma, PrismaClientType } from "./prisma";
import { provider, sdk, type ContractsSdk } from "./sdk";

export type GraphQLContext = {
  prisma: PrismaClientType;
  provider: JsonRpcProvider;
  sdk: ContractsSdk;
};

const baseContext: GraphQLContext = {
  prisma,
  provider,
  sdk
};

export function createContext(): GraphQLContext {
  return baseContext;
}
