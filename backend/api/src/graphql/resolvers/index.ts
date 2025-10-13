import type { IResolvers } from "mercurius";

import type { GraphQLContext } from "../../context";
import { Query } from "./query";
import { Mutation } from "./mutation";

const resolvers: IResolvers<unknown, GraphQLContext> = {
  Query,
  Mutation
};

export default resolvers;
