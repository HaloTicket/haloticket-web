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
  FiCalendar
} from "react-icons/fi";
import type { SystemVenue } from "@/utils/venueUtils";

interface VenueTableProps {
  venues: SystemVenue[];
  busyId: string | null;
  onToggleVerification: (venue: SystemVenue) => void;
  onEdit: (venue: SystemVenue) => void;
  onDelete: (venue: SystemVenue) => void;
}

export const VenueTable: React.FC<VenueTableProps> = ({
  venues,
  busyId,
  onToggleVerification,
  onEdit,
  onDelete
}) => {
  const { t: translate } = useTranslation();

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1050px] table-fixed text-left text-sm">
        <thead className="app-bg-subnav border-b app-border text-xs font-semibold app-text-muted">
          <tr>
            <th className="w-[210px] px-4 py-3">{translate("Tên địa điểm")}</th>
            <th className="w-[190px] px-4 py-3">{translate("Địa chỉ chi tiết")}</th>
            <th className="w-[110px] whitespace-nowrap px-4 py-3">{translate("Sức chứa")}</th>
            <th className="w-[145px] whitespace-nowrap px-4 py-3">{translate("Số sự kiện")}</th>
            <th className="w-[145px] whitespace-nowrap px-4 py-3">{translate("Trạng thái xác minh")}</th>
            <th className="w-[240px] whitespace-nowrap px-4 py-3 text-right">{translate("Thao tác Admin")}</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-[var(--border-color)] app-text-main">
          {venues.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-10 text-center app-text-muted">
                <FiMapPin className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
                <p className="font-semibold text-xs">{translate("Không tìm thấy địa điểm nào phù hợp.")}</p>
              </td>
            </tr>
          ) : (
            venues.map((v) => (
              <tr key={v.id} className="hover:bg-slate-500/5 transition-colors">
                {/* Name */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg app-bg-subnav app-text-brand flex items-center justify-center shrink-0">
                      <FiMapPin className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold app-text-main" title={v.name}>{v.name}</p>
                      <p className="text-xs app-text-muted">ID: {v.id}</p>
                    </div>
                  </div>
                </td>

                {/* Address */}
                <td className="py-3 px-4">
                  <p className="truncate font-medium" title={v.address}>{v.address}</p>
                  <p className="truncate text-xs app-text-muted">
                    {v.ward ? `${v.ward}, ` : ""}
                    <span>{v.city}</span>
                  </p>
                </td>

                {/* Capacity */}
                <td className="whitespace-nowrap py-3 px-4 font-medium">
                  <span className="inline-flex items-center gap-1">
                    <FiUsers className="w-3.5 h-3.5 app-text-muted shrink-0" />
                    <span>{v.capacity.toLocaleString("vi-VN")} {translate("chỗ")}</span>
                  </span>
                </td>

                {/* Events count */}
                <td className="whitespace-nowrap py-3 px-4 font-medium">
                  <span className="inline-flex items-center gap-1">
                    <FiCalendar className="w-3.5 h-3.5 app-text-muted shrink-0" />
                    <span>{("eventsHostedKnown" in v && v.eventsHostedKnown === false) ? translate("Chưa có dữ liệu") : `${v.eventsHosted} ${translate("sự kiện")}`}</span>
                  </span>
                </td>

                {/* Status Badge */}
                <td className="whitespace-nowrap py-3 px-4">
                  {v.verified ? (
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
                <td className="whitespace-nowrap py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onToggleVerification(v)}
                      disabled={busyId !== null}
                      className={`min-h-11 px-2.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50 ${
                        v.verified
                          ? "app-bg-subnav app-text-main app-border hover:border-amber-500 hover:text-amber-600"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                      }`}
                      title={v.verified ? translate("Hủy xác minh địa điểm này") : translate("Bấm để xác minh địa điểm này")}
                    >
                      <FiShield className="w-3 h-3 shrink-0" />
                      <span>{v.verified ? translate("Bỏ xác minh") : translate("Xác minh")}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onEdit(v)}
                      className="min-h-11 min-w-11 rounded-lg app-text-brand hover:bg-slate-500/5 transition-colors cursor-pointer"
                      aria-label={translate("Chỉnh sửa địa điểm")}
                      title={translate("Chỉnh sửa địa điểm")}
                    >
                      <FiEdit className="mx-auto w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDelete(v)}
                      className="min-h-11 min-w-11 rounded-lg text-rose-500 hover:bg-slate-500/5 transition-colors cursor-pointer"
                      aria-label={translate("Xóa địa điểm khỏi hệ thống")}
                      title={translate("Xóa địa điểm khỏi hệ thống")}
                    >
                      <FiTrash2 className="mx-auto w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default VenueTable;
