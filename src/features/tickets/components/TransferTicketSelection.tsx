/* eslint-disable react-refresh/only-export-components */
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ticketApi } from "@/services/ticketApi";
import type { OwnedTicketApiResponse } from "@/types/ticket";

export function transferCandidates(tickets: OwnedTicketApiResponse[], anchorId: string) {
  const anchor = tickets.find(ticket => ticket.id === anchorId);
  if (!anchor) return [];
  const order = anchor.bookingId || anchor.bookingCode;
  return tickets.filter(ticket => ticket.status === "VALID" && ticket.eventId === anchor.eventId
    && (ticket.showtimeId || null) === (anchor.showtimeId || null)
    && (order ? (ticket.bookingId || ticket.bookingCode) === order : ticket.id === anchorId));
}

export function useTransferTickets(anchorId: string) {
  const { t } = useTranslation();
  const [tickets, setTickets] = useState<OwnedTicketApiResponse[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([anchorId]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    // Reset request state when the selected order changes or a fetch is retried.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError("");
    ticketApi.getMyTickets().then(all => {
      if (!active) return;
      const eligible = transferCandidates(all, anchorId);
      setTickets(eligible);
      setSelectedIds(eligible.some(ticket => ticket.id === anchorId) ? [anchorId] : []);
    }).catch(() => active && setError(t("Không thể tải vé trong đơn hàng. Vui lòng thử lại.")))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [anchorId, revision, t]);
  const changeSelection = useCallback((ids: string[]) => setSelectedIds(ids.slice(0, 50)), []);
  return { tickets, selectedIds, setSelectedIds: changeSelection,
    selectedTickets: tickets.filter(ticket => selectedIds.includes(ticket.id)),
    loading, error, retry: () => setRevision(value => value + 1) };
}

export function TransferTicketSelection({ tickets, selectedIds, onChange }: {
  tickets: OwnedTicketApiResponse[]; selectedIds: string[]; onChange: (ids: string[]) => void;
}) {
  const { t } = useTranslation();
  const groups = new Map<string, OwnedTicketApiResponse[]>();
  for (const ticket of tickets) {
    const key = ticket.ticketTypeId || ticket.ticketTypeName || t("Vé");
    groups.set(key, [...(groups.get(key) || []), ticket]);
  }
  const toggle = (ids: string[], checked: boolean) => onChange(checked
    ? [...new Set([...selectedIds, ...ids])].slice(0, 50) : selectedIds.filter(id => !ids.includes(id)));
  return <section aria-label={t("Chọn vé")} className="space-y-3">
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-sm font-semibold app-text-main">{t("Chọn vé")}</h3>
      <span className="text-xs app-text-muted" aria-live="polite">{t("Đã chọn {{selected}}/{{total}} vé", { selected: selectedIds.length, total: tickets.length })}</span>
    </div>
    {tickets.length === 0 && <p className="text-sm app-text-muted">{t("Không còn vé có thể chuyển nhượng trong đơn hàng này.")}</p>}
    {[...groups].map(([group, members]) => {
      const ids = members.map(ticket => ticket.id);
      const name = members[0].ticketTypeName || t("Vé");
      const count = ids.filter(id => selectedIds.includes(id)).length;
      return <div key={group} className="overflow-hidden rounded-xl border app-border">
        <div className="flex items-center justify-between gap-3 border-b app-border app-bg-page px-4 py-2">
          <p className="text-sm font-semibold app-text-main">{name} <span className="font-normal app-text-muted">· {count}/{ids.length}</span></p>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs app-text-muted">
            {t("Chọn tất cả")}
            <input type="checkbox" aria-label={t("Chọn tất cả {{name}}", { name })} checked={count === ids.length}
              ref={element => { if (element) element.indeterminate = count > 0 && count < ids.length; }}
              onChange={event => toggle(ids, event.target.checked)} className="h-5 w-5 accent-blue-600" />
          </label>
        </div>
        <div className="divide-y app-border">
          {members.map(ticket => {
            const seat = ticket.seatName || [ticket.row, ticket.seatNumber].filter(Boolean).join(" · ") || ticket.id.slice(0, 8).toUpperCase();
            return <label key={ticket.id} className={`flex min-h-20 cursor-pointer items-center gap-4 px-4 py-3 ${selectedIds.includes(ticket.id) ? "app-bg-page" : "app-bg-card"}`}>
              <div className="min-w-0 flex-1 text-xs leading-6 app-text-muted">
                <p>{t("Khu vực:")} <span className="app-text-main">{ticket.section || name}</span></p>
                <p>{ticket.seatName || ticket.seatNumber ? t("Hàng / ghế") : t("Mã vé")}: <span className="font-medium app-text-main">{seat}</span></p>
              </div>
              <input type="checkbox" aria-label={t("Chọn vé {{seat}}", { seat })} checked={selectedIds.includes(ticket.id)}
                onChange={event => toggle([ticket.id], event.target.checked)} className="h-5 w-5 shrink-0 accent-blue-600" />
            </label>;
          })}
        </div>
      </div>;
    })}
    {tickets.length > 50 && <p className="text-xs app-text-muted">{t("Mỗi lần chọn tối đa 50 vé.")}</p>}
  </section>;
}
