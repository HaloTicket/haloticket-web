import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FiAlertTriangle, FiRefreshCw } from "react-icons/fi";
import { eventApi } from "@/services/eventApi";

export interface TicketsSync {
  status?: "SYNCED" | "FAILED" | "UNAVAILABLE" | string | null;
  error?: string | null;
  syncedAt?: string | null;
}

interface Props {
  eventId: string;
  ticketsSync?: TicketsSync | null;
  // called after a successful resync so the caller can refresh the event
  onResynced: () => void;
}

// visible warning while the ticket types are not (known to be) synced, with a real "Sync again" action
export function TicketsSyncBanner({ eventId, ticketsSync, onResynced }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const status = ticketsSync?.status;
  const needsSync = status === "FAILED" || status === "UNAVAILABLE";

  const resync = async () => {
    if (busy) return;
    setBusy(true);
    setResult(null);
    try {
      await eventApi.resyncTickets(eventId);
      setResult("success");
      onResynced();
    } catch {
      setResult("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div aria-live="polite" data-testid="tickets-sync-region">
      {result === "success" && <p role="status" className="mb-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">{t("tickets.sync.resyncSuccess")}</p>}
      {needsSync && (
        <div role="alert" className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100 sm:flex-row sm:items-center">
          <FiAlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold">{t("tickets.sync.warningTitle")}</p>
            <p className="text-xs">{status === "UNAVAILABLE" ? t("tickets.sync.unavailableBody") : t("tickets.sync.warningBody")}</p>
            {result === "error" && <p role="alert" className="mt-1 text-xs font-bold text-rose-700 dark:text-rose-300">{t("tickets.sync.resyncFailed")}</p>}
          </div>
          <button
            type="button"
            onClick={resync}
            disabled={busy}
            aria-busy={busy}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 text-xs font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FiRefreshCw className={`h-4 w-4 ${busy ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />
            {busy ? t("tickets.sync.resyncing") : t("tickets.sync.resync")}
          </button>
        </div>
      )}
    </div>
  );
}

export default TicketsSyncBanner;
