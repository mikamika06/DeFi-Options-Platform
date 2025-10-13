import "dotenv/config";

import Fastify from "fastify";
import mercurius from "mercurius";

import { typeDefs } from "./graphql/typeDefs";
import resolvers from "./graphql/resolvers";
import { createContext } from "./context";
import { rpcUrl, addresses } from "./sdk";

async function buildServer() {
  const app = Fastify({ logger: true });
  app.register(mercurius, {
    schema: typeDefs,
    resolvers,
    context: (request) => createContext(request),
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
  (app.log as any).info(`GraphQL API ready on http://${host}:${port} (RPC: ${rpcUrl})`);
  (app.log as any).info(`Market contract: ${addresses.optionsMarket}`);
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
