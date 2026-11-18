import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiPlus, FiRefreshCw } from "react-icons/fi";
import { toast } from "sonner";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminDataState } from "@/components/admin/AdminDataState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSearchFilterBar } from "@/components/admin/AdminSearchFilterBar";
import { AdminStatusTabs } from "@/components/admin/AdminStatusTabs";
import { venueApi } from "@/services/venueApi";
import type { SystemVenue, VenueApiData } from "@/types";
import { VenueDeleteModal } from "./components/venues/VenueDeleteModal";
import { VenueModal, type VenueFormData } from "./components/venues/VenueModal";
import { VenueTable } from "./components/venues/VenueTable";
import { AdminVenueSeatmapModal } from "./components/venues/AdminVenueSeatmapModal";
import { CustomSelect } from "@/components/common/CustomSelect";

import { AdminConfirmModal } from "@/components/admin/AdminConfirmModal";

/** Địa điểm trong trang quản trị: dữ liệu hệ thống kèm loại, cờ công khai, ban tổ chức sở hữu, mẫu sơ đồ ghế và cờ cho biết số sự kiện đã tổ chức có đáng tin hay không. */
type AdminVenue = SystemVenue & { type?: VenueApiData["type"]; eventsHostedKnown: boolean; isPublic?: boolean; organizerId?: string; seatmapTemplate?: string };
/** Bộ lọc trạng thái địa điểm: tất cả, công khai, riêng tư, đã xác minh hoặc chưa xác minh. */
type Status = "ALL" | "PUBLIC" | "PRIVATE" | "VERIFIED" | "UNVERIFIED";
const PAGE_SIZE = 10;

/** Chuyển dữ liệu địa điểm từ API sang `AdminVenue`, điền giá trị mặc định cho các trường thiếu. */
function mapVenue(v: VenueApiData): AdminVenue {
  return {
    id: String(v.id),
    name: v.name,
    address: v.address ?? "",
    city: v.city ?? "",
    ward: v.ward ?? "",
    capacity: v.capacity ?? 0,
    type: v.type,
    verified: v.verified === true,
    isPublic: v.isPublic !== false,
    organizerId: v.organizerId,
    seatmapTemplate: v.seatmapTemplate,
    eventsHosted: v.eventsHosted ?? 0,
    eventsHostedKnown: v.eventsHosted != null,
    bookings: []
  };
}

/**
 * Trang quản lý địa điểm của admin: danh sách có tìm kiếm, lọc theo trạng thái và thành phố, phân trang; thêm, sửa, xóa,
 * xác minh/bỏ xác minh địa điểm và xem mẫu sơ đồ ghế. Mỗi lần tải dùng số phiên bản để bỏ qua kết quả cũ.
 */
