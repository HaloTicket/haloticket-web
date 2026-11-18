import { createContext } from "react";

/** Các chủ đề giao diện: sáng, tối hoặc theo hệ thống. */
export type Theme = "light" | "dark" | "system";

/** Giá trị của context chủ đề: chủ đề đã chọn, cờ đang tối, hàm đặt chủ đề và hàm chuyển sáng/tối. */
export interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
