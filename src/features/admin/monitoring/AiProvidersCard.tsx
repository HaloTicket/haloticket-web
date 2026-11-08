import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiCpu, FiRefreshCw, FiZap } from "react-icons/fi";
import { aiApi } from "@/services/aiApi";
import { getAiErrorMessage } from "@/utils/aiErrors";
import type { AiHealthResponse, AiProviderHealth } from "@/types/ai";

const STATUS_STYLE: Record<AiProviderHealth["status"], string> = {
  ok: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  degraded: "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  down: "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800",
  unknown: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
};

export function AiProvidersCard() {
  const { t, i18n } = useTranslation();
  const label = (vi: string, en: string) => t(vi, { defaultValue: i18n.language.startsWith("en") ? en : vi });
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [data, setData] = useState<AiHealthResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isProbing, setIsProbing] = useState(false);
  const [probeError, setProbeError] = useState("");
  const mounted = useRef(true);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await aiApi.getAiHealth(false);
      if (!mounted.current) return;
      setData(res);
      setState("ready");
    } catch (err) {
      if (!mounted.current) return;
      setErrorMessage(getAiErrorMessage(err));
      setState("error");
    }
  }, []);

  const load = () => {
    setState("loading");
    void fetchHealth();
  };

  useEffect(() => {
    mounted.current = true;
    aiApi.getAiHealth(false)
      .then((res) => {
        if (!mounted.current) return;
        setData(res);
        setState("ready");
      })
      .catch((err: unknown) => {
        if (!mounted.current) return;
        setErrorMessage(getAiErrorMessage(err));
        setState("error");
      });
    return () => { mounted.current = false; };
  }, []);

  const runProbe = async () => {
    setIsProbing(true);
    setProbeError("");
    try {
      const res = await aiApi.getAiHealth(true);
      if (!mounted.current) return;
      setData(res);
      setState("ready");
    } catch (err) {
      if (mounted.current) setProbeError(getAiErrorMessage(err));
    } finally {
      if (mounted.current) setIsProbing(false);
    }
  };

  const statusText = (status: AiProviderHealth["status"]) =>
    status === "ok" ? label("Ổn định", "Healthy")
      : status === "degraded" ? label("Suy giảm", "Degraded")
        : status === "down" ? label("Ngừng hoạt động", "Down")
          : label("Chưa rõ", "Unknown");

  const formatTime = (iso: string | null) => {
    if (!iso) return label("Chưa có", "None yet");
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(i18n.language.startsWith("en") ? "en-US" : "vi-VN");
  };

  return (
    <section aria-labelledby="ai-providers-title" className="app-bg-card border app-border rounded-lg p-4 shadow-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 id="ai-providers-title" className="text-sm font-bold app-text-main flex items-center gap-2">
            <FiCpu className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <span>{label("Nhà cung cấp AI", "AI providers")}</span>
          </h3>
          <p className="text-[11px] app-text-muted mt-0.5">
            {label("Trạng thái ghi nhận từ các lần gọi thật gần đây.", "Status recorded from recent real calls.")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={state === "loading" || isProbing}
            aria-label={label("Tải lại trạng thái nhà cung cấp AI", "Reload AI provider status")}
            className="inline-flex items-center min-h-9 gap-1.5 px-3 text-xs font-semibold rounded-md border app-border app-bg-card app-text-main hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${state === "loading" ? "motion-safe:animate-spin" : ""}`} aria-hidden="true" />
            <span>{label("Tải lại", "Reload")}</span>
          </button>
          <button
            type="button"
            onClick={() => void runProbe()}
            disabled={isProbing || state === "loading"}
            className="inline-flex items-center min-h-9 gap-1.5 px-3 text-xs font-semibold rounded-md border app-border app-bg-card app-text-main hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
          >
            <FiZap className={`w-3.5 h-3.5 text-blue-500 ${isProbing ? "motion-safe:animate-pulse" : ""}`} aria-hidden="true" />
            <span>{isProbing ? label("Đang kiểm tra...", "Checking...") : label("Kiểm tra nhanh", "Quick check")}</span>
          </button>
        </div>
      </div>

      <div aria-live="polite">
        {state === "loading" && !data && (
          <p role="status" className="text-xs app-text-muted">{label("Đang tải trạng thái nhà cung cấp AI...", "Loading AI provider status...")}</p>
        )}

        {state === "error" && (
          <div role="alert" className="rounded-md border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 text-xs text-rose-700 dark:text-rose-300 flex flex-wrap items-center justify-between gap-2">
            <span>{label("Không tải được trạng thái nhà cung cấp AI.", "Could not load AI provider status.")} {errorMessage}</span>
            <button type="button" onClick={load} className="px-2.5 py-1 rounded border border-rose-300 dark:border-rose-800 font-semibold cursor-pointer">
              {label("Thử lại", "Retry")}
            </button>
          </div>
        )}

        {probeError && (
          <p role="alert" className="text-xs text-rose-600 dark:text-rose-400 mb-2">
            {label("Kiểm tra nhanh không thành công.", "The quick check did not complete.")} {probeError}
          </p>
        )}

        {state === "ready" && data && (
          <>
            {data.probe && (
              <p
                role="status"
                className={`text-xs mb-2 font-medium ${data.probe.status === "ok" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
              >
                {data.probe.status === "ok"
                  ? label("Kiểm tra nhanh thành công", "Quick check succeeded")
                  : label("Kiểm tra nhanh thất bại", "Quick check failed")}
                {data.probe.provider ? ` (${data.probe.provider})` : ""} · {formatTime(data.probe.checked_at)}
              </p>
            )}
            {data.providers.length === 0 ? (
              <p className="text-xs app-text-muted">{label("Chưa có nhà cung cấp nào được báo cáo.", "No providers reported.")}</p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {data.providers.map((p) => (
                  <li key={p.name} className="rounded-md border app-border p-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold app-text-main uppercase">{p.name}</span>
                      {p.configured ? (
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${STATUS_STYLE[p.status] ?? STATUS_STYLE.unknown}`}>
                          {statusText(p.status)}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded border text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                          {label("Chưa cấu hình", "Not configured")}
                        </span>
                      )}
                    </div>
                    <p className="app-text-muted">{label("Lần thành công gần nhất", "Last success")}: {formatTime(p.last_ok_at)}</p>
                    <p className="app-text-muted">
                      {label("Thành công / lỗi", "Success / failures")}: <span className="font-mono">{p.ok_count} / {p.fail_count}</span>
                    </p>
                    {p.last_error_code && (
                      <p className="app-text-muted">{label("Lỗi gần nhất", "Last error")}: <span className="font-mono">{p.last_error_code}</span></p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default AiProvidersCard;
