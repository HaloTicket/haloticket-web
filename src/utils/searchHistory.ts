const SEARCH_HISTORY_KEY = "haloticket_search_history";

export const getSearchHistory = (): string[] => {
  try {
    const data = localStorage.getItem(SEARCH_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const addSearchHistory = (term: string) => {
  if (!term || !term.trim()) return;
  const history = getSearchHistory();
  const trimmed = term.trim();
  const filtered = history.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
  const updated = [trimmed, ...filtered].slice(0, 6);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
};

export const removeSearchHistoryItem = (term: string) => {
  const history = getSearchHistory();
  const updated = history.filter((item) => item.toLowerCase() !== term.toLowerCase());
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
};

export const clearSearchHistory = () => {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
};
