"use client";

import {
  RainbowKitProvider,
  getDefaultConfig,
  getDefaultWallets,
  lightTheme,
} from "@rainbow-me/rainbowkit";
import { arbitrum, base, mainnet, sepolia, Chain } from "wagmi/chains";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import type { Transport } from "viem";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";

const baseSepolia: Chain = {
  id: 84532,
  name: "Base Sepolia Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://sepolia.base.org"] },
  },
  blockExplorers: {
    default: { name: "Basescan", url: "https://sepolia.basescan.org" },
  },
  testnet: true,
};

const anvilLocalhost: Chain = {
  id: 31337,
  name: "Anvil Localhost",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
    public: { http: ["http://127.0.0.1:8545"] },
  },
  blockExplorers: {
    default: { name: "Local Explorer", url: "http://127.0.0.1:8545" },
  },
  testnet: true,
};

const chains: readonly [Chain, ...Chain[]] = [
  anvilLocalhost,
  mainnet,
  base,
  arbitrum,
  sepolia,
  baseSepolia,
];

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

const config = (() => {
  if (projectId) {
    const { wallets } = getDefaultWallets();
    return getDefaultConfig({
      appName: "DeFi Options Platform",
      projectId,
      wallets: [...wallets],
      chains,
      ssr: true,
    });
  }

  console.warn(
    "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID не задано. RainbowKit буде вимкнено, а Wagmi використовуватиме базову конфігурацію."
  );

  return createConfig({
    chains,
    multiInjectedProviderDiscovery: true,
    transports: Object.fromEntries(
      chains.map((chain) => [chain.id, http()])
    ) as Record<number, Transport>,
    connectors: [injected({ shimDisconnect: true })],
    ssr: true,
  });
})();

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {projectId ? (
          <RainbowKitProvider
            theme={lightTheme({
              accentColor: "#4F46E5",
              borderRadius: "small",
            })}
            modalSize="compact"
          >
            {children}
          </RainbowKitProvider>
        ) : (
          children
        )}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
