import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { PATHS } from "@/routes/paths";
import { useTheme } from "@/context/ThemeContext";
import SearchOverlayModal from "./SearchOverlayModal";
import {
  FiSearch,
  FiPlus,
  FiChevronDown,
  FiChevronRight,
  FiMenu,
  FiX,
  FiMoon,
  FiSun
} from "react-icons/fi";
import {
  LuTicket,
  LuGem,
  LuCalendarDays,
  LuChartColumn,
  LuBuilding2,
  LuLogOut
} from "react-icons/lu";

function VietnamFlag({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`rounded-full shrink-0 shadow-sm ${className}`}>
      <circle cx="16" cy="16" r="16" fill="#DA251D" />
      <polygon
        points="16,7.5 18.5,13.2 24.5,13.8 20,17.8 21.4,23.7 16,20.5 10.6,23.7 12,17.8 7.5,13.8 13.5,13.2"
        fill="#FFFF00"
      />
    </svg>
  );
}

function UKFlag({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`rounded-full shrink-0 shadow-sm ${className}`}>
      <circle cx="16" cy="16" r="16" fill="#00247D" />
      <path d="M0,0 L32,32 M32,0 L0,32" stroke="#FFFFFF" strokeWidth="4" />
      <path d="M0,0 L32,32 M32,0 L0,32" stroke="#CF142B" strokeWidth="2" />
      <path d="M16,0 V32 M0,16 H32" stroke="#FFFFFF" strokeWidth="6" />
      <path d="M16,0 V32 M0,16 H32" stroke="#CF142B" strokeWidth="3.5" />
    </svg>
  );
}

