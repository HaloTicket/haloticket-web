import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import {
  FiSearch,
  FiPlus,
  FiCopy,
  FiCheck,
  FiTrash2,
  FiEdit3,
  FiInfo,
  FiTag,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiActivity
} from "react-icons/fi";
import { CreateVoucherModal } from "./components/CreateVoucherModal";
import { TablePagination } from "@/components/common/TablePagination";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { isForbiddenError } from "@/utils/httpError";
import { voucherApi } from "@/services/voucherApi";
import { eventApi } from "@/services/eventApi";
import { aiApi } from "@/services/aiApi";
import { getAiErrorMessage } from "@/utils/aiErrors";
import type { VoucherItem, VoucherCreateData } from "@/types";
import ReactMarkdown from 'react-markdown';

export const EventVouchers: React.FC = () => {
  const { t } = useTranslation();
  const { eventId } = useParams<{ eventId: string }>();

  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingVoucher, setEditingVoucher] = useState<VoucherItem | null>(null);

  // confirm Modal state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "danger" | "warning" | "info" | "primary";
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "warning",
    action: async () => {},
  });

  // toast message state
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "info" | "error" } | null>(null);

  // showtime options extracted from event
  const [showtimeOptions, setShowtimeOptions] = useState<Array<{ id: string; label: string }>>([]);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState(10);

  // AI strategy state
  const [strategyMessage, setStrategyMessage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyzeStrategy = async () => {
    if (!eventId) return;
    setIsAnalyzing(true);
    setStrategyMessage(null);
    try {
      const res = await aiApi.getVoucherStrategy(eventId);
      setStrategyMessage(res.strategy || t("Hệ thống chưa đủ dữ liệu để phân tích."));
    } catch (err) {
      console.error(err);
      // 403: the analysis is not open to this account yet
      const forbidden = (err as { response?: { status?: number } })?.response?.status === 403;
      // any other failure: say what actually happened (rate limit, unavailable, ...), by error code
      showToast(forbidden ? t("Tính năng đang được nâng cấp") : getAiErrorMessage(err), forbidden ? "info" : "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const showToast = (text: string, type: "success" | "info" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // load vouchers & showtimes from backend
  const loadVouchersAndShowtimes = useCallback(async () => {
    if (!eventId) return;
    setIsLoading(true);
    try {
      const [vList, evData] = await Promise.all([
        voucherApi.getVouchersByEvent(eventId),
        eventApi.getEventById(eventId)
      ]);

      setVouchers(vList);

      // derive showtimes from event data if available
        if (evData && Array.isArray(evData.showtimes) && evData.showtimes.length > 0) {
          const options = (evData.showtimes as { id: string; name?: string; startTime: string }[]).map((st, idx) => {
            const displayStr = new Date(st.startTime).toLocaleString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            return {
              id: st.id,
              label: `${t("Suất")} ${idx + 1}: ${st.name || displayStr}`
            };
          });
          setShowtimeOptions(options);
        }
    } catch (err) {
      console.error("Failed to load vouchers from backend:", err);
      showToast(isForbiddenError(err) ? t("Bạn không có quyền xem voucher của sự kiện này") : t("Không thể tải danh sách voucher từ hệ thống"), "error");
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    // deferred one tick: the loader sets state straight away, and doing that inside the effect body triggers a second render
    const timer = setTimeout(() => void loadVouchersAndShowtimes(), 0);
    return () => clearTimeout(timer);
  }, [loadVouchersAndShowtimes]);

  const filteredVouchers = vouchers.filter(
    (v) =>
      (v.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.code || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredVouchers.length / pageSize));
  const paginatedVouchers = filteredVouchers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    showToast(`${t("Đã sao chép mã voucher")} "${code}" ${t("vào bộ nhớ tạm!")}`, "success");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // trigger status toggle confirm modal
  const promptToggleStatus = (voucher: VoucherItem) => {
    const nextStatusText = voucher.isActive ? t("TẮT") : t("BẬT");
    setConfirmState({
      isOpen: true,
      title: `${t("Xác nhận")} ${nextStatusText.toLowerCase()} ${t("mã voucher")}`,
      message: `${t("Bạn có chắc chắn muốn")} ${nextStatusText} ${t("trạng thái hoạt động của mã voucher")} "${voucher.code}" (${voucher.title}) ${t("không?")}`,
      type: voucher.isActive ? "warning" : "primary",
      action: async () => {
        try {
          const updated = await voucherApi.toggleVoucherStatus(voucher.id);
          if (updated) {
            setVouchers((prev) =>
              prev.map((v) => (v.id === voucher.id ? { ...v, status: updated.status, isActive: updated.isActive } : v))
            );
          } else {
            setVouchers((prev) =>
              prev.map((v) => (v.id === voucher.id ? { ...v, isActive: !v.isActive } : v))
            );
          }
          showToast(`${t("Đã")} ${nextStatusText.toLowerCase()} ${t("hoạt động mã voucher thành công!")}`, "success");
        } catch (err) {
          console.error("Failed to toggle status:", err);
          showToast(isForbiddenError(err) ? t("Bạn không có quyền thực hiện thao tác này") : t("Thay đổi trạng thái thất bại"), "error");
        }
      },
    });
  };

  // trigger delete confirm modal
  const promptDeleteVoucher = (voucher: VoucherItem) => {
    setConfirmState({
      isOpen: true,
      title: t("Xác nhận xóa voucher"),
      message: `${t("Bạn có chắc chắn muốn xóa mã voucher")} "${voucher.code}" (${voucher.title}) ${t("không? Hành động này không thể hoàn tác.")}`,
      type: "danger",
      action: async () => {
        try {
          await voucherApi.deleteVoucher(voucher.id);
          setVouchers((prev) => prev.filter((v) => v.id !== voucher.id));
          showToast(t("Đã xóa voucher thành công!"), "success");
        } catch (err) {
          console.error("Failed to delete voucher:", err);
          showToast(isForbiddenError(err) ? t("Bạn không có quyền thực hiện thao tác này") : t("Xóa voucher thất bại"), "error");
        }
      },
    });
  };

  // save new voucher (Single or Bulk)
  const handleCreateVoucher = async (data: VoucherCreateData) => {
    if (!eventId) return;
    try {
      const created = await voucherApi.createVoucher(eventId, data);
      if (created && created.length > 0) {
        setVouchers((prev) => [...created, ...prev]);
        showToast(
          created.length > 1
            ? `${t("Đã tạo thành công")} ${created.length} ${t("mã voucher hàng loạt!")}`
            : `${t("Đã tạo mã voucher")} "${created[0].code}" ${t("thành công!")}`,
          "success"
        );
      } else {
        await loadVouchersAndShowtimes();
      }
    } catch (err) {
      console.error("Failed to create voucher:", err);
      showToast(isForbiddenError(err) ? t("Bạn không có quyền thực hiện thao tác này") : t("Tạo voucher thất bại. Mã có thể đã tồn tại!"), "error");
    }
  };

  // update existing voucher
  const handleUpdateVoucher = async (voucherId: string, data: Partial<VoucherCreateData>) => {
    try {
      const updated = await voucherApi.updateVoucher(voucherId, data);
      if (updated) {
        setVouchers((prev) => prev.map((v) => (v.id === voucherId ? updated : v)));
        showToast(`${t("Cập nhật mã voucher")} "${updated.code}" ${t("thành công!")}`, "success");
      }
    } catch (err) {
      console.error("Failed to update voucher:", err);
      showToast(isForbiddenError(err) ? t("Bạn không có quyền thực hiện thao tác này") : t("Cập nhật voucher thất bại"), "error");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification Banner */}
      {toastMsg && (
        <div
          className={`fixed top-20 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl font-bold text-xs md:text-sm flex items-center gap-3 border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
            toastMsg.type === "success"
              ? "bg-emerald-900/90 text-emerald-100 border-emerald-700 shadow-emerald-950/40"
              : toastMsg.type === "info"
              ? "bg-blue-900/90 text-blue-100 border-blue-700 shadow-blue-950/40"
              : "bg-rose-900/90 text-rose-100 border-rose-700 shadow-rose-950/40"
          }`}
        >
          {toastMsg.type === "success" && <FiCheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toastMsg.type === "error" && <FiAlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* AI Strategy Assistant Box */}
      <div className="bg-linear-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <h3 className="text-sm font-black text-blue-700 dark:text-blue-400 flex items-center gap-2">
              {t("Trợ lý AI Phân tích Chiến lược Voucher")}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              {t("Dựa vào tốc độ bán vé (sale velocity) và hành vi người dùng trong 7 ngày qua, AI sẽ đề xuất chiến lược phát hành voucher (tên, mã, % giảm giá, số lượng) để kích cầu, tối đa hóa doanh thu.")}
            </p>
            {strategyMessage && (
              <div className="mt-3 p-4 bg-white dark:bg-zinc-900 border border-blue-100 dark:border-blue-800/50 rounded-xl">
                <div className="text-xs text-zinc-800 dark:text-zinc-200 prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1">
                  <ReactMarkdown>{strategyMessage.replace(/\*\*/g, '')}</ReactMarkdown>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // Pre-fill the create modal based on suggestion if needed
                      // For now, just open the modal
                      setEditingVoucher(null);
                      setIsCreateModalOpen(true);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all"
                  >
                    {t("Tạo Voucher ngay")}
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleAnalyzeStrategy}
            disabled={isAnalyzing}
            className="px-5 py-2.5 bg-white dark:bg-zinc-800 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-all flex items-center gap-2 shrink-0 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <FiRefreshCw className="w-4 h-4 animate-spin" />
                <span>{t("Đang phân tích dữ liệu...")}</span>
              </>
            ) : (
              <>
                <FiActivity className="w-4 h-4" />
                <span>{t("Phân tích Tốc độ bán vé")}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search & Counter tag */}
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <div className="flex items-center gap-2 app-bg-card border app-border rounded-xl p-1.5 shadow-xs flex-1">
            <div className="flex items-center gap-2 flex-1 pl-3">
              <FiSearch className="w-4 h-4 app-text-muted" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={t("Tìm kiếm theo tên chương trình và mã voucher")}
                className="w-full bg-transparent app-text-main text-xs focus:outline-none placeholder-zinc-400 font-medium"
              />
            </div>
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              <FiSearch className="w-3.5 h-3.5" />
              <span>{t("Tìm kiếm")}</span>
            </button>
          </div>

          <div className="px-3 py-2 rounded-xl app-bg-card border app-border text-xs font-extrabold app-text-main flex items-center gap-1.5 shrink-0 shadow-xs">
            <span>{vouchers.length} {t("mã")}</span>
            <FiInfo className="w-3.5 h-3.5 app-text-muted" />
          </div>
        </div>

        {/* Create Voucher CTA Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadVouchersAndShowtimes}
            className="p-2.5 rounded-xl app-bg-card border app-border app-text-muted hover:app-text-main transition-colors cursor-pointer"
            title={t("Làm mới danh sách")}
          >
            <FiRefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-blue-500" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingVoucher(null);
              setIsCreateModalOpen(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <FiPlus className="w-4 h-4 stroke-3" />
            <span>{t("Tạo voucher")}</span>
          </button>
        </div>
      </div>

      {/* Voucher Table */}
      <div className="app-bg-card border app-border rounded-2xl overflow-hidden shadow-sm p-4 space-y-4">
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <FiRefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
            <p className="text-xs font-bold app-text-muted">{t("Đang tải danh sách voucher từ CSDL...")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b app-border bg-slate-50/50 dark:bg-slate-900/50 text-[11px] font-bold app-text-muted uppercase tracking-wider">
                  <th className="py-3.5 px-6 rounded-l-xl">{t("Tên chương trình khuyến mãi")}</th>
                  <th className="py-3.5 px-4">{t("Mã voucher")}</th>
                  <th className="py-3.5 px-4 text-center">{t("Mức giảm")}</th>
                  <th className="py-3.5 px-6 text-center">{t("Thời gian áp dụng")}</th>
                  <th className="py-3.5 px-4 text-center">{t("Trạng thái hoạt động")}</th>
                  <th className="py-3.5 px-6 text-right rounded-r-xl">{t("Hành động")}</th>
                </tr>
              </thead>
              <tbody className="text-xs app-text-main">
                {paginatedVouchers.map((v) => {
                  const isDiscountPercent = (v.discountType || v.type) === "PERCENTAGE";
                  const val = v.discountValue ?? v.value ?? 0;

                  return (
                    <tr
                      key={v.id}
                      className="hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors rounded-xl"
                    >
                      <td className="py-4 px-6 font-semibold rounded-l-xl">
                        <div className="flex flex-col space-y-0.5">
                          <span className="font-bold app-text-main text-xs">{v.title}</span>
                          {v.terms && (
                            <span className="text-[10px] app-text-muted truncate max-w-xs">{v.terms}</span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4 font-mono font-black tracking-wider text-blue-600 dark:text-blue-400">
                        {v.code}
                      </td>

                      <td className="py-4 px-4 text-center font-black text-blue-600 dark:text-blue-400">
                        {isDiscountPercent ? `${val} %` : `${val.toLocaleString()} đ`}
                      </td>

                      <td className="py-4 px-6 text-center space-y-1">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            v.isActive
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                          }`}
                        >
                          {v.isActive ? t("Đang diễn ra") : t("Tắt hoạt động")}
                        </span>
                        <div className="text-[11px] app-text-muted font-medium">
                          {v.startDate || "N/A"} - {v.endDate || "N/A"}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => promptToggleStatus(v)}
                          className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer inline-block align-middle ${
                            v.isActive ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
                          }`}

                        >
                          <div
                            className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                              v.isActive ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </td>

                      <td className="py-4 px-6 text-right rounded-r-xl">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyCode(v.id, v.code)}
                            className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors cursor-pointer"
                            title={t("Sao chép mã voucher")}
                          >
                            {copiedId === v.id ? <FiCheck className="w-3.5 h-3.5 text-blue-600" /> : <FiCopy className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingVoucher(v);
                              setIsCreateModalOpen(true);
                            }}
                            className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors cursor-pointer"
                            title={t("Chỉnh sửa voucher")}
                          >
                            <FiEdit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => promptDeleteVoucher(v)}
                            className="p-2 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors cursor-pointer"
                            title={t("Xóa voucher")}
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && filteredVouchers.length === 0 && (
          <div className="p-12 text-center">
            <FiTag className="w-10 h-10 app-text-muted mx-auto mb-2 opacity-40" />
            <p className="text-xs font-bold app-text-muted">{t("Chưa có mã voucher nào được tạo")}</p>
          </div>
        )}

        {!isLoading && filteredVouchers.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredVouchers.length}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          />
        )}
      </div>

      {/* Create / Edit Voucher Modal */}
      <CreateVoucherModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingVoucher(null);
        }}
        onSave={handleCreateVoucher}
        onUpdate={handleUpdateVoucher}
        initialVoucher={editingVoucher}
        availableShowtimes={showtimeOptions}
      />

      {/* Confirmation Modal for Status Toggle & Deletion */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
        confirmText={t("Xác nhận")}
        cancelText={t("Hủy")}
        onConfirm={async () => {
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
          await confirmState.action();
        }}
        onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default EventVouchers;
