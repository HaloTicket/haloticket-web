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
import { VenueStatCards } from "./components/venues/VenueStatCards";
import { VenueTable } from "./components/venues/VenueTable";

type AdminVenue = SystemVenue & { type?: VenueApiData["type"]; eventsHostedKnown: boolean };
type Status = "ALL" | "VERIFIED" | "UNVERIFIED";
const PAGE_SIZE = 8;

function mapVenue(v: VenueApiData): AdminVenue {
  return { id: String(v.id), name: v.name, address: v.address ?? "", city: v.city ?? "",
    ward: v.ward ?? "", capacity: v.capacity ?? 0, type: v.type, verified: v.verified === true,
    eventsHosted: v.eventsHosted ?? 0, eventsHostedKnown: v.eventsHosted != null, bookings: [] };
}

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
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const deleteLock = useRef(false);
  // ponytail: Verify one venue at a time; use per-row locks if concurrent verification is needed.
  const anyVerifyLock = useRef(false);
  const mounted = useRef(true);
  const loadedOnce = useRef(false);
  const requestVersion = useRef(0);
  useEffect(() => { translateRef.current = t; }, [t]);

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
    && (status === "ALL" || (status === "VERIFIED" ? v.verified : !v.verified))
    && (city === "ALL" || v.city === city));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const cities = [...new Set(venues.map(v => v.city).filter(Boolean))].sort();

  return <div className="space-y-6">
    <AdminPageHeader title={t("Quản lý địa điểm")} description={t("Địa điểm được lưu trên hệ thống")} actions={loadState === "ready" && <VenueStatCards venues={venues} />} />
    <section className="overflow-hidden rounded-2xl border app-border app-bg-card">
      {loadState === "ready" && <div className="px-4 sm:px-5">
        <AdminStatusTabs value={status} onChange={value => { setStatus(value as Status); setPage(1); }} options={[
          { value: "ALL", label: t("Tất cả trạng thái"), count: venues.length },
          { value: "VERIFIED", label: t("Đã xác minh"), count: venues.filter(v => v.verified).length },
          { value: "UNVERIFIED", label: t("Chưa xác minh"), count: venues.filter(v => !v.verified).length },
        ]} />
      </div>}
      <div className="p-4 sm:p-5">
        <AdminSearchFilterBar searchQuery={search} onSearchChange={value => { setSearch(value); setPage(1); }} searchPlaceholder={t("Tìm theo tên, địa chỉ, thành phố...")}>
          <label className="flex items-center gap-2 text-sm app-text-main">{t("Thành phố")}
            <select value={city} onChange={event => { setCity(event.target.value); setPage(1); }} className="min-h-11 rounded-xl border app-border app-bg-subnav px-3 text-sm app-text-main">
              <option value="ALL">{t("Tất cả thành phố")}</option>
              {cities.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => void load()} disabled={loadState === "loading" || refreshing} aria-label={t("Tải lại địa điểm")} className="min-h-11 min-w-11 rounded-xl border app-border app-text-main disabled:opacity-50"><FiRefreshCw className="mx-auto" /></button>
          <button type="button" onClick={() => { setEditing(null); setOpen(true); }} className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white"><FiPlus />{t("Thêm địa điểm mới")}</button>
        </AdminSearchFilterBar>
      </div>
    </section>
    <section className="overflow-hidden rounded-2xl border app-border app-bg-card">
      {refreshing && <AdminDataState state="refreshing" />}
      {refreshError && <div role="alert" className="border-b border-amber-500/40 p-4 text-sm app-text-main">{t("Không thể tải lại danh sách sau thao tác. Dữ liệu hiển thị có thể chưa cập nhật.")} <button type="button" onClick={() => void load()} className="font-bold underline">{t("Thử lại")}</button></div>}
      {loadState === "error"
        ? <AdminDataState state="error" message={t("Không thể tải địa điểm.")} onRetry={() => void load()} />
        : loadState === "loading" ? <AdminDataState state="loading" />
          : <>
            {venues.length === 0 ? <AdminDataState state="empty" message={t("Chưa có địa điểm nào.")} />
              : filtered.length === 0 ? <AdminDataState state="no-results" message={t("Không tìm thấy địa điểm nào phù hợp.")} onReset={() => { setSearch(""); setCity("ALL"); setStatus("ALL"); setPage(1); }} />
                : <VenueTable venues={visible} busyId={busyId} onToggleVerification={venue => void toggle(venue as AdminVenue)} onEdit={venue => { setEditing(venue as AdminVenue); setOpen(true); }} onDelete={venue => { setDeleting(venue as AdminVenue); setDeleteError(""); }} />}
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
  </div>;
}

export default AdminVenuesManagement;
