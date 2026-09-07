import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { setLanguage } from "@/i18n";
import { VietnamFlag, UKFlag } from "./FlagIcons";
import { FiChevronDown } from "react-icons/fi";

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { t: translate, i18n } = useTranslation();
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const lang = i18n.resolvedLanguage === "en" ? "en" : "vi";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        langDropdownRef.current &&
        !langDropdownRef.current.contains(e.target as Node)
      ) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={langDropdownRef} className={`relative group py-0.5 ${className || ""}`}>
      {/* Hidden select for accessibility & automated tests (e.g. getByRole('combobox')) */}
      <select
        aria-label={translate("Chọn ngôn ngữ")}
        value={lang}
        onChange={(event) => void setLanguage(event.target.value === "en" ? "en" : "vi")}
        className="sr-only"
        tabIndex={-1}
      >
        <option value="vi">Tiếng Việt</option>
        <option value="en">English</option>
      </select>

      {/* Flag Trigger Button matching Client Web Design */}
      <button
        type="button"
        onClick={() => setIsLangOpen((prev) => !prev)}
        className="flex items-center gap-1.5 text-xs font-medium hover:opacity-90 transition-all app-bg-card hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1.5 rounded-md active:scale-95 cursor-pointer border border-slate-200 dark:border-slate-800 shadow-xs"
        title={translate("Ngôn ngữ")}
        aria-label={translate("Chọn ngôn ngữ")}
      >
        {lang === "vi" ? (
          <VietnamFlag className="w-5 h-5" />
        ) : (
          <UKFlag className="w-5 h-5" />
        )}
        <FiChevronDown
          className={`w-3 h-3 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${
            isLangOpen ? "rotate-180" : "group-hover:rotate-180"
          }`}
        />
      </button>

      {/* Flag Hover / Click Dropdown Menu */}
      <div
        className={`absolute right-0 top-full pt-1.5 w-36 transition-all duration-200 z-50 origin-top-right ${
          isLangOpen
            ? "opacity-100 pointer-events-auto translate-y-0 scale-100"
            : "opacity-0 pointer-events-none -translate-y-1 scale-95 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:scale-100"
        }`}
      >
        <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 shadow-xl space-y-1 animate-in zoom-in-95">
          <button
            type="button"
            onClick={() => {
              void setLanguage("vi");
              setIsLangOpen(false);
            }}
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors w-full text-left cursor-pointer ${
              lang === "vi"
                ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold"
                : "app-text-main hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <VietnamFlag className="w-4 h-4" />
            <span>Tiếng Việt</span>
          </button>

          <button
            type="button"
            onClick={() => {
              void setLanguage("en");
              setIsLangOpen(false);
            }}
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors w-full text-left cursor-pointer ${
              lang === "en"
                ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold"
                : "app-text-main hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <UKFlag className="w-4 h-4" />
            <span>English</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default LanguageSwitcher;
