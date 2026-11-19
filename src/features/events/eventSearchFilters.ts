import type { EventApiData } from "@/types";
import { parseVndAmount } from "@/utils/formatters";

/** Lựa chọn nhanh của bộ lọc ngày; `custom` dùng khoảng ngày do người dùng nhập. */
export type DatePreset = "all" | "today" | "tomorrow" | "weekend" | "month" | "custom";

/** Cách sắp xếp kết quả; `relevance` giữ nguyên thứ tự đầu vào (thứ tự AI hoặc thứ tự API). */
export type SortKey = "relevance" | "soonest" | "priceAsc" | "priceDesc";

/** Giá trị "không lọc" của thành phố và danh mục, dùng làm khóa logic độc lập với ngôn ngữ hiển thị. */
export const ANY = "";

/** Thành phố "khác": sự kiện không thuộc các thành phố có tên sẵn trong danh sách lọc. */
export const CITY_OTHER = "other";

/** Các thành phố có tên sẵn trong bộ lọc và các cách gọi (đã bỏ dấu, chữ thường) dùng để nhận ra thành phố trong địa chỉ. */
export const CITY_ALIASES: Record<string, string[]> = {
  "Hồ Chí Minh": ["ho chi minh", "hcm", "tp.hcm", "tphcm", "sai gon", "saigon", "sg"],
  "Hà Nội": ["ha noi", "hanoi", "hn"],
  "Đà Lạt": ["da lat", "dalat"],
};

/** Toàn bộ bộ lọc của trang tìm kiếm; lưu trên URL để chia sẻ, tải lại và dùng nút Back được. */
export interface SearchFilters {
  city: string;
  category: string;
  date: DatePreset;
  from: string;
  to: string;
  free: boolean;
  sort: SortKey;
}

/** Bộ lọc mặc định (không lọc gì). */
export const DEFAULT_FILTERS: SearchFilters = { city: ANY, category: ANY, date: "all", from: "", to: "", free: false, sort: "relevance" };

const DATE_PRESETS: DatePreset[] = ["all", "today", "tomorrow", "weekend", "month", "custom"];
const SORT_KEYS: SortKey[] = ["relevance", "soonest", "priceAsc", "priceDesc"];

/**
 * Đọc bộ lọc từ tham số URL; giá trị lạ bị bỏ qua. Chấp nhận cả `city` và `location` (liên kết điểm đến ở trang chủ dùng `location`).
 *
 * @param params - Tham số truy vấn của URL.
 * @returns Bộ lọc đã chuẩn hóa.
 */
export function parseFilters(params: URLSearchParams): SearchFilters {
  const date = params.get("date") as DatePreset | null;
  const sort = params.get("sort") as SortKey | null;
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  const validDate = date && DATE_PRESETS.includes(date) ? date : from || to ? "custom" : "all";
  return {
    city: params.get("city") || params.get("location") || ANY,
    category: params.get("category") || ANY,
    date: validDate,
    from: validDate === "custom" ? from : "",
    to: validDate === "custom" ? to : "",
    free: params.get("free") === "1",
    sort: sort && SORT_KEYS.includes(sort) ? sort : "relevance",
  };
}

/**
 * Ghi bộ lọc vào một bản sao của tham số URL: giá trị mặc định thì bỏ khóa cho URL gọn; các tham số khác (như `q`, `ai`) giữ nguyên.
 *
 * @param base - Tham số URL hiện tại.
 * @param filters - Bộ lọc cần ghi.
 * @returns Tham số URL mới.
 */
export function applyFiltersToParams(base: URLSearchParams, filters: SearchFilters): URLSearchParams {
  const next = new URLSearchParams(base);
  for (const key of ["city", "location", "category", "date", "from", "to", "free", "sort"]) next.delete(key);
  if (filters.city !== ANY) next.set("city", filters.city);
  if (filters.category !== ANY) next.set("category", filters.category);
  if (filters.date !== "all") next.set("date", filters.date);
  if (filters.date === "custom") {
    if (filters.from) next.set("from", filters.from);
    if (filters.to) next.set("to", filters.to);
  }
  if (filters.free) next.set("free", "1");
  if (filters.sort !== "relevance") next.set("sort", filters.sort);
  return next;
}

