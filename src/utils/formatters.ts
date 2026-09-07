import { getLocale } from "@/i18n";
// Vietnamese currency format: 150000 -> 150,000 ₫
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

export const parseVndAmount = (value: unknown): number | undefined => {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim().replace(/^(?:Từ|From)\s+/i, "");
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);

  const legacyDigits = trimmed.replace(/(?:VND|₫|đ|\s|[,.])/gi, "");
  return /^\d+$/.test(legacyDigits) ? Number(legacyDigits) : undefined;
};

export const formatLegacyVietnameseDate = (value: string): string | undefined => {
  const match = value.match(/^(\d{1,2})\s+tháng\s+(\d{1,2}),\s*(\d{4})$/i);
  if (!match) return undefined;

  const [, day, month, year] = match;
  return new Intl.DateTimeFormat(getLocale(), { dateStyle: "medium" })
    .format(new Date(Number(year), Number(month) - 1, Number(day)));
};

// Vietnamese date format: 2026-10-15T08:30:00 -> 08:30 - 15/10/2026
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(getLocale(), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

// Formats date string for HTML <input type="datetime-local">
export const formatDatetimeLocal = (dateStr?: string): string => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr.slice(0, 16);
    const pad = (n: number) => n.toString().padStart(2, "0");
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return dateStr.slice(0, 16);
  }
};
