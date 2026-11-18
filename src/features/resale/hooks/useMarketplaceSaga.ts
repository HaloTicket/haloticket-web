import { useEffect, useState } from "react";
import { marketplaceApi } from "@/services/marketplaceApi";
import type { MarketplaceSagaResponse } from "@/types/marketplace";

const terminalStates = new Set(["COMPLETED", "FAILED", "COMPENSATED"]);

/** Hook theo dõi một saga chợ vé bằng cách gọi API lấy trạng thái lặp lại, giãn dần từ 1 giây tới tối đa 10 giây. Dừng khi saga ở trạng thái kết thúc, hoặc khi đang `WAITING_RECIPIENT` nếu bật `stopOnWaitingRecipient`; gặp lỗi vẫn thử lại. Trả về `saga`, `loading`, `error`. */
export function useMarketplaceSaga(sagaId?: string, options?: { stopOnWaitingRecipient?: boolean }) {
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

    /** Gọi API lấy saga một lần rồi tự đặt lịch lần kế tiếp với độ trễ tăng gấp đôi, trừ khi saga đã kết thúc hoặc hook đã bị hủy. */
    const poll = async () => {
      try {
        const result = await marketplaceApi.getSaga(sagaId);
        if (cancelled) return;
        setSaga(result);
        setLoading(false);
        const reachedGiftHandoff = options?.stopOnWaitingRecipient && result.state === "WAITING_RECIPIENT";
        if (!terminalStates.has(result.state) && !reachedGiftHandoff) {
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
  }, [sagaId, options?.stopOnWaitingRecipient]);

  return { saga, loading, error };
}
