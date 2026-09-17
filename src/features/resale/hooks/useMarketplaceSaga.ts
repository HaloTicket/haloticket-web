import { useEffect, useState } from "react";
import { marketplaceApi } from "@/services/marketplaceApi";
import type { MarketplaceSagaResponse } from "@/types/marketplace";

const terminalStates = new Set(["COMPLETED", "FAILED", "COMPENSATED"]);

export function useMarketplaceSaga(sagaId?: string) {
  const [saga, setSaga] = useState<MarketplaceSagaResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(sagaId));
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!sagaId) {
      setSaga(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let delay = 1000;
    setLoading(true);
    setError(null);

    const poll = async () => {
      try {
        const result = await marketplaceApi.getSaga(sagaId);
        if (cancelled) return;
        setSaga(result);
        setLoading(false);
        if (!terminalStates.has(result.state)) {
          timer = setTimeout(poll, delay);
          delay = Math.min(delay * 2, 10000);
        }
      } catch (cause) {
        if (cancelled) return;
        setError(cause);
        setLoading(false);
        timer = setTimeout(poll, delay);
        delay = Math.min(delay * 2, 10000);
      }
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sagaId]);

  return { saga, loading, error };
}
