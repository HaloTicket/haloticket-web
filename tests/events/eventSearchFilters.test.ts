import { describe, expect, it } from "vitest";
import type { EventApiData } from "../../src/types";
import {
  CITY_OTHER,
  DEFAULT_FILTERS,
  activeFilterCount,
  applyFiltersToParams,
  filterAndSortEvents,
  getDateRange,
  getEventMinPrice,
  matchesCity,
  normalizeText,
  parseFilters,
  type SearchFilters,
} from "../../src/features/events/eventSearchFilters";

const ev = (over: Partial<EventApiData>): EventApiData => ({ id: String(Math.random()), title: "Sự kiện", ...over });
const filters = (over: Partial<SearchFilters> = {}): SearchFilters => ({ ...DEFAULT_FILTERS, ...over });
// Thứ Tư 2026-12-02 10:00 giờ địa phương
const NOW = new Date(2026, 11, 2, 10, 0);

describe("URL và bộ lọc", () => {
  it("đọc bộ lọc, chấp nhận location như city và bỏ qua giá trị lạ", () => {
    const f = parseFilters(new URLSearchParams("location=Hà Nội&category=Nhạc&date=weekend&free=1&sort=priceAsc"));
    expect(f).toMatchObject({ city: "Hà Nội", category: "Nhạc", date: "weekend", free: true, sort: "priceAsc" });
    expect(parseFilters(new URLSearchParams("date=bậy&sort=bậy")).date).toBe("all");
    expect(parseFilters(new URLSearchParams("date=bậy&sort=bậy")).sort).toBe("relevance");
    expect(parseFilters(new URLSearchParams("from=2026-12-01")).date).toBe("custom");
  });

  it("ghi lại chỉ các giá trị khác mặc định, giữ q và ai, bỏ location cũ", () => {
    const base = new URLSearchParams("q=rock&ai=true&location=Hà Nội&sort=soonest");
    const next = applyFiltersToParams(base, filters({ city: "Đà Lạt", free: true }));
    expect(next.get("q")).toBe("rock");
    expect(next.get("ai")).toBe("true");
    expect(next.get("city")).toBe("Đà Lạt");
    expect(next.get("location")).toBeNull();
    expect(next.get("free")).toBe("1");
    expect(next.get("sort")).toBeNull();
    expect(parseFilters(next)).toEqual(filters({ city: "Đà Lạt", free: true }));
  });

  it("đếm bộ lọc đang bật, không tính sắp xếp", () => {
    expect(activeFilterCount(filters({ sort: "priceAsc" }))).toBe(0);
    expect(activeFilterCount(filters({ city: "x", category: "y", date: "today", free: true }))).toBe(4);
  });
});

describe("so khớp", () => {
  it("bỏ dấu và hoa thường", () => {
    expect(normalizeText("Đà Lạt – HÀ NỘI")).toBe("da lat – ha noi");
  });

  it("thành phố nhận các cách gọi quen thuộc và không khớp nhầm chữ viết tắt ngắn", () => {
    expect(matchesCity(ev({ address: "Nhà hát Bến Thành, TP.HCM" }), "Hồ Chí Minh")).toBe(true);
    expect(matchesCity(ev({ locationName: "Sài Gòn Hall" }), "Hồ Chí Minh")).toBe(true);
    expect(matchesCity(ev({ city: "Hà Nội" }), "Hà Nội")).toBe(true);
    expect(matchesCity(ev({ address: "Phan Thiết" }), "Hà Nội")).toBe(false);
    // chữ hn không được khớp bên trong một từ khác
    expect(matchesCity(ev({ address: "Thanh Hóa" }), "Hà Nội")).toBe(false);
    expect(matchesCity(ev({ address: "Cần Thơ" }), CITY_OTHER)).toBe(true);
    expect(matchesCity(ev({ address: "Hà Nội" }), CITY_OTHER)).toBe(false);
  });

  it("lọc từ khóa không dấu", () => {
    const list = [ev({ title: "Đêm nhạc Hoàng Dũng" }), ev({ title: "Kịch Lôi Vũ" })];
    expect(filterAndSortEvents(list, filters(), { query: "hoang dung" })).toHaveLength(1);
    expect(filterAndSortEvents(list, filters(), { query: "kich" })).toHaveLength(1);
  });
});