/** Số bộ lọc đang bật (không tính sắp xếp), dùng để hiện nút "Xóa bộ lọc". */
export function activeFilterCount(filters: SearchFilters): number {
  return (filters.city !== ANY ? 1 : 0) + (filters.category !== ANY ? 1 : 0) + (filters.date !== "all" ? 1 : 0) + (filters.free ? 1 : 0);
}

/** Bỏ dấu, đưa về chữ thường để so khớp không phân biệt dấu và hoa thường ("Hà Nội" khớp "ha noi"). */
export function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase();
}

/**
 * Đổi giá trị ngày từ API (chuỗi ISO, mảng số kiểu Java hoặc `Date`) thành `Date`.
 *
 * @param value - Giá trị ngày thô.
 * @returns Ngày hợp lệ hoặc `null`.
 */
export function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (Array.isArray(value) && value.length >= 3) {
    const d = new Date(Number(value[0]), Number(value[1]) - 1, Number(value[2]), Number(value[3]) || 0, Number(value[4]) || 0);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 0 giờ của ngày chứa `date` theo giờ địa phương. */
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Cộng `days` ngày vào `date` (theo lịch địa phương). */
function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Đổi chuỗi `YYYY-MM-DD` của ô nhập ngày thành 0 giờ địa phương của ngày đó; sai định dạng trả `null`. */
function parseDateInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Khoảng thời gian [bắt đầu, kết thúc) của một lựa chọn ngày. Cuối tuần là thứ Bảy và Chủ nhật sắp tới;
 * nếu hôm nay là thứ Bảy hoặc Chủ nhật thì là chính cuối tuần đang diễn ra.
 *
 * @param filters - Bộ lọc (dùng `date`, `from`, `to`).
 * @param now - Thời điểm hiện tại.
 * @returns Khoảng thời gian, hoặc `null` nếu không lọc ngày (hoặc khoảng tùy chọn trống).
 */
export function getDateRange(filters: Pick<SearchFilters, "date" | "from" | "to">, now: Date): { start: Date | null; end: Date | null } | null {
  const today = startOfDay(now);
  switch (filters.date) {
    case "today":
      return { start: today, end: addDays(today, 1) };
    case "tomorrow":
      return { start: addDays(today, 1), end: addDays(today, 2) };
    case "weekend": {
      const day = today.getDay(); // 0 = Chủ nhật
      const saturday = day === 0 ? addDays(today, -1) : addDays(today, 6 - day);
      return { start: saturday, end: addDays(saturday, 2) };
    }
    case "month":
      return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: new Date(today.getFullYear(), today.getMonth() + 1, 1) };
    case "custom": {
      const start = parseDateInput(filters.from);
      const toDay = parseDateInput(filters.to);
      if (!start && !toDay) return null;
      return { start, end: toDay ? addDays(toDay, 1) : null };
    }
    default:
      return null;
  }
}

/** Giá thấp nhất trong các hạng vé và suất diễn của sự kiện (bỏ vé ẩn); `undefined` khi dữ liệu không có thông tin vé. */
export function getTicketsMinPrice(event: Record<string, unknown>): number | undefined {
  const prices: number[] = [];
  const take = (ticket: unknown) => {
    const t = ticket as Record<string, unknown> | null;
    if (!t || t.status === "HIDDEN" || t.ticketTypeStatus === "HIDDEN") return;
    const raw = typeof t.price === "number" ? t.price : parseVndAmount((t.price ?? t.priceValue) as string | number | undefined);
    if (typeof raw === "number" && !Number.isNaN(raw)) prices.push(raw);
  };
  const tickets = (event.tickets || event.ticketTypes) as unknown;
  if (Array.isArray(tickets)) tickets.forEach(take);
  if (Array.isArray(event.showtimes)) {
    (event.showtimes as Record<string, unknown>[]).forEach((st) => {
      if (Array.isArray(st.tickets)) (st.tickets as unknown[]).forEach(take);
    });
  }
  return prices.length > 0 ? Math.min(...prices) : undefined;
}

/** Giá thấp nhất của sự kiện để lọc "miễn phí" và sắp xếp: ưu tiên giá từ hạng vé, rồi `minPrice`, rồi `price`; `undefined` nếu chưa biết. */
export function getEventMinPrice(event: EventApiData): number | undefined {
  const fromTickets = getTicketsMinPrice(event as Record<string, unknown>);
  if (fromTickets !== undefined) return fromTickets;
  const parsed = parseVndAmount((event.minPrice ?? event.price) as string | number | undefined);
  return typeof parsed === "number" && !Number.isNaN(parsed) ? parsed : undefined;
}

