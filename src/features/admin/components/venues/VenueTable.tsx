import React from "react";
import { useTranslation } from "react-i18next";
import {
  FiMapPin,
  FiCheckCircle,
  FiAlertCircle,
  FiEdit,
  FiTrash2,
  FiShield,
  FiUsers,
  FiCalendar,
  FiLayers,
  FiGlobe,
  FiLock
} from "react-icons/fi";
import type { SystemVenue } from "@/types";

interface VenueTableProps {
  venues: (SystemVenue & { isPublic?: boolean; seatmapTemplate?: string })[];
  busyId: string | null;
  onRequestVerify: (venue: SystemVenue) => void;
  onOpenSeatmap: (venue: SystemVenue) => void;
  onEdit: (venue: SystemVenue) => void;
  onDelete: (venue: SystemVenue) => void;
  page?: number;
  pageSize?: number;
}

export const VenueTable: React.FC<VenueTableProps> = ({
  venues,
  busyId,
  onRequestVerify,
  onOpenSeatmap,
  onEdit,
  onDelete,
  page = 1,
  pageSize = 10,
}) => {
  const { t: translate } = useTranslation();

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] table-fixed text-left text-sm">
        <thead className="app-bg-subnav border-b app-border text-xs font-semibold app-text-muted">
          <tr>
            <th className="w-12 text-center px-3 py-3 text-xs font-bold uppercase">{translate("STT")}</th>
            <th className="w-[240px] px-4 py-3">{translate("Tên địa điểm")}</th>
            <th className="w-[190px] px-4 py-3">{translate("Địa chỉ chi tiết")}</th>
            <th className="w-[110px] whitespace-nowrap px-4 py-3">{translate("Sức chứa")}</th>
            <th className="w-[110px] whitespace-nowrap px-4 py-3">{translate("Số sự kiện")}</th>
            <th className="w-[150px] whitespace-nowrap px-4 py-3">{translate("Loại & Xác minh")}</th>
            <th className="w-[190px] whitespace-nowrap px-4 py-3 text-right">{translate("Thao tác Admin")}</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-[var(--border-color)] app-text-main">
          {venues.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-10 text-center app-text-muted">
                <FiMapPin className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
                <p className="font-semibold text-xs">{translate("Không tìm thấy địa điểm nào phù hợp.")}</p>
              </td>
            </tr>
          ) : (
            venues.map((v, index) => {
              const isPrivateVenue = v.isPublic === false;

              return (
                <tr key={v.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors">
                  {/* STT */}
                  <td className="text-center font-medium text-xs app-text-muted px-3 py-2">
                    {(page - 1) * pageSize + index + 1}
                  </td>

                  {/* Name & Scope Badge */}
                  <td className="py-2.5 px-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="truncate font-bold app-text-main" title={v.name}>{v.name}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-slate-400 font-mono">ID: {v.id}</span>
                        {isPrivateVenue ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                            <FiLock className="w-2.5 h-2.5" /> {translate("Địa điểm riêng (BTC)")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                            <FiGlobe className="w-2.5 h-2.5" /> {translate("Địa điểm công cộng")}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Address */}
                  <td className="py-2.5 px-4">
                    <p className="truncate font-medium text-xs" title={v.address}>{v.address}</p>
                    <p className="truncate text-[11px] app-text-muted">
                      {v.ward ? `${v.ward}, ` : ""}
                      <span>{v.city}</span>
                    </p>
                  </td>

                  {/* Capacity */}
                  <td className="whitespace-nowrap py-2.5 px-4 font-medium text-xs">
                    <span className="inline-flex items-center gap-1">
                      <FiUsers className="w-3.5 h-3.5 app-text-muted shrink-0" />
                      <span>{v.capacity.toLocaleString("vi-VN")} {translate("chỗ")}</span>
                    </span>
                  </td>

                  {/* Events count */}
                  <td className="whitespace-nowrap py-2.5 px-4 font-medium text-xs">
                    <span className="inline-flex items-center gap-1">
                      <FiCalendar className="w-3.5 h-3.5 app-text-muted shrink-0" />
                      <span>{`${v.eventsHosted} ${translate("sự kiện")}`}</span>
                    </span>
                  </td>

                  {/* Verification Status */}
                  <td className="whitespace-nowrap py-2.5 px-4">
                    {isPrivateVenue ? (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-semibold border border-slate-200 dark:border-slate-700">
                        {translate("Không áp dụng")}
                      </span>
                    ) : v.verified ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
                        <FiCheckCircle className="w-3 h-3 shrink-0" /> {translate("Đã xác minh")}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-[11px] font-bold border border-amber-200 dark:border-amber-800 inline-flex items-center gap-1">
                        <FiAlertCircle className="w-3 h-3 shrink-0" /> {translate("Chưa xác minh")}
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="whitespace-nowrap py-2.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                      {/* Verify button with confirm modal - ONLY for public unverified venues */}
                      {!isPrivateVenue && !v.verified && (
                        <button
                          type="button"
                          onClick={() => onRequestVerify(v)}
                          disabled={busyId !== null}
                          className="min-h-8 px-2.5 rounded-md text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50 bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-2xs"
                          title={translate("Xác minh địa điểm này")}
                        >
                          <FiShield className="w-3 h-3 shrink-0" />
                          <span>{translate("Xác minh")}</span>
                        </button>
                      )}

                      {/* SeatMap Template & list button */}
                      {!isPrivateVenue ? (
                        <button
                          type="button"
                          onClick={() => onOpenSeatmap(v)}
                          className="min-h-8 px-2.5 rounded-md text-xs font-semibold border app-border app-bg-card hover:bg-blue-50 dark:hover:bg-blue-950/50 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                          title={translate("Quản lý danh sách và thiết kế Sơ đồ ghế (SeatMap) cho địa điểm này")}
                        >
                          <FiLayers className="w-3.5 h-3.5 shrink-0" />
                          <span>{translate("SeatMap")}</span>
                        </button>
                      ) : (
                        <span
                          className="min-h-8 px-2 rounded-md text-[11px] font-medium border border-dashed app-border app-text-muted flex items-center gap-1 cursor-not-allowed opacity-60"
                          title={translate("Địa điểm riêng tư của Ban tổ chức - không thể tạo Sơ đồ mẫu")}
                        >
                          <FiLock className="w-3 h-3 shrink-0" />
                          <span>{translate("SeatMap riêng")}</span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => onEdit(v)}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md app-text-brand hover:bg-slate-500/10 transition-colors cursor-pointer"
                        aria-label={translate("Chỉnh sửa địa điểm")}
                        title={translate("Chỉnh sửa địa điểm")}
                      >
                        <FiEdit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(v)}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        aria-label={translate("Xóa địa điểm khỏi hệ thống")}
                        title={translate("Xóa địa điểm khỏi hệ thống")}
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default VenueTable;