describe("lọc ngày", () => {
  const range = (date: SearchFilters["date"], extra: Partial<SearchFilters> = {}) => getDateRange(filters({ date, ...extra }), NOW)!;

  it("hôm nay, ngày mai, tháng này", () => {
    expect(range("today")).toEqual({ start: new Date(2026, 11, 2), end: new Date(2026, 11, 3) });
    expect(range("tomorrow")).toEqual({ start: new Date(2026, 11, 3), end: new Date(2026, 11, 4) });
    expect(range("month")).toEqual({ start: new Date(2026, 11, 1), end: new Date(2027, 0, 1) });
  });

  it("cuối tuần: thứ Tư thì là thứ Bảy tới, Chủ nhật thì là chính cuối tuần đó", () => {
    expect(range("weekend")).toEqual({ start: new Date(2026, 11, 5), end: new Date(2026, 11, 7) });
    expect(getDateRange(filters({ date: "weekend" }), new Date(2026, 11, 6, 9))).toEqual({ start: new Date(2026, 11, 5), end: new Date(2026, 11, 7) });
    expect(getDateRange(filters({ date: "weekend" }), new Date(2026, 11, 5, 9))).toEqual({ start: new Date(2026, 11, 5), end: new Date(2026, 11, 7) });
  });

  it("khoảng tùy chọn tính cả ngày cuối; trống thì không lọc", () => {
    expect(range("custom", { from: "2026-12-10", to: "2026-12-12" })).toEqual({ start: new Date(2026, 11, 10), end: new Date(2026, 11, 13) });
    expect(range("custom", { from: "", to: "2026-12-12" })).toEqual({ start: null, end: new Date(2026, 11, 13) });
    expect(getDateRange(filters({ date: "custom" }), NOW)).toBeNull();
    expect(getDateRange(filters({ date: "all" }), NOW)).toBeNull();
  });

  it("sự kiện giao với khoảng thì khớp, sự kiện không có ngày thì loại", () => {
    const list = [
      ev({ title: "today", startTime: "2026-12-02T19:00:00" }),
      ev({ title: "next-week", startTime: "2026-12-10T19:00:00" }),
      ev({ title: "spans-today", startTime: "2026-12-01T10:00:00", endTime: "2026-12-04T22:00:00" }),
      ev({ title: "no-date" }),
    ];
    const names = (f: SearchFilters) => filterAndSortEvents(list, f, { now: NOW }).map((e) => e.title);
    expect(names(filters({ date: "today" }))).toEqual(["today", "spans-today"]);
    expect(names(filters({ date: "custom", from: "2026-12-09", to: "2026-12-11" }))).toEqual(["next-week"]);
    expect(names(filters({ date: "all" }))).toHaveLength(4);
  });

  it("đọc được ngày dạng mảng kiểu Java", () => {
    const list = [ev({ title: "arr", startTime: [2026, 12, 2, 19, 0] as unknown as string })];
    expect(filterAndSortEvents(list, filters({ date: "today" }), { now: NOW })).toHaveLength(1);
  });
});

describe("lọc miễn phí và sắp xếp", () => {
  const list = [
    ev({ title: "free", minPrice: "0", startTime: "2026-12-20T19:00:00" }),
    ev({ title: "cheap", tickets: [{ price: 100000 }, { price: 50000 }], startTime: "2026-12-05T19:00:00" }),
    ev({ title: "pricey", minPrice: "900000", startTime: "2026-12-03T19:00:00" }),
    ev({ title: "unknown", startTime: "2026-11-01T19:00:00" }),
  ];
  const titles = (f: SearchFilters) => filterAndSortEvents(list, f, { now: NOW }).map((e) => e.title);

  it("giá thấp nhất lấy từ hạng vé trước, rồi minPrice", () => {
    expect(getEventMinPrice(list[1])).toBe(50000);
    expect(getEventMinPrice(list[0])).toBe(0);
    expect(getEventMinPrice(list[3])).toBeUndefined();
  });

  it("chỉ giữ sự kiện chắc chắn miễn phí", () => {
    expect(titles(filters({ free: true }))).toEqual(["free"]);
  });

  it("sắp xếp theo giá, sự kiện chưa rõ giá xuống cuối", () => {
    expect(titles(filters({ sort: "priceAsc" }))).toEqual(["free", "cheap", "pricey", "unknown"]);
    expect(titles(filters({ sort: "priceDesc" }))).toEqual(["pricey", "cheap", "free", "unknown"]);
  });

  it("sắp xếp theo ngày: sự kiện sắp tới gần nhất trước, đã qua xuống cuối", () => {
    expect(titles(filters({ sort: "soonest" }))).toEqual(["pricey", "cheap", "free", "unknown"]);
  });

  it("không đổi mảng đầu vào và giữ thứ tự khi sắp xếp theo liên quan", () => {
    const before = list.map((e) => e.title);
    filterAndSortEvents(list, filters({ sort: "priceDesc" }), { now: NOW });
    expect(list.map((e) => e.title)).toEqual(before);
    expect(titles(filters())).toEqual(before);
  });
});

describe("danh mục", () => {
  it("lọc theo tên danh mục và theo danh mục của route", () => {
    const list = [ev({ title: "a", categoryName: "Nhạc" }), ev({ title: "b", categoryName: "Kịch" })];
    expect(filterAndSortEvents(list, filters({ category: "Kịch" })).map((e) => e.title)).toEqual(["b"]);
    expect(filterAndSortEvents(list, filters(), { routeCategoryName: "Nhạc" }).map((e) => e.title)).toEqual(["a"]);
  });
});
