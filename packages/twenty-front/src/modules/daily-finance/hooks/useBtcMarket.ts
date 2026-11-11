import { useEffect, useState } from 'react';

import { isDefined } from 'twenty-shared/utils';

export type BtcMarketSnapshot = {
  priceUsd: number;
  change24hPercent: number;
  marketCapUsd: number;
  volume24hUsd: number;
  high30d: number;
  low30d: number;
  series: Array<{ timestampMs: number; priceUsd: number }>;
  updatedAt: Date;
};

type BtcMarketState = {
  snapshot: BtcMarketSnapshot | null;
  error: string | null;
  isLoading: boolean;
};

const COINGECKO_MARKET_URL =
  'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30';

const formatCompactUsd = (value: number) => {
  if (value >= 1_000_000_000_000) {
    return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  }
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  }
  return `$${Math.round(value).toLocaleString('en-US')}`;
};

export const formatUsdPrice = (value: number) =>
  Math.round(value).toLocaleString('en-US');

export const formatUsdCompact = formatCompactUsd;

export const useBtcMarket = () => {
  const [state, setState] = useState<BtcMarketState>({
    snapshot: null,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      try {
        const response = await fetch(COINGECKO_MARKET_URL);
        if (!response.ok) {
          throw new Error(`CoinGecko ${response.status}`);
        }
        const payload = (await response.json()) as {
          prices: Array<[number, number]>;
          market_caps: Array<[number, number]>;
          total_volumes: Array<[number, number]>;
        };

        const series = payload.prices.map(([timestampMs, priceUsd]) => ({
          timestampMs,
          priceUsd,
        }));
        if (series.length < 2) {
          throw new Error('CoinGecko returned no series');
        }

        const latest = series[series.length - 1];
        const dayAgoTarget = latest.timestampMs - 24 * 60 * 60 * 1000;
        const dayAgo =
          [...series].reverse().find((point) => point.timestampMs <= dayAgoTarget) ??
          series[0];
        const change24hPercent =
          ((latest.priceUsd - dayAgo.priceUsd) / dayAgo.priceUsd) * 100;
        const prices = series.map((point) => point.priceUsd);
        const high30d = Math.max(...prices);
        const low30d = Math.min(...prices);
        const marketCapUsd =
          payload.market_caps[payload.market_caps.length - 1]?.[1] ?? 0;
        const volume24hUsd =
          payload.total_volumes[payload.total_volumes.length - 1]?.[1] ?? 0;

        if (isCancelled) {
          return;
        }

        setState({
          isLoading: false,
          error: null,
          snapshot: {
            priceUsd: latest.priceUsd,
            change24hPercent,
            marketCapUsd,
            volume24hUsd,
            high30d,
            low30d,
            series,
            updatedAt: new Date(),
          },
        });
      } catch (error) {
        if (isCancelled) {
          return;
        }
        setState({
          isLoading: false,
          snapshot: null,
          error: error instanceof Error ? error.message : 'BTC fetch failed',
        });
      }
    };

    void load();
    const intervalId = window.setInterval(() => void load(), 5 * 60_000);
    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return state;
};

export const isBtcUp = (snapshot: BtcMarketSnapshot | null) =>
  isDefined(snapshot) && snapshot.change24hPercent >= 0;
