import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, Compass, ArrowRight, LayoutDashboard, ArrowLeft } from "lucide-react";
import { Button } from "@/components/common/Button";
import { PATHS } from "@/routes/paths";

export type NotFoundVariant = "public" | "admin";

interface NotFoundActionsProps {
  variant?: NotFoundVariant;
}

/**
 * Cụm nút điều hướng của trang 404:
 * - `public`: quay về trang chủ hoặc khám phá sự kiện.
 * - `admin`: quay về trang quản trị hoặc quay lại trang trước.
 */
export const NotFoundActions: React.FC<NotFoundActionsProps> = ({ variant = "public" }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (variant === "admin") {
    return (
      <div className="mt-6 sm:mt-7 flex w-full max-w-xs sm:max-w-none flex-col sm:flex-row items-center justify-center gap-3 sm:gap-3.5">
        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={() => navigate(PATHS.ADMIN_DASHBOARD)}
          icon={<LayoutDashboard className="h-4 w-4" aria-hidden="true" />}
          className="group w-full sm:w-auto min-h-[46px] px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0a1438] motion-reduce:transform-none"
        >
          <span>{t("Về trang quản trị")}</span>
          <ArrowRight
            className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none"
            aria-hidden="true"
          />
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => navigate(-1)}
          icon={
            <ArrowLeft
              className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transform-none"
              aria-hidden="true"
            />
          }
          className="group w-full sm:w-auto min-h-[46px] px-6 rounded-xl border border-slate-300/90 bg-white/90 text-slate-800 hover:bg-white hover:border-slate-400 hover:-translate-y-0.5 dark:border-slate-500/60 dark:bg-slate-900/45 dark:text-slate-100 dark:hover:bg-slate-800/70 dark:hover:border-slate-400/70 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0a1438] motion-reduce:transform-none"
        >
          <span>{t("Quay lại trang trước")}</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-6 sm:mt-7 flex w-full max-w-xs sm:max-w-none flex-col sm:flex-row items-center justify-center gap-3 sm:gap-3.5">
      <Button
        type="button"
        variant="primary"
        size="lg"
        onClick={() => navigate(PATHS.HOME)}
        icon={<Home className="h-4 w-4" aria-hidden="true" />}
        className="group w-full sm:w-auto min-h-[46px] px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0a1438] motion-reduce:transform-none"
      >
        <span>{t("Về trang chủ")}</span>
        <ArrowRight
          className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none"
          aria-hidden="true"
        />
      </Button>

      <Button
        type="button"
        variant="secondary"
        size="lg"
        onClick={() => navigate(PATHS.EVENTS)}
        icon={<Compass className="h-4 w-4" aria-hidden="true" />}
        className="group w-full sm:w-auto min-h-[46px] px-6 rounded-xl border border-slate-300/90 bg-white/90 text-slate-800 hover:bg-white hover:border-slate-400 hover:-translate-y-0.5 dark:border-slate-500/60 dark:bg-slate-900/45 dark:text-slate-100 dark:hover:bg-slate-800/70 dark:hover:border-slate-400/70 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0a1438] motion-reduce:transform-none"
      >
        <span>{t("Khám phá sự kiện")}</span>
        <ArrowRight
          className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none"
          aria-hidden="true"
        />
      </Button>
    </div>
  );
};

export default NotFoundActions;
