import { FiUsers } from "react-icons/fi";
import type { NotificationItem } from "@/types";
import { categoryLabels, isInternalNotification, isOrganizer } from "./notificationMeta";
import type { Label } from "./useLabel";

/** Biểu tượng nhỏ cạnh nhãn nguồn: ô "H" cho HaloTicket, biểu tượng nhóm người cho BTC. */
export function SourceGlyph({ item }: { item: NotificationItem }) {
  return isOrganizer(item)
    ? <FiUsers className="size-3.5 shrink-0" aria-hidden="true" />
    : <span className="grid size-3.5 shrink-0 place-items-center rounded-[3px] bg-blue-600 text-[9px] font-black leading-none text-white" aria-hidden="true">H</span>;
}

/** Huy hiệu danh mục dành riêng cho quảng bá để người nhận phân biệt ngay. */
export function PromotionBadge({ item, label }: { item: NotificationItem; label: Label }) {
  if (!isOrganizer(item) || item.category !== "PROMOTION") return null;
  return <span className="w-fit rounded px-1.5 py-0.5 text-[10px] font-semibold bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">{label(...categoryLabels.PROMOTION)}</span>;
}

/** Huy hiệu dành riêng cho thông báo nội bộ (nhân sự sự kiện). */
export function InternalBadge({ item, label }: { item: NotificationItem; label: Label }) {
  if (!isInternalNotification(item)) return null;
  return <span className="w-fit rounded px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">{label(...categoryLabels.INTERNAL)}</span>;
}
