import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import {
  FiCheckCircle,
  FiAlertTriangle,
  FiXCircle,
  FiSearch,
  FiClock,
  FiX,
  FiHash,
  FiRefreshCw,
  FiWifiOff,
} from "react-icons/fi";
import { TablePagination } from "@/components/common/TablePagination";
import { eventApi } from "@/services/eventApi";
import type { CheckinLookupItem, CheckinPage, CheckinSummary, CheckinSummaryGroup } from "@/types/checkin";
import { outcomeFromError, outcomeFromQueue, outcomeFromResponse, type CheckinOutcome, type CheckinTone } from "./checkinResult";
import { giveCheckinFeedback } from "./checkinFeedback";
import { createCheckinQueue, flushCheckinQueue, isRetryableError } from "./checkinQueue";
import { ScannerPanel } from "./ScannerPanel";

const SUMMARY_POLL_MS = 5000;
const QUEUE_RETRY_MS = 15000;
const SEARCH_DEBOUNCE_MS = 400;
const SEARCH_MIN_CHARS = 2;

const TONE_STYLES: Record<CheckinTone, { box: string; icon: string; Icon: React.ElementType }> = {
  success: {
    box: "bg-green-50 dark:bg-green-950/40 border-green-300 dark:border-green-800 text-green-800 dark:text-green-200",
    icon: "text-green-600 dark:text-green-400",
    Icon: FiCheckCircle,
  },
  warning: {
    box: "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200",
    icon: "text-amber-600 dark:text-amber-400",
    Icon: FiAlertTriangle,
  },
  error: {
    box: "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-800 dark:text-red-200",
    icon: "text-red-600 dark:text-red-400",
    Icon: FiXCircle,
  },
};

function percent(done: number, total: number): number {
  return total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
}

function showtimeLabel(show: Record<string, unknown>, index: number): string {
  const raw = (show.startTime ?? show.fullDateTime ?? show.startDateTime) as string | undefined;
  const date = raw ? new Date(raw) : null;
  if (date && !Number.isNaN(date.getTime())) return date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
  return `#${index + 1}`;
}

