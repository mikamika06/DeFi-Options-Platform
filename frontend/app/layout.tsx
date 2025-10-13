import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DeFi Options Sandbox",
  description: "Experiment with the DeFi Options Platform locally"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <main className="mx-auto max-w-4xl p-6 space-y-6">
          <header className="space-y-2">
            <h1 className="text-3xl font-semibold">DeFi Options Sandbox</h1>
            <p className="text-sm text-slate-400">
              Quotes and trades are executed against the local Hardhat deployment. Make sure the
              backend GraphQL service (`pnpm --filter @defi-options/backend dev`) is running.
            </p>
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}
