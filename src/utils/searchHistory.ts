const SEARCH_HISTORY_KEY = "haloticket_search_history";

/** Đọc lịch sử tìm kiếm từ `localStorage`; lỗi hoặc dữ liệu hỏng thì trả về mảng rỗng. */
export const getSearchHistory = (): string[] => {
  try {
    const data = localStorage.getItem(SEARCH_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

/**
 * Thêm một từ khóa vào đầu lịch sử tìm kiếm, bỏ bản trùng (không phân biệt hoa thường) và chỉ giữ 6 từ khóa gần nhất.
 *
 * @param term - Từ khóa; rỗng thì bỏ qua.
 */
export const addSearchHistory = (term: string) => {
  if (!term || !term.trim()) return;
  const history = getSearchHistory();
  const trimmed = term.trim();
  const filtered = history.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
  const updated = [trimmed, ...filtered].slice(0, 6);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
};

/**
 * Xóa một từ khóa khỏi lịch sử tìm kiếm (không phân biệt hoa thường).
 *
 * @param term - Từ khóa cần xóa.
 */
export const removeSearchHistoryItem = (term: string) => {
  const history = getSearchHistory();
  const updated = history.filter((item) => item.toLowerCase() !== term.toLowerCase());
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
};

/** Xóa toàn bộ lịch sử tìm kiếm. */
export const clearSearchHistory = () => {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
};
