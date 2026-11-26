import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { FiCheck, FiMail, FiMoreHorizontal, FiTrash2 } from "react-icons/fi";
import { useLabel } from "./useLabel";

export interface NotificationActionMenuProps {
  title: string;
  onMarkRead?: () => void;
  onMarkUnread?: () => void;
  onDelete?: () => void;
  disabled?: boolean;
}

/**
 * Menu "…" của một thông báo, nơi duy nhất chứa thao tác đọc/chưa đọc và xóa. Hỗ trợ bàn phím: mũi tên di chuyển,
 * Esc đóng menu và trả focus về nút (không đóng bảng chứa nó), bấm ra ngoài thì đóng.
 */
export function NotificationActionMenu({ title, onMarkRead, onMarkUnread, onDelete, disabled }: NotificationActionMenuProps) {
  const { label } = useLabel();
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  if (!onMarkRead && !onMarkUnread && !onDelete) return null;

  const toggle = () => {
    if (!open) {
      const boundary = trigger.current?.closest("[data-menu-boundary]")?.getBoundingClientRect().bottom ?? window.innerHeight;
      setUp(boundary - (trigger.current?.getBoundingClientRect().bottom ?? 0) < 110);
    }
    setOpen((value) => !value);
  };
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const items = [...(menu.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
    const current = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1
      : (current + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  };
  const itemClass = "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[12px] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

  return (
    <div ref={root} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={trigger}
        type="button"
        className="grid size-8 place-items-center rounded-full app-text-muted hover:bg-slate-200/70 dark:hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={`${label("Thao tác", "Actions")}: ${title}`}
        disabled={disabled}
        onClick={toggle}
      >
        <FiMoreHorizontal aria-hidden="true" />
      </button>
      {open && (
        <div
          ref={menu}
          id={id}
          role="menu"
          aria-label={`${label("Thao tác", "Actions")}: ${title}`}
          className={`absolute right-0 z-30 w-48 rounded-lg border app-border app-bg-card p-1 shadow-xl ${up ? "bottom-full mb-1" : "top-full mt-1"}`}
        >
          {onMarkRead && (
            <button type="button" role="menuitem" className={`${itemClass} app-text-main hover:bg-slate-100 dark:hover:bg-slate-800`} onClick={() => { close(); onMarkRead(); }}>
              <FiCheck aria-hidden="true" />{label("Đánh dấu đã đọc", "Mark as read")}
            </button>
          )}
          {onMarkUnread && (
            <button type="button" role="menuitem" className={`${itemClass} app-text-main hover:bg-slate-100 dark:hover:bg-slate-800`} onClick={() => { close(); onMarkUnread(); }}>
              <FiMail aria-hidden="true" />{label("Đánh dấu chưa đọc", "Mark as unread")}
            </button>
          )}
          {onDelete && (
            <button type="button" role="menuitem" className={`${itemClass} text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10`} onClick={() => { close(); onDelete(); }}>
              <FiTrash2 aria-hidden="true" />{label("Xóa thông báo", "Delete notification")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
