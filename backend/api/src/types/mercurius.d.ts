import type { GraphQLContext } from "../context";

declare module "mercurius" {
  interface MercuriusContext extends GraphQLContext {}
}
