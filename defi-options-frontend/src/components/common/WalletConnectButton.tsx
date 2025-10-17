"use client";

import { Button } from "@/components/ui/button";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";

export function WalletConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <Button variant="outline" onClick={() => disconnect()}>
        Від’єднати {address?.slice(0, 6)}…{address?.slice(-4)}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      disabled={isPending}
      onClick={() =>
        connect({ connector: injected({ options: { shimDisconnect: true } }) })
      }
    >
      Підключити гаманець
    </Button>
  );
}
