import { JsonRpcProvider } from "ethers";
import type { FastifyRequest } from "fastify";

import { prisma, PrismaClientType } from "./prisma";
import { provider, sdk, type ContractsSdk } from "./sdk";
import { resolveRoles } from "./services/authService";

export type GraphQLContext = {
  prisma: PrismaClientType;
  provider: JsonRpcProvider;
  sdk: ContractsSdk;
  request: FastifyRequest;
  roles: Set<string>;
};

export function createContext(request: FastifyRequest): GraphQLContext {
  return {
    prisma,
    provider,
    sdk,
    request,
    roles: resolveRoles(request)
  };
}