/**
 * Kiểm tra sự kiện có thuộc thành phố được chọn không, so không dấu và nhận các cách gọi quen thuộc (HCM, Sài Gòn...).
 * Lựa chọn `other` khớp sự kiện không thuộc thành phố nào có tên sẵn.
 */
export function matchesCity(event: EventApiData, city: string): boolean {
  if (city === ANY) return true;
  const haystack = normalizeText([event.address, event.locationName, event.location, event.city].filter(Boolean).join(" | "));
  const inCity = (name: string): boolean => {
    const needles = [normalizeText(name), ...(CITY_ALIASES[name] || [])];
    return needles.some((n) => (n.length <= 3 ? new RegExp(`(^|[^a-z])${n.replace(/\./g, "\\.")}([^a-z]|$)`).test(haystack) : haystack.includes(n)));
  };
  if (city === CITY_OTHER) return !Object.keys(CITY_ALIASES).some(inCity);
  return inCity(city);
}

/** Kiểm tra sự kiện khớp từ khóa (không dấu) ở tiêu đề, địa điểm, địa chỉ, danh mục hoặc thành phố. */
export function matchesKeyword(event: EventApiData, query: string): boolean {
  const q = normalizeText(query).trim();
  if (!q) return true;
  return [event.title, event.locationName, event.location, event.address, event.categoryName, event.city].some((field) =>
    normalizeText(field).includes(q)
  );
}

/** Kiểm tra khoảng thời gian diễn ra của sự kiện có giao với khoảng đã chọn không; sự kiện không có ngày bắt đầu thì không khớp. */
export function matchesDateRange(event: EventApiData, range: { start: Date | null; end: Date | null }): boolean {
  const start = toDate(event.startTime);
  if (!start) return false;
  const end = toDate(event.endTime) || start;
  if (range.end && start >= range.end) return false;
  if (range.start && end < range.start) return false;
  return true;
}

/** Tùy chọn khi lọc: từ khóa (bỏ qua khi kết quả đến từ AI), tên danh mục của route và thời điểm hiện tại. */
export interface FilterOptions {
  query?: string;
  routeCategoryName?: string | null;
  now?: Date;
}

/**
 * Lọc và sắp xếp danh sách sự kiện theo bộ lọc. Không đổi mảng đầu vào.
 *
 * @param events - Danh sách sự kiện.
 * @param filters - Bộ lọc đang áp dụng.
 * @param options - Từ khóa, danh mục theo route và thời điểm hiện tại.
 * @returns Danh sách đã lọc và sắp xếp.
 */
export function filterAndSortEvents(events: EventApiData[], filters: SearchFilters, options: FilterOptions = {}): EventApiData[] {
  const now = options.now ?? new Date();
  const range = getDateRange(filters, now);
  const result = events.filter((event) => {
    if (options.query && !matchesKeyword(event, options.query)) return false;
    if (!matchesCity(event, filters.city)) return false;
    if (options.routeCategoryName != null && event.categoryName !== options.routeCategoryName) return false;
    if (filters.category !== ANY && event.categoryName !== filters.category) return false;
    if (filters.free && getEventMinPrice(event) !== 0) return false;
    if (range && !matchesDateRange(event, range)) return false;
    return true;
  });

  if (filters.sort === "soonest") {
    const time = (e: EventApiData) => toDate(e.startTime)?.getTime();
    const nowMs = now.getTime();
    return [...result].sort((a, b) => {
      const ta = time(a);
      const tb = time(b);
      if (ta === undefined && tb === undefined) return 0;
      if (ta === undefined) return 1;
      if (tb === undefined) return -1;
      const fa = ta >= nowMs;
      const fb = tb >= nowMs;
      if (fa !== fb) return fa ? -1 : 1;
      return fa ? ta - tb : tb - ta;
    });
  }
  if (filters.sort === "priceAsc" || filters.sort === "priceDesc") {
    const dir = filters.sort === "priceAsc" ? 1 : -1;
    return [...result].sort((a, b) => {
      const pa = getEventMinPrice(a);
      const pb = getEventMinPrice(b);
      if (pa === undefined && pb === undefined) return 0;
      if (pa === undefined) return 1;
      if (pb === undefined) return -1;
      return (pa - pb) * dir;
    });
  }
  return result;
}
