import { useEffect, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/common/Button";
import { adminUserApi } from "@/services/adminUserApi";
import { eventApi } from "@/services/eventApi";
import type { AnnouncementAudience } from "@/services/notificationApi";

export type RecipientOption = { id: string; label: string; detail?: string };

const pageSize = 8;
const fieldClass = "w-full rounded-lg border app-border app-bg-card px-3 py-2.5 text-sm app-text-main focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

interface PickerProps {
  kind: Exclude<AnnouncementAudience["kind"], "ALL">;
  selected: RecipientOption | null;
  onSelect: (option: RecipientOption) => void;
  disabled: boolean;
}

export function AnnouncementRecipientPicker({ kind, selected, onSelect, disabled }: PickerProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [users, setUsers] = useState<{ key: string; options: RecipientOption[]; totalPages: number }>();
  const [events, setEvents] = useState<RecipientOption[]>();
  const [failedKey, setFailedKey] = useState<string>();
  const search = query.trim();
  const key = JSON.stringify([search, page, attempt]);
  const isUser = kind === "USER";

  useEffect(() => {
    if (!isUser) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const data = await adminUserApi.getUsers({ query: search || undefined, status: "ACTIVE", page: page + 1, size: pageSize }); // /users/admin is 1-based; UI state stays 0-based
        if (!cancelled) setUsers({
          key,
          options: data.content.map((user) => ({ id: user.id, label: user.fullName || user.email, detail: user.email })),
          totalPages: data.totalPages,
        });
      } catch {
        if (!cancelled) setFailedKey(key);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [isUser, key, page, search]);

  useEffect(() => {
    if (isUser) return;
    let cancelled = false;
    // The existing admin approvals API includes events in every state and returns a single list.
    eventApi.getApprovalEvents().then((items) => {
      if (cancelled) return;
      setEvents(items.flatMap((item) => typeof item.id === "string" && typeof item.title === "string"
        ? [{ id: item.id, label: item.title, detail: typeof item.organizerName === "string" ? item.organizerName : undefined }]
        : []));
    }).catch(() => { if (!cancelled) setFailedKey(`events:${attempt}`); });
    return () => { cancelled = true; };
  }, [isUser, attempt]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return events?.filter((event) => `${event.label} ${event.detail ?? ""} ${event.id}`.toLocaleLowerCase().includes(needle));
  }, [events, query]);
  const userPage = users?.key === key ? users : undefined;
  const options = isUser ? userPage?.options : filtered?.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = (isUser ? userPage?.totalPages : Math.ceil((filtered?.length ?? 0) / pageSize)) ?? 0;
  const failed = failedKey === (isUser ? key : `events:${attempt}`);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold app-text-main" htmlFor={inputId}>{t(isUser ? "Tìm người dùng" : "Tìm sự kiện")}</label>
      <input
        id={inputId}
        type="search"
        className={fieldClass}
        placeholder={t(isUser ? "Nhập tên hoặc email" : "Nhập tên sự kiện")}
        value={query}
        disabled={disabled}
        onChange={(event) => { setQuery(event.target.value); setPage(0); }}
      />
      {selected && <p className="wrap-anywhere text-sm app-text-brand">{t("Đã chọn người nhận")} <strong>{selected.label}</strong>{selected.detail && selected.detail !== selected.label && ` · ${selected.detail}`}</p>}
      <div className="rounded-lg border app-border app-bg-subnav">
        {failed ? (
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm text-rose-700 dark:text-rose-300" role="alert">
            {t("Không thể tải danh sách người nhận.")}
            <Button type="button" variant="ghost" size="sm" onClick={() => setAttempt((value) => value + 1)}>{t("Thử lại")}</Button>
          </div>
        ) : !options ? <p className="p-3 text-sm app-text-muted" role="status">{t("Đang tải người nhận…")}</p>
          : !options.length ? <p className="p-3 text-sm app-text-muted">{t("Không tìm thấy người nhận phù hợp.")}</p>
            : <ul className="divide-y divide-slate-200 dark:divide-slate-700">
              {options.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    className="flex min-h-10 w-full flex-wrap items-center gap-x-2 px-3 py-2 text-left text-sm app-text-main hover:bg-blue-500/10 aria-pressed:bg-blue-500/10 disabled:opacity-60"
                    aria-pressed={selected?.id === option.id}
                    disabled={disabled}
                    onClick={() => onSelect(option)}
                  >
                    <span className="wrap-anywhere font-medium">{option.label}</span>
                    {option.detail && option.detail !== option.label && <span className="wrap-anywhere text-xs app-text-muted">{option.detail}</span>}
                  </button>
                </li>
              ))}
            </ul>}
        {totalPages > 1 && <div className="flex flex-wrap items-center justify-between gap-2 border-t app-border px-2 py-1 text-xs app-text-muted">
          <Button type="button" variant="ghost" size="sm" disabled={disabled || page === 0} onClick={() => setPage(page - 1)}>{t("Trang trước")}</Button>
          <span>{page + 1} / {totalPages}</span>
          <Button type="button" variant="ghost" size="sm" disabled={disabled || page + 1 >= totalPages} onClick={() => setPage(page + 1)}>{t("Trang sau")}</Button>
        </div>}
      </div>
    </div>
  );
}