export function AdminVenuesManagement() {
  const { t } = useTranslation();
  const translateRef = useRef(t);
  const [venues, setVenues] = useState<AdminVenue[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [refreshError, setRefreshError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>("ALL");
  const [city, setCity] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminVenue | null>(null);
  const [deleting, setDeleting] = useState<AdminVenue | null>(null);
  const [verifyingVenue, setVerifyingVenue] = useState<AdminVenue | null>(null);
  const [seatmapVenue, setSeatmapVenue] = useState<AdminVenue | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const deleteLock = useRef(false);
  // ponytail: chỉ xác minh một địa điểm mỗi lần; dùng khóa theo từng dòng nếu cần xác minh đồng thời.
  const anyVerifyLock = useRef(false);
  const mounted = useRef(true);
  const loadedOnce = useRef(false);
  const requestVersion = useRef(0);
  useEffect(() => { translateRef.current = t; }, [t]);

  /**
   * Tải danh sách địa điểm từ API và cập nhật trạng thái; bỏ qua kết quả của lần gọi đã cũ hoặc khi component đã gỡ.
   * @param afterMutation true khi tải lại sau thao tác ghi (lỗi lúc này chỉ cảnh báo, không đổi sang trạng thái lỗi)
   */
  const load = useCallback(async (afterMutation = false) => {
    const version = ++requestVersion.current;
    if (!afterMutation) {
      if (loadedOnce.current) setRefreshing(true);
      else setLoadState("loading");
    }
    try {
      const data = await venueApi.getAdminVenues();
      if (!mounted.current || version !== requestVersion.current) return;
      setVenues(data.map(mapVenue));
      loadedOnce.current = true;
      setLoadState("ready");
      setRefreshError(false);
    } catch {
      if (!mounted.current || version !== requestVersion.current) return;
      if (afterMutation) {
        setRefreshError(true);
        toast.warning(translateRef.current("Thao tác đã được máy chủ chấp nhận, nhưng không thể tải lại danh sách. Hãy thử tải lại để xác nhận."), { duration: 6000 });
      } else if (loadedOnce.current) setRefreshError(true);
      else setLoadState("error");
    } finally {
      if (mounted.current && version === requestVersion.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    queueMicrotask(() => void load());
    return () => { mounted.current = false; };
  }, [load]);

  /** Bật hoặc tắt xác minh của một địa điểm; chỉ cho một thao tác xác minh chạy tại một thời điểm. */
  const toggle = async (venue: AdminVenue) => {
    if (anyVerifyLock.current) return;
    anyVerifyLock.current = true;
    setBusyId(venue.id);
    try {
      const updated = await venueApi.toggleVerifyVenue(venue.id);
      if (!updated) throw new Error("Verify failed");
      setVenues(current => current.map(item => item.id === venue.id ? mapVenue(updated) : item));
      toast.success(updated.verified ? t("Đã xác minh địa điểm") : t("Đã bỏ xác minh địa điểm"));
      await load(true);
    } catch { toast.error(t("Không thể thay đổi trạng thái xác minh."), { duration: 6000 }); }
    finally { anyVerifyLock.current = false; setBusyId(null); }
  };

  /**
   * Tạo mới hoặc cập nhật địa điểm từ biểu mẫu rồi tải lại danh sách.
   * @param form dữ liệu biểu mẫu
   * @returns true nếu máy chủ lưu thành công
   */
  const save = async (form: VenueFormData): Promise<boolean> => {
    const payload = { name: form.name.trim(), address: form.address.trim(), city: form.city.trim(),
      ward: form.ward?.trim() ?? "", capacity: form.capacity, type: form.type ?? "indoor", verified: form.verified };
    const saved = editing ? await venueApi.updateVenue(editing.id, payload) : await venueApi.createVenue(payload);
    if (!saved) return false;
    setVenues(current => editing
      ? current.map(item => item.id === editing.id ? mapVenue(saved) : item)
      : [mapVenue(saved), ...current]);
    await load(true);
    toast.success(editing ? t("Đã cập nhật địa điểm") : t("Đã thêm địa điểm"));
    return true;
  };

  /** Xóa địa điểm đang chờ xác nhận xóa; có khóa chống bấm lặp và ghi lỗi để hiển thị nếu thất bại. */
  const confirmDelete = async () => {
    if (!deleting || deleteLock.current) return;
    deleteLock.current = true;
    setDeletePending(true);
    setDeleteError("");
    try {
      if (!await venueApi.deleteVenue(deleting.id)) throw new Error("Delete failed");
      setVenues(current => current.filter(item => item.id !== deleting.id));
      setDeleting(null);
      await load(true);
      toast.success(t("Đã xóa địa điểm"));
    } catch { setDeleteError(t("Không thể xóa địa điểm. Vui lòng thử lại.")); }
    finally { deleteLock.current = false; setDeletePending(false); }
  };

  const query = search.trim().toLocaleLowerCase("vi-VN");
  const filtered = venues.filter(v => (!query || [v.name, v.address, v.city].some(x => x.toLocaleLowerCase("vi-VN").includes(query)))
    && (status === "ALL"
      || (status === "VERIFIED" ? v.verified : status === "UNVERIFIED" ? !v.verified : status === "PUBLIC" ? v.isPublic !== false : v.isPublic === false))
    && (city === "ALL" || v.city === city));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const cities = [...new Set(venues.map(v => v.city).filter(Boolean))].sort();

  return <div className="space-y-6">
    <AdminPageHeader title={t("Quản lý địa điểm")} description={t("Địa điểm được lưu trên hệ thống")} />
    <section className="overflow-hidden rounded-lg border app-border app-bg-card shadow-xs">
      {loadState === "ready" && <div className="px-5 pt-3">
        <AdminStatusTabs value={status} onChange={value => { setStatus(value as Status); setPage(1); }} options={[
          { value: "ALL", label: t("Tất cả"), count: venues.length },
          { value: "PUBLIC", label: t("Địa điểm công cộng"), count: venues.filter(v => v.isPublic !== false).length },
          { value: "PRIVATE", label: t("Địa điểm riêng (BTC)"), count: venues.filter(v => v.isPublic === false).length },
          { value: "VERIFIED", label: t("Đã xác minh"), count: venues.filter(v => v.verified).length },
          { value: "UNVERIFIED", label: t("Chưa xác minh"), count: venues.filter(v => !v.verified).length },
        ]} />
      </div>}
      <div className="p-5">
        <AdminSearchFilterBar searchQuery={search} onSearchChange={value => { setSearch(value); setPage(1); }} searchPlaceholder={t("Tìm theo tên, địa chỉ, thành phố...")}>
          <label className="flex items-center gap-2 text-xs font-semibold app-text-main">
            <span className="text-muted-foreground">{t("Thành phố:")}</span>
            <div className="w-40">
              <CustomSelect
                value={city}
                onChange={val => { setCity(val); setPage(1); }}
                options={[{ value: "ALL", label: t("Tất cả thành phố") }, ...cities.map(c => ({ value: c, label: c }))]}
              />
            </div>
          </label>
          <button type="button" onClick={() => void load()} disabled={loadState === "loading" || refreshing} aria-label={t("Tải lại địa điểm")} className="inline-flex min-h-9 w-9 items-center justify-center rounded-md border app-border app-bg-card text-foreground shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"><FiRefreshCw className={refreshing ? "animate-spin" : ""} /></button>
          <button type="button" onClick={() => { setEditing(null); setOpen(true); }} className="inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-md bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"><FiPlus className="h-4 w-4" />{t("Thêm địa điểm mới")}</button>
        </AdminSearchFilterBar>
      </div>
    </section>
    <section className="overflow-hidden rounded-lg border app-border app-bg-card shadow-xs">
      {refreshing && <AdminDataState state="refreshing" />}
      {refreshError && <div role="alert" className="border-b border-amber-500/40 p-4 text-sm app-text-main">{t("Không thể tải lại danh sách sau thao tác. Dữ liệu hiển thị có thể chưa cập nhật.")} <button type="button" onClick={() => void load()} className="font-bold underline">{t("Thử lại")}</button></div>}
      {loadState === "error"
        ? <AdminDataState state="error" message={t("Không thể tải địa điểm.")} onRetry={() => void load()} />
        : loadState === "loading" ? <AdminDataState state="loading" />
          : <>
            {venues.length === 0 ? <AdminDataState state="empty" message={t("Chưa có địa điểm nào.")} />
              : filtered.length === 0 ? <AdminDataState state="no-results" message={t("Không tìm thấy địa điểm nào phù hợp.")} onReset={() => { setSearch(""); setCity("ALL"); setStatus("ALL"); setPage(1); }} />
                : <VenueTable
                    venues={visible}
                    page={safePage}
                    pageSize={pageSize}
                    busyId={busyId}
                    onRequestVerify={venue => setVerifyingVenue(venue as AdminVenue)}
                    onOpenSeatmap={venue => setSeatmapVenue(venue as AdminVenue)}
                    onEdit={venue => { setEditing(venue as AdminVenue); setOpen(true); }}
                    onDelete={venue => { setDeleting(venue as AdminVenue); setDeleteError(""); }}
                  />}
            <AdminPagination
              currentPage={safePage}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              itemLabel={t("địa điểm")}
            />
          </>}
    </section>
    <VenueModal isOpen={open} editingVenue={editing} onClose={() => { setOpen(false); setEditing(null); }} onSubmit={save} />
    <VenueDeleteModal isOpen={!!deleting} venue={deleting} pending={deletePending} error={deleteError} onClose={() => { if (!deletePending) setDeleting(null); }} onConfirm={() => void confirmDelete()} />
    <AdminVenueSeatmapModal
      isOpen={!!seatmapVenue}
      venue={seatmapVenue}
      onClose={() => setSeatmapVenue(null)}
      onTemplateUpdated={() => void load(true)}
    />

    {/* Hộp thoại xác nhận xác minh */}
    {verifyingVenue && (
      <AdminConfirmModal
        title={t("Xác nhận Xác Minh Địa Điểm")}
        subtitle={t("Bạn có chắc chắn muốn xác minh địa điểm '{{name}}' là địa điểm công cộng hợp lệ của hệ thống?", { name: verifyingVenue.name })}
        confirmText={t("Xác minh ngay")}
        cancelText={t("Hủy bỏ")}
        isDanger={false}
        pending={busyId !== null}
        onClose={() => setVerifyingVenue(null)}
        onConfirm={async () => {
          const v = verifyingVenue;
          setVerifyingVenue(null);
          await toggle(v);
        }}
      >
        <div className="text-xs app-text-muted space-y-1.5 p-3 rounded-xl app-bg-subnav border app-border">
          <p>• <strong>{t("Tên địa điểm")}:</strong> {verifyingVenue.name}</p>
          <p>• <strong>{t("Địa chỉ")}:</strong> {verifyingVenue.address}, {verifyingVenue.city}</p>
          <p>• <strong>{t("Sức chứa tối đa")}:</strong> {verifyingVenue.capacity.toLocaleString("vi-VN")} {t("chỗ")}</p>
        </div>
      </AdminConfirmModal>
    )}
  </div>;
}

export default AdminVenuesManagement;
