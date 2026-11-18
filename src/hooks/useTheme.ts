import { useContext } from "react";
import { ThemeContext, type ThemeContextType } from "@/context/themeContextDef";

/** Hook lấy theme hiện tại từ `ThemeContext`; ném lỗi nếu dùng ngoài `ThemeProvider`. */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export type { Theme, ThemeContextType } from "@/context/themeContextDef";
