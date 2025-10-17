"use client";

import * as React from "react";
import { Client, Provider, fetchExchange } from "urql";

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "";

const client = new Client({
  url: GRAPHQL_ENDPOINT,
  fetchOptions: () => ({
    headers: API_KEY ? { "x-api-key": API_KEY } : undefined
  }),
  exchanges: [fetchExchange]
});

export function UrqlProvider({ children }: { children: React.ReactNode }) {
  return <Provider value={client}>{children}</Provider>;
}
