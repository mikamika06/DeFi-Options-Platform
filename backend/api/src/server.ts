import "dotenv/config";

import Fastify from "fastify";
import mercurius from "mercurius";
import { ethers } from "ethers";

import { createSdk, addresses } from "../../../contracts/sdk/index";
import { prisma, PrismaClientType } from "./prisma";

const rpcUrl = process.env.RPC_URL ?? "http://127.0.0.1:8545";
const provider = new ethers.JsonRpcProvider(rpcUrl);
const sdk = createSdk(provider);

const typeDefs = /* GraphQL */ `
  type Series {
    id: String!
    underlying: String!
    quote: String!
    strike: String!
    expiry: String!
    isCall: Boolean!
    baseFeeBps: Int!
    createdAt: String!
    longOpenInterest: String!
    shortOpenInterest: String!
  }

  type Quote {
    premium: String!
    fee: String!
  }

  type Query {
    series: [Series!]!
    quote(seriesId: String!, size: String!): Quote!
  }

  type Mutation {
    tradeCalldata(seriesId: String!, size: String!, maxPremium: String!): String!
    exerciseCalldata(seriesId: String!, size: String!, minPayout: String!): String!
  }
`;

type GraphQLContext = {
  prisma: PrismaClientType;
};

const resolvers = {
  Query: {
    series: async (_: unknown, __: unknown, _ctx: GraphQLContext) => {
      const ids: string[] = await sdk.optionsMarket.listSeriesIds();
      const seriesStates = await Promise.all(
        ids.map(async (id) => {
          const state = await sdk.optionsMarket.getSeries(id);
          const cfg = state.config;
          return {
            id,
            underlying: cfg.underlying,
            quote: cfg.quote,
            strike: cfg.strike.toString(),
            expiry: cfg.expiry.toString(),
            isCall: cfg.isCall,
            baseFeeBps: Number(cfg.baseFeeBps),
            createdAt: state.createdAt ? state.createdAt.toString() : "0",
            longOpenInterest: state.longOpenInterest?.toString?.() ?? "0",
            shortOpenInterest: state.shortOpenInterest?.toString?.() ?? "0"
          };
        })
      );
      return seriesStates;
    },
    quote: async (_: unknown, args: { seriesId: string; size: string }, _ctx: GraphQLContext) => {
      const size = BigInt(args.size);
      const [premium, fee] = await sdk.optionsMarket.quote(args.seriesId, size);
      return { premium: premium.toString(), fee: fee.toString() };
    }
  },
  Mutation: {
    tradeCalldata: async (
      _: unknown,
      args: { seriesId: string; size: string; maxPremium: string },
      _ctx: GraphQLContext
    ) => {
      const { seriesId } = args;
      const size = BigInt(args.size);
      const maxPremium = BigInt(args.maxPremium);
      return sdk.optionsMarket.interface.encodeFunctionData("trade", [seriesId, size, maxPremium]);
    },
    exerciseCalldata: async (
      _: unknown,
      args: { seriesId: string; size: string; minPayout: string },
      _ctx: GraphQLContext
    ) => {
      const { seriesId } = args;
      const size = BigInt(args.size);
      const minPayout = BigInt(args.minPayout);
      return sdk.optionsMarket.interface.encodeFunctionData("exercise", [seriesId, size, minPayout]);
    }
  }
};

async function buildServer() {
  const app = Fastify({ logger: true });
  app.register(mercurius, {
    schema: typeDefs,
    resolvers,
    context: () => ({
      prisma
    }),
    graphiql: true
  });

  app.get("/health", async () => ({ status: "ok" }));
  return app;
}

async function start() {
  const app = await buildServer();
  const port = Number(process.env.PORT ?? 4000);
  const host = process.env.HOST ?? "0.0.0.0";

  await app.listen({ port, host });
  app.log.info(`GraphQL API ready on http://${host}:${port} (RPC: ${rpcUrl})`);
  app.log.info(`Market contract: ${addresses.optionsMarket}`);
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
