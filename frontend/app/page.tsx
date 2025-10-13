"use client";

import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";

import deployments from "../../contracts/deployments/localhost.json";

type Series = {
  id: string;
  strike: string;
  expiry: string;
  isCall: boolean;
  baseFeeBps: number;
};

type Quote = {
  premium: string;
  fee: string;
};

declare global {
  interface Window {
    ethereum?: unknown;
  }
}

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:4000/graphql";
const MARKET_ADDRESS = process.env.NEXT_PUBLIC_MARKET_ADDRESS ?? deployments.optionsMarket;

const SERIES_QUERY = `
  query Series {
    series {
      id
      strike
      expiry
      isCall
      baseFeeBps
    }
  }
`;

const QUOTE_QUERY = `
  query Quote($seriesId: String!, $size: String!) {
    quote(seriesId: $seriesId, size: $size) {
      premium
      fee
    }
  }
`;

const TRADE_MUTATION = `
  mutation TradeTx($seriesId: String!, $size: String!, $maxPremium: String!) {
    tradeCalldata(seriesId: $seriesId, size: $size, maxPremium: $maxPremium)
  }
`;

async function graphQLRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables })
  });
  const json = await response.json();
  if (json.errors && json.errors.length) {
    throw new Error(json.errors.map((e: { message: string }) => e.message).join("\n"));
  }
  return json.data as T;
}

function formatExpiry(expiry: string) {
  const timestamp = Number(expiry);
  if (!Number.isFinite(timestamp)) return expiry;
  return new Date(timestamp * 1000).toLocaleString();
}

export default function TradePage() {
  const [series, setSeries] = useState<Series[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>("");
  const [size, setSize] = useState<string>(ethers.parseUnits("1", 18).toString());
  const [quote, setQuote] = useState<Quote | null>(null);
  const [status, setStatus] = useState<string>("");
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    graphQLRequest<{ series: Series[] }>(SERIES_QUERY)
      .then(({ series }) => {
        setSeries(series);
        if (series.length && !selectedSeriesId) {
          setSelectedSeriesId(series[0].id);
        }
      })
      .catch((err) => setStatus(err.message));
  }, [selectedSeriesId]);

  const selectedSeries = useMemo(() => series.find((item) => item.id === selectedSeriesId), [
    series,
    selectedSeriesId
  ]);

  const requestQuote = async () => {
    if (!selectedSeriesId) return;
    try {
      setIsBusy(true);
      setStatus("Requesting quote...");
      const data = await graphQLRequest<{ quote: Quote }>(QUOTE_QUERY, {
        seriesId: selectedSeriesId,
        size
      });
      setQuote(data.quote);
      setStatus("Quote received");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
      setQuote(null);
    } finally {
      setIsBusy(false);
    }
  };

  const executeTrade = async () => {
    if (!quote || !selectedSeriesId) {
      setStatus("Quote is required before trading");
      return;
    }
    if (!window.ethereum) {
      setStatus("Wallet not detected. Please install Metamask or a compatible wallet.");
      return;
    }

    try {
      setIsBusy(true);
      setStatus("Preparing transaction...");
      const maxPremium = (BigInt(quote.premium) + BigInt(quote.fee) * 12n / 10n).toString();
      const { tradeCalldata } = await graphQLRequest<{ tradeCalldata: string }>(TRADE_MUTATION, {
        seriesId: selectedSeriesId,
        size,
        maxPremium
      });

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();

      const tx = await signer.sendTransaction({
        to: MARKET_ADDRESS,
        data: tradeCalldata
      });

      setStatus(`Tx submitted: ${tx.hash}`);
      await tx.wait();
      setStatus(`Trade executed: ${tx.hash}`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section className="space-y-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm text-slate-400">Series</span>
          <select
            value={selectedSeriesId}
            onChange={(event) => setSelectedSeriesId(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
          >
            {series.map((item) => (
              <option key={item.id} value={item.id}>
                {item.isCall ? "CALL" : "PUT"} • Strike {ethers.formatUnits(item.strike, 18)} • Exp {formatExpiry(item.expiry)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-slate-400">Size (wei)</span>
          <input
            value={size}
            onChange={(event) => setSize(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
          />
        </label>
      </div>

      <div className="flex gap-4">
        <button
          onClick={requestQuote}
          disabled={!selectedSeriesId || isBusy}
          className="rounded-lg bg-sky-600 px-4 py-2 font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          Get quote
        </button>
        <button
          onClick={executeTrade}
          disabled={!quote || isBusy}
          className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          Execute trade
        </button>
      </div>

      {quote && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 text-sm">
          <p><strong>Premium:</strong> {quote.premium}</p>
          <p><strong>Fee:</strong> {quote.fee}</p>
        </div>
      )}

      {selectedSeries && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 text-xs text-slate-400">
          <p>ID: {selectedSeries.id}</p>
          <p>Strike: {selectedSeries.strike}</p>
          <p>Expiry: {selectedSeries.expiry}</p>
          <p>Type: {selectedSeries.isCall ? "Call" : "Put"}</p>
          <p>Base fee (bps): {selectedSeries.baseFeeBps}</p>
        </div>
      )}

      {status && <p className="text-sm text-slate-300">{status}</p>}
    </section>
  );
}
