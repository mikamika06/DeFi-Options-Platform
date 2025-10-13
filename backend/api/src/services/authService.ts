import type { FastifyRequest } from "fastify";

import type { GraphQLContext } from "../context";

const keeperApiKey = process.env.KEEPER_API_KEY ?? "";
const adminApiKey = process.env.ADMIN_API_KEY ?? "";
const liquidatorApiKey = process.env.LIQUIDATOR_API_KEY ?? "";

const ROLE_KEYS: Record<string, string> = {
  keeper: keeperApiKey,
  admin: adminApiKey,
  liquidator: liquidatorApiKey
};

export function resolveRoles(request: FastifyRequest): Set<string> {
  const roles = new Set<string>();
  const headerKey = request.headers["x-api-key"] ?? request.headers["authorization"];
  if (typeof headerKey !== "string" || headerKey.length === 0) {
    return roles;
  }

  Object.entries(ROLE_KEYS).forEach(([role, key]) => {
    if (key && headerKey === key) {
      roles.add(role);
      if (role === "admin") {
        roles.add("keeper");
        roles.add("liquidator");
      }
    }
  });

  return roles;
}

export function requireRole(ctx: GraphQLContext, role: string) {
  if (!ctx.roles.has(role)) {
    throw new Error(`Forbidden: missing role ${role}`);
  }
}

export function requireAnyRole(ctx: GraphQLContext, roles: string[]) {
  for (const role of roles) {
    if (ctx.roles.has(role)) {
      return;
    }
  }
  throw new Error(`Forbidden: requires one of roles [${roles.join(", ")}]`);
}