const ProgressBar: React.FC<{ done: number; total: number; label: string }> = ({ done, total, label }) => (
  <div
    role="progressbar"
    aria-label={label}
    aria-valuemin={0}
    aria-valuemax={total}
    aria-valuenow={done}
    className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"
  >
    <div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${percent(done, total)}%` }} />
  </div>
);

export const EventCheckin: React.FC = () => {
  const { t } = useTranslation();
  const { eventId } = useParams<{ eventId: string }>();
  const [code, setCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [outcome, setOutcome] = useState<CheckinOutcome | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // door counter
  const [summary, setSummary] = useState<CheckinSummary | null>(null);
  const [summaryFailed, setSummaryFailed] = useState(false);

  // who already entered: one server page at a time
  const [page, setPage] = useState<CheckinPage | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [showtimeFilter, setShowtimeFilter] = useState("");
  const [showtimeNames, setShowtimeNames] = useState<Record<string, string>>({});
  const [listError, setListError] = useState(false);

  // search for a ticket by order, ticket code, seat or type
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<CheckinLookupItem[] | null>(null);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);

  // scans that could not reach the server
  const queue = useMemo(() => createCheckinQueue(), []);
  const [queued, setQueued] = useState(() => (eventId ? queue.size(eventId) : 0));
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const syncingRef = useRef(false);

  const loadSummary = useCallback(async () => {
    if (!eventId) return;
    try {
      setSummary(await eventApi.getCheckinSummary(eventId));
      setSummaryFailed(false);
    } catch {
      setSummaryFailed(true);
    }
  }, [eventId]);

  const loadPage = useCallback(async () => {
    if (!eventId) return;
    try {
      setPage(await eventApi.getCheckinPage(eventId, { showtimeId: showtimeFilter || undefined, page: pageIndex, size: pageSize }));
      setListError(false);
    } catch {
      setListError(true);
    }
  }, [eventId, showtimeFilter, pageIndex, pageSize]);

  // the counter refreshes every few seconds, and only while the tab is visible
  useEffect(() => {
    if (!eventId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads from the server; the state is set after the answer arrives
    void loadSummary();
    const tick = () => { if (!document.hidden) void loadSummary(); };
    const timer = window.setInterval(tick, SUMMARY_POLL_MS);
    const onVisible = () => { if (!document.hidden) void loadSummary(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [eventId, loadSummary]);

  // the list follows the counter: another gate let someone in, so the list reloads
  const enteredCount = summary?.checkedIn;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads from the server; the state is set after the answer arrives
    void loadPage();
  }, [loadPage, enteredCount]);

  // names for the showtime filter
  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    eventApi.getEventById(eventId)
      .then((event) => {
        const shows = (event?.showtimes as Array<Record<string, unknown>> | undefined) ?? [];
        const names: Record<string, string> = {};
        shows.forEach((show, index) => { if (typeof show.id === "string") names[show.id] = showtimeLabel(show, index); });
        if (!cancelled) setShowtimeNames(names);
      })
      .catch(() => { /* the filter then shows short ids */ });
    return () => { cancelled = true; };
  }, [eventId]);

  const refreshQueued = useCallback(() => setQueued(eventId ? queue.size(eventId) : 0), [eventId, queue]);

  const flushQueue = useCallback(async () => {
    if (!eventId || syncingRef.current || queue.size(eventId) === 0) return;
    syncingRef.current = true;
    try {
      const result = await flushCheckinQueue(queue, eventId, (item) => eventApi.checkinTicket(eventId, item.qrCodeHash, item.showtimeId ?? undefined));
      refreshQueued();
      const entered = result.results.filter((r) => !r.error && outcomeFromResponse(r.body as never).code === "SUCCESS").length;
      const refused = result.results.length - entered;
      if (result.results.length > 0) {
        setSyncNote(t("Đã đồng bộ {{total}} lượt quét: {{entered}} vào cổng, {{refused}} bị từ chối hoặc đã dùng.", { total: result.results.length, entered, refused }));
        void loadSummary();
      }
    } finally {
      syncingRef.current = false;
    }
  }, [eventId, queue, refreshQueued, loadSummary, t]);

  useEffect(() => {
    void flushQueue();
    const onOnline = () => { void flushQueue(); };
    window.addEventListener("online", onOnline);
    const timer = window.setInterval(() => { void flushQueue(); }, QUEUE_RETRY_MS);
    return () => {
      window.removeEventListener("online", onOnline);
      window.clearInterval(timer);
    };
  }, [flushQueue]);

  const submitScan = useCallback(async (raw: string) => {
    const hash = raw.trim();
    if (!hash || !eventId || isScanning) return;
    setIsScanning(true);
    let result: CheckinOutcome;
    try {
      const body = await eventApi.checkinTicket(eventId, hash);
      result = outcomeFromResponse(body);
    } catch (e) {
      result = isRetryableError(e) ? outcomeFromQueue(queue.add(eventId, hash)) : outcomeFromError(e);
      refreshQueued();
    }
    setOutcome(result);
    giveCheckinFeedback(result.tone);
    setCode("");
    if (result.tone === "success") {
      void loadSummary();
      void loadPage();
    }
    setIsScanning(false);
    codeInputRef.current?.focus();
  }, [eventId, isScanning, queue, refreshQueued, loadSummary, loadPage]);

  // search with a short delay so typing does not call the server for every key
  useEffect(() => {
    const q = searchText.trim();
    if (!eventId || q.length < SEARCH_MIN_CHARS) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearchBusy(true);
      try {
        const found = await eventApi.searchCheckinTickets(eventId, q, { showtimeId: showtimeFilter || undefined });
        if (!cancelled) { setSearchResults(found); setSearchFailed(false); }
      } catch {
        if (!cancelled) { setSearchResults(null); setSearchFailed(true); }
      } finally {
        if (!cancelled) setSearchBusy(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [searchText, eventId, showtimeFilter]);

  // an answer for an older, longer text is not shown once the text is too short to search
  const searching = searchText.trim().length >= SEARCH_MIN_CHARS;
  const shownResults = searching ? searchResults : null;
  const tone = outcome ? TONE_STYLES[outcome.tone] : null;
  const total = summary?.total ?? 0;
  const entered = summary?.checkedIn ?? 0;
  const rows = page?.content ?? [];
  const totalPages = Math.max(1, page?.totalPages ?? 1);

  const groupName = (group: CheckinSummaryGroup, kind: "showtime" | "type", index: number) =>
    kind === "type" ? group.name || t("Khác") : (group.id && showtimeNames[group.id]) || `${t("Suất")} ${index + 1}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Counter */}
      <div className="app-bg-card border app-border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-xs app-text-muted">{t("Đã vào cổng / tổng số vé hợp lệ")}</p>
            <p className="text-3xl font-black app-text-main leading-tight" aria-live="polite">
              {summary ? <>{entered} <span className="text-lg font-bold app-text-muted">/ {total}</span></> : "—"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {queued > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                <FiWifiOff className="w-3.5 h-3.5" />
                {t("{{n}} lượt quét chờ đồng bộ", { n: queued })}
                <button
                  type="button"
                  onClick={() => void flushQueue()}
                  aria-label={t("Gửi lại ngay")}
                  className="ml-1 p-0.5 rounded hover:bg-amber-100 dark:hover:bg-amber-900/60 cursor-pointer"
                >
                  <FiRefreshCw className="w-3.5 h-3.5" />
                </button>
              </span>
            )}
            {summaryFailed && (
              <span role="alert" className="text-[11px] font-bold text-red-600 dark:text-red-400">{t("Không cập nhật được số liệu")}</span>
            )}
          </div>
        </div>
        <ProgressBar done={entered} total={total} label={t("Tiến độ check-in")} />

        {summary && (summary.byShowtime.length > 1 || summary.byTicketType.length > 1) && (
          <div className="grid gap-4 md:grid-cols-2 pt-1">
            {summary.byShowtime.length > 1 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider app-text-muted">{t("Theo suất diễn")}</p>
                {summary.byShowtime.map((g, i) => (
                  <div key={g.id ?? `s${i}`} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium app-text-main">
                      <span className="truncate pr-2">{groupName(g, "showtime", i)}</span>
                      <span className="shrink-0">{g.checkedIn}/{g.total}</span>
                    </div>
                    <ProgressBar done={g.checkedIn} total={g.total} label={groupName(g, "showtime", i)} />
                  </div>
                ))}
              </div>
            )}
            {summary.byTicketType.length > 1 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider app-text-muted">{t("Theo hạng vé")}</p>
                {summary.byTicketType.map((g, i) => (
                  <div key={g.id ?? `t${i}`} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium app-text-main">
                      <span className="truncate pr-2">{groupName(g, "type", i)}</span>
                      <span className="shrink-0">{g.checkedIn}/{g.total}</span>
                    </div>
                    <ProgressBar done={g.checkedIn} total={g.total} label={groupName(g, "type", i)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scan */}
      <div className="app-bg-card border app-border rounded-2xl p-5 shadow-xs space-y-4">
        <p className="text-xs app-text-muted">{t("Quét mã QR bằng camera hoặc nhập mã vé (máy quét mã cầm tay cũng nhập vào ô này) rồi nhấn Enter.")}</p>

        <ScannerPanel onScan={(c) => void submitScan(c)} busy={isScanning} />

        <form
          className="flex items-center gap-2 app-bg-card border app-border rounded-xl p-1.5 shadow-xs max-w-xl w-full"
          onSubmit={(e) => { e.preventDefault(); void submitScan(code); }}
        >
          <div className="flex items-center gap-2 flex-1 pl-3 min-w-0">
            <FiHash className="w-4 h-4 text-zinc-400 shrink-0" />
            <input
              ref={codeInputRef}
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isScanning}
              autoComplete="off"
              aria-label={t("Mã vé cần check-in")}
              placeholder={t("Nhập hoặc quét mã vé để Check-in")}
              className="w-full bg-transparent app-text-main text-sm focus:outline-none placeholder-zinc-400 font-medium"
            />
          </div>
          <button
            type="submit"
            disabled={isScanning || !code.trim()}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0"
          >
            {isScanning ? t("Đang kiểm tra...") : t("Check-in")}
          </button>
        </form>

        {syncNote && (
          <p role="status" className="text-xs font-medium text-blue-700 dark:text-blue-300">{syncNote}</p>
        )}

        {outcome && tone && (
          <div
            role="status"
            aria-live="polite"
            className={`relative rounded-2xl border-2 p-4 sm:p-5 flex items-start gap-4 ${tone.box}`}
          >
            <tone.Icon className={`w-10 h-10 sm:w-12 sm:h-12 shrink-0 ${tone.icon}`} />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-lg sm:text-xl font-black leading-tight">{t(outcome.title)}</p>
              <p className="text-xs sm:text-sm font-medium opacity-90">{t(outcome.detail)}</p>
              {(outcome.ticketTypeName || outcome.seatName || outcome.checkedInAt) && (
                <dl className="pt-1 flex flex-wrap gap-x-5 gap-y-1 text-xs font-bold">
                  {outcome.ticketTypeName && (
                    <div><dt className="inline opacity-70">{t("Hạng vé")}: </dt><dd className="inline">{outcome.ticketTypeName}</dd></div>
                  )}
                  {outcome.seatName && (
                    <div><dt className="inline opacity-70">{t("Vị trí ghế")}: </dt><dd className="inline">{outcome.seatName}</dd></div>
                  )}
                  {outcome.checkedInAt && (
                    <div><dt className="inline opacity-70">{t("Đã vào lúc")}: </dt><dd className="inline">{new Date(outcome.checkedInAt).toLocaleString("vi-VN")}</dd></div>
                  )}
                </dl>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOutcome(null)}
              aria-label={t("Đóng")}
              className="shrink-0 p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Find a guest */}
      <div className="app-bg-card border app-border rounded-2xl p-5 shadow-xs space-y-3">
        <div>
          <p className="text-sm font-bold app-text-main">{t("Tìm khách")}</p>
          <p className="text-xs app-text-muted">{t("Khi khách không có mã QR: tìm theo mã vé, mã đơn, ghế hoặc hạng vé (từ 2 ký tự). Thông tin khách được che bớt.")}</p>
        </div>
        <div className="flex items-center gap-2 app-bg-card border app-border rounded-xl px-3 py-2 max-w-md w-full">
          <FiSearch className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            aria-label={t("Tìm khách để check-in")}
            placeholder={t("Mã vé, mã đơn, ghế hoặc hạng vé...")}
            className="w-full bg-transparent app-text-main text-xs focus:outline-none placeholder-zinc-400 font-medium"
          />
        </div>
        {searching && searchBusy && <p className="text-xs app-text-muted">{t("Đang tìm...")}</p>}
        {searching && searchFailed && <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">{t("Không tìm được. Thử lại sau.")}</p>}
        {shownResults && !searchBusy && shownResults.length === 0 && (
          <p className="text-xs app-text-muted italic">{t("Không có vé nào khớp.")}</p>
        )}
        {shownResults && shownResults.length > 0 && (
          <ul className="space-y-2">
            {shownResults.map((r) => (
              <li key={r.ticketId} className="rounded-xl border app-border p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-xs font-black app-text-main">
                    {r.shortCode}
                    {r.ownerMasked ? <span className="ml-2 font-medium app-text-muted">{r.ownerMasked}</span> : null}
                  </p>
                  <p className="text-xs app-text-muted">
                    {[r.ticketTypeName, r.seatName].filter(Boolean).join(" · ") || t("Không có")}
                  </p>
                </div>
                {r.checkedIn ? (
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                    {t("Đã vào")}{r.checkedInAt ? ` ${new Date(r.checkedInAt).toLocaleString("vi-VN")}` : ""}
                  </span>
                ) : r.qrCodeHash ? (
                  <button
                    type="button"
                    disabled={isScanning}
                    onClick={() => void submitScan(r.qrCodeHash as string)}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    {t("Check-in")}
                  </button>
                ) : (
                  <span className="text-[11px] font-bold app-text-muted">{t("Không thể check-in")} ({r.ticketStatus})</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Who entered */}
      <div className="app-bg-card border app-border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold app-text-main">{t("Danh sách đã check-in")}</p>
          {Object.keys(showtimeNames).length > 1 && (
            <select
              value={showtimeFilter}
              onChange={(e) => { setShowtimeFilter(e.target.value); setPageIndex(0); }}
              aria-label={t("Lọc theo suất diễn")}
              className="app-bg-card border app-border rounded-lg px-3 py-1.5 text-xs app-text-main"
            >
              <option value="">{t("Tất cả suất diễn")}</option>
              {Object.entries(showtimeNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          )}
        </div>
        {listError && <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">{t("Không tải được danh sách.")}</p>}

        {/* Phones and small tablets: one card per check-in */}
        <ul className="md:hidden space-y-2">
          {rows.map((c) => (
            <li key={c.checkinId ?? c.qrCodeHash} className="rounded-xl border app-border p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold border border-blue-200 dark:border-blue-900">
                  {c.ticketTypeName}
                </span>
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <FiClock className="w-3.5 h-3.5" />
                  {new Date(c.checkedInAt).toLocaleString("vi-VN")}
                </span>
              </div>
              <p className="text-xs font-black text-blue-600 dark:text-blue-400 break-all" title={c.qrCodeHash}>{c.qrCodeHash?.substring(0, 15)}...</p>
              <p className="text-xs app-text-muted">{t("Vị trí ghế")}: {c.seatName || t("Không có")}</p>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="py-6 text-center text-xs app-text-muted italic">{t("Chưa có lượt check-in nào phù hợp.")}</li>
          )}
        </ul>

        {/* Tablets and desktops: table. Every row is a completed check-in, so there is no status column. */}
        <div className="hidden md:block overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs table-fixed border-collapse">
            <thead>
              <tr className="border-b app-border app-text-muted font-bold text-[11px] uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/30">
                <th className="py-3 px-4 w-[30%] rounded-l-xl">{t("Mã vé (Hash)")}</th>
                <th className="py-3 px-4 w-[25%]">{t("Hạng vé")}</th>
                <th className="py-3 px-4 w-[20%]">{t("Vị trí ghế")}</th>
                <th className="py-3 px-4 w-[25%] rounded-r-xl">{t("Giờ Check-in")}</th>
              </tr>
            </thead>
            <tbody className="text-xs app-text-main">
              {rows.map((c) => (
                <tr key={c.checkinId ?? c.qrCodeHash} className="hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors rounded-xl">
                  <td className="py-3.5 px-4 font-black text-blue-600 dark:text-blue-400 rounded-l-xl truncate" title={c.qrCodeHash}>
                    {c.qrCodeHash?.substring(0, 15)}...
                  </td>
                  <td className="py-3.5 px-4 font-bold app-text-main">
                    <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold border border-blue-200 dark:border-blue-900 inline-block">
                      {c.ticketTypeName}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-medium app-text-muted">
                    {c.seatName || t("Không có")}
                  </td>
                  <td className="py-3.5 px-4 font-medium app-text-muted rounded-r-xl">
                    <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                      <FiClock className="w-3.5 h-3.5" />
                      {new Date(c.checkedInAt).toLocaleString("vi-VN")}
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center app-text-muted italic">
                    {t("Chưa có lượt check-in nào phù hợp.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={pageIndex + 1}
          totalPages={totalPages}
          totalItems={page?.totalElements ?? 0}
          pageSize={pageSize}
          onPageChange={(next) => setPageIndex(next - 1)}
          onPageSizeChange={(size) => { setPageSize(size); setPageIndex(0); }}
        />
      </div>
    </div>
  );
};

export default EventCheckin;
