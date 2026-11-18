import React, { useEffect, useState } from "react";
import { ThemeContext, type Theme } from "./themeContextDef";

/** Cung cấp chủ đề giao diện (sáng, tối, theo hệ thống): lưu lựa chọn ở `localStorage` (khóa `halo_theme`) và bật/tắt lớp `dark` trên thẻ gốc. */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem("halo_theme") as Theme | null;
    return saved || "system";
  });

  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    const root = document.documentElement;

    /** Cập nhật trạng thái tối và thêm/bỏ lớp `dark` trên `document.documentElement`. */
    const applyTheme = (isDarkTheme: boolean) => {
      setIsDark(isDarkTheme);
      if (isDarkTheme) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mediaQuery.matches);

      /** Áp dụng lại chủ đề khi cài đặt màu của hệ điều hành thay đổi. */
      const handleChange = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else {
      applyTheme(theme === "dark");
    }
  }, [theme]);

  /** Đặt chủ đề mới và lưu vào `localStorage`. */
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("halo_theme", newTheme);
  };

  /** Chuyển qua lại giữa sáng và tối dựa trên trạng thái hiển thị hiện tại. */
  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
