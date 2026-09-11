import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ekycApi } from "@/services/ekycApi";
import { PATHS } from "@/routes/paths";
import { FiShield, FiRefreshCw, FiArrowLeft, FiCheck } from "react-icons/fi";

export default function OrganizerEligibilityGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"loading" | "allowed" | "denied" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    ekycApi
      .getOrganizerEligibility()
      .then((result) => {
        if (active) setState(result.eligible ? "allowed" : "denied");
      })
      .catch(() => {
        if (active) setState("error");
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  if (state === "allowed") return <>{children}</>;

  return (
    <section className="app-bg-card app-text-main app-border mx-auto my-12 max-w-xl space-y-6 rounded-3xl border p-6 sm:p-8 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
          <FiShield className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight">
            Xác minh danh tính trước khi tạo sự kiện
          </h1>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
            VNPT eKYC
          </span>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border app-border text-xs sm:text-sm app-text-muted leading-relaxed">
        <p role={state === "error" ? "alert" : "status"} className={state === "error" ? "text-rose-600 font-semibold" : ""}>
          {state === "loading"
            ? "Đang kiểm tra quyền tạo sự kiện…"
            : state === "error"
            ? "Không thể kiểm tra quyền tạo sự kiện. Vui lòng thử lại."
            : "Hoàn tất xác minh danh tính trước khi tạo sự kiện."}
        </p>
      </div>

      <div className="space-y-2 text-xs text-slate-500 dark:text-zinc-400 border-t app-border pt-4">
        <div className="flex items-center gap-2">
          <FiCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Xác minh danh tính trước khi tạo sự kiện.</span>
        </div>
        <div className="flex items-center gap-2">
          <FiCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Tài khoản thụ hưởng cần được xác minh riêng trước khi nhận tiền giải ngân.</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <Link
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border app-border text-xs font-semibold app-text-muted hover:app-text-main hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          to={PATHS.PROFILE}
        >
          <FiArrowLeft className="w-3.5 h-3.5" />
          <span>Về hồ sơ</span>
        </Link>

        {state === "denied" && (
          <Link
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-11 rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-3 font-bold text-white text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all cursor-pointer"
            to={`${PATHS.EKYC}?returnUrl=${encodeURIComponent(PATHS.CREATE_EVENT)}`}
          >
            <span>Xác minh ngay</span>
          </Link>
        )}

        {state === "error" && (
          <button
            type="button"
            className="w-full sm:w-auto min-h-11 rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-2.5 font-bold text-white text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all cursor-pointer inline-flex items-center justify-center gap-2"
            onClick={() => {
              setState("loading");
              setAttempt((value) => value + 1);
            }}
          >
            <FiRefreshCw className="w-3.5 h-3.5" />
            <span>Thử lại</span>
          </button>
        )}
      </div>
    </section>
  );
}