export const Header: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return Boolean(
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("user")
    );
  });
  const [currentLang, setCurrentLang] = useState<"vi" | "en">("vi");
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
  };

  useEffect(() => {
    const checkAuth = () => {
      setIsLoggedIn(
        Boolean(
          localStorage.getItem("token") ||
          localStorage.getItem("accessToken") ||
          localStorage.getItem("user")
        )
      );
    };

    checkAuth();
    window.addEventListener("storage", checkAuth);
    return () => window.removeEventListener("storage", checkAuth);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const categories = [
    { label: "Nhạc sống", path: "/category/music" },
    { label: "Sân khấu & Nghệ thuật", path: "/category/stage" },
    { label: "Thể thao", path: "/category/sports" },
    { label: "Hội thảo & Workshop", path: "/category/workshop" },
    { label: "Tham quan & Trải nghiệm", path: "/category/experience" },
    { label: "Khác", path: "/category/others" },
    { label: "Vé bán lại", path: "/resale-ticket", isResale: true },
    { label: "Blog", path: "/blog" }
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to={PATHS.HOME} className="flex items-center gap-2 shrink-0 group">
            <span className="font-heading font-bold text-2xl text-primary tracking-tight group-hover:opacity-80 transition-opacity">
              HaloTicket
            </span>
          </Link>

          {/* Search Bar - Center */}
          <div ref={searchContainerRef} className="hidden md:flex flex-1 max-w-xl items-center relative">
            <div className={`relative w-full transition-all duration-200 ${searchFocused || isSearchOpen ? "scale-[1.02]" : ""}`}>
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                placeholder="Bạn tìm gì hôm nay?"
                className="w-full h-10 pl-10 pr-24 rounded-full border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all text-foreground"
                onFocus={() => {
                  setSearchFocused(true);
                  setIsSearchOpen(true);
                }}
                onBlur={() => setSearchFocused(false)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!isSearchOpen) setIsSearchOpen(true);
                }}
              />
              <button
                type="button"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="absolute right-1 top-1 bottom-1 px-4 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 active:scale-95 transition-all cursor-pointer"
              >
                Tìm kiếm
              </button>
            </div>

            {/* Interactive Search Overlay Modal Popover */}
            <SearchOverlayModal
              isOpen={isSearchOpen}
              onClose={() => setIsSearchOpen(false)}
              searchQuery={searchQuery}
              onSelectKeyword={(kw) => setSearchQuery(kw)}
            />
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <Link
              to="/organizer/create-event"
              className="hidden lg:inline-flex items-center justify-center gap-2 h-9 px-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 text-sm font-semibold shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <FiPlus className="h-4 w-4 stroke-[2.5]" />
              <span>Tạo sự kiện</span>
            </Link>

            <Link
              to={PATHS.MY_TICKETS}
              className="hidden lg:flex items-center gap-2 text-sm font-medium hover:text-primary active:scale-95 transition-all px-3 py-2 rounded-lg hover:bg-primary/5 text-foreground"
            >
              <LuTicket className="h-4 w-4 text-primary" />
              <span>Vé của tôi</span>
            </Link>

            <div className="h-6 w-px bg-border hidden lg:block"></div>

            {/* Auth Dropdown (Ảnh 1) */}
            {isLoggedIn ? (
              <div className="relative group">
                <button
                  type="button"
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
                >
                  <span className="w-5 h-5 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-[10px]">
                    M
                  </span>
                  <span>Tài khoản</span>
                  <FiChevronDown className="w-3.5 h-3.5 opacity-80 group-hover:rotate-180 transition-transform" />
                </button>

                {/* Account Hover Dropdown Menu */}
                <div className="absolute right-0 top-full pt-2 w-56 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 z-50">
                  <div className="bg-card border border-border rounded-2xl p-2 shadow-2xl space-y-1 text-foreground animate-in zoom-in-95">
                    {/* Customer section */}
                    <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Cá nhân
                    </div>
                    <Link
                      to={PATHS.MY_TICKETS}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-secondary text-xs font-medium transition-colors"
                    >
                      <LuTicket className="w-4 h-4 text-emerald-600" />
                      <span>Vé của tôi</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => alert("Chương trình Thẻ thành viên HaloTicket VIP")}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-secondary text-xs font-medium transition-colors w-full text-left cursor-pointer"
                    >
                      <LuGem className="w-4 h-4 text-amber-500" />
                      <span>Thẻ thành viên</span>
                    </button>

                    <div className="my-1 border-t border-border" />

                    {/* Organizer section */}
                    <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Ban Tổ Chức
                    </div>

                    <Link
                      to="/organizer/events"
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-secondary text-xs font-medium transition-colors"
                    >
                      <LuCalendarDays className="w-4 h-4 text-blue-500" />
                      <span>Quản lý sự kiện</span>
                    </Link>

                    <Link
                      to="/organizer/reports"
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-secondary text-xs font-medium transition-colors"
                    >
                      <LuChartColumn className="w-4 h-4 text-indigo-500" />
                      <span>Báo cáo doanh thu</span>
                    </Link>

                    <Link
                      to="/organizer/account"
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-secondary text-xs font-medium transition-colors"
                    >
                      <LuBuilding2 className="w-4 h-4 text-purple-500" />
                      <span>Hồ sơ Ban tổ chức</span>
                    </Link>

                    <div className="my-1 border-t border-border" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-600 text-xs font-medium transition-colors w-full text-left cursor-pointer"
                    >
                      <LuLogOut className="w-4 h-4" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link
                to={PATHS.LOGIN}
                className="hidden sm:flex text-sm font-medium hover:text-primary transition-colors whitespace-nowrap px-3 py-2 rounded-lg hover:bg-primary/5 cursor-pointer text-foreground"
              >
                Đăng nhập <span className="text-muted-foreground font-normal mx-1">|</span> Đăng ký
              </Link>
            )}

            {/* Language Flag Dropdown (Ảnh 2) */}
            <div className="flex items-center gap-1.5">
              <div className="relative group">
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-sm font-medium hover:opacity-90 transition-all bg-secondary/60 hover:bg-secondary px-2.5 py-1.5 rounded-xl active:scale-95 cursor-pointer text-foreground"
                  title="Ngôn ngữ"
                >
                  {currentLang === "vi" ? (
                    <VietnamFlag className="w-5 h-5" />
                  ) : (
                    <UKFlag className="w-5 h-5" />
                  )}
                  <FiChevronDown className="w-3 h-3 text-muted-foreground group-hover:rotate-180 transition-transform" />
                </button>

                {/* Flag Hover Menu */}
                <div className="absolute right-0 top-full pt-2 w-40 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 z-50">
                  <div className="bg-card border border-border rounded-2xl p-1.5 shadow-2xl space-y-1 text-foreground animate-in zoom-in-95">
                    <button
                      type="button"
                      onClick={() => setCurrentLang("vi")}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors w-full text-left cursor-pointer ${
                        currentLang === "vi" ? "bg-primary/10 text-primary font-bold" : "hover:bg-secondary"
                      }`}
                    >
                      <VietnamFlag className="w-5 h-5" />
                      <span>Tiếng Việt</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrentLang("en")}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors w-full text-left cursor-pointer ${
                        currentLang === "en" ? "bg-primary/10 text-primary font-bold" : "hover:bg-secondary"
                      }`}
                    >
                      <UKFlag className="w-5 h-5" />
                      <span>English</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Theme Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/60 hover:bg-secondary text-foreground transition-colors cursor-pointer"
                aria-label="Tắt/Mở Chế độ Tối"
                title={isDark ? "Chuyển sang Chế độ Sáng" : "Chuyển sang Chế độ Tối"}
              >
                {isDark ? <FiSun className="h-4 w-4 text-amber-400" /> : <FiMoon className="h-4 w-4 text-slate-700" />}
              </button>

              {/* Mobile menu toggle */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl hover:bg-secondary transition-colors text-foreground cursor-pointer"
                aria-label="Mở menu"
              >
                {mobileMenuOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background px-4 py-4 space-y-3 animate-in slide-in-from-top-2">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Bạn tìm gì hôm nay?"
                className="w-full h-10 pl-10 pr-3 rounded-lg border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <Link
              to="/organizer/create-event"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm active:scale-98 transition-all"
            >
              <FiPlus className="h-4 w-4 stroke-[2.5]" /> Tạo sự kiện mới
            </Link>

            <div className="space-y-1 pt-1">
              <Link
                to={PATHS.MY_TICKETS}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 text-xs font-semibold py-2 px-2 hover:bg-secondary rounded-lg transition-colors text-foreground"
              >
                <LuTicket className="h-4 w-4 text-emerald-600" /> Vé của tôi
              </Link>
              <Link
                to="/organizer/events"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 text-xs font-semibold py-2 px-2 hover:bg-secondary rounded-lg transition-colors text-foreground"
              >
                <LuCalendarDays className="h-4 w-4 text-blue-500" /> Quản lý sự kiện
              </Link>
              <Link
                to="/organizer/reports"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 text-xs font-semibold py-2 px-2 hover:bg-secondary rounded-lg transition-colors text-foreground"
              >
                <LuChartColumn className="h-4 w-4 text-indigo-500" /> Báo cáo doanh thu
              </Link>
              <Link
                to="/organizer/account"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 text-xs font-semibold py-2 px-2 hover:bg-secondary rounded-lg transition-colors text-foreground"
              >
                <LuBuilding2 className="h-4 w-4 text-purple-500" /> Hồ sơ Ban tổ chức
              </Link>
            </div>

            {isLoggedIn ? (
              <button
                type="button"
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 text-xs font-semibold py-2 px-2 text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors text-left w-full cursor-pointer"
              >
                <LuLogOut className="h-4 w-4" /> Đăng xuất
              </button>
            ) : (
              <Link
                to={PATHS.LOGIN}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-xs font-semibold py-2 px-2 text-primary hover:bg-primary/10 rounded-lg transition-colors text-left w-full cursor-pointer"
              >
                Đăng nhập | Đăng ký
              </Link>
            )}
          </div>
        )}

        {/* Subnav: CategoryNav matching HaloTicket_Clone */}
        <nav className="bg-secondary/30 border-t border-border hidden md:block">
          <div className="container mx-auto px-4 h-12 flex items-center justify-between">
            <ul className="flex items-center gap-6 overflow-x-auto no-scrollbar">
              {categories.map((cat) => {
                const isActive = location.pathname === cat.path;
                return (
                  <li key={cat.label} className="shrink-0">
                    <Link
                      to={cat.path}
                      className={`text-sm font-medium transition-colors whitespace-nowrap ${
                        cat.isResale
                          ? "text-rose-500 hover:text-rose-600 font-semibold"
                          : isActive
                          ? "text-primary font-bold"
                          : "text-muted-foreground hover:text-primary"
                      }`}
                    >
                      {cat.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              className="shrink-0 ml-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors text-muted-foreground cursor-pointer"
              aria-label="Xem thêm danh mục"
            >
              <FiChevronRight className="h-5 w-5" />
            </button>
          </div>
        </nav>
      </header>
    </>
  );
};

export default Header;
