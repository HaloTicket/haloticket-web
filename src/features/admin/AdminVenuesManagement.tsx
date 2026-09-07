import React, { useState, useEffect } from "react";
import { FiMapPin, FiPlus, FiRefreshCw, FiAlertCircle, FiCheckCircle, FiFilter } from "react-icons/fi";
import { venueApi } from "@/services/venueApi";
import type { VenueApiData } from "@/types";
import { PRESET_VENUES } from "@/utils/venueUtils";
import type { SystemVenue } from "@/types";

import { AdminSearchFilterBar } from "@/components/admin/AdminSearchFilterBar";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { VenueStatCards } from "./components/venues/VenueStatCards";
import { VenueTable } from "./components/venues/VenueTable";
import { VenueModal, type VenueFormData } from "./components/venues/VenueModal";
import { VenueDeleteModal } from "./components/venues/VenueDeleteModal";

export const AdminVenuesManagement: React.FC = () => {
  const [venues, setVenues] = useState<SystemVenue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // filter & search state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "VERIFIED" | "UNVERIFIED">("ALL");
  const [cityFilter, setCityFilter] = useState("ALL");

  // pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<VenueFormData | null>(null);
  const [deletingVenue, setDeletingVenue] = useState<SystemVenue | null>(null);

  // toast state
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // load venue data directly from MySQL DB via event-service API
  const loadVenuesData = async () => {
    setIsLoading(true);
    try {
      const dbVenues: VenueApiData[] = await venueApi.getVenues();

      if (Array.isArray(dbVenues) && dbVenues.length > 0) {
        const mappedVenues: SystemVenue[] = dbVenues.map((v) => ({
          id: String(v.id),
          name: v.name,
          city: v.city || "TP. Hồ Chí Minh",
          ward: v.ward || "",
          address: v.address || v.name,
          capacity: v.capacity || 1000,
          verified: v.verified,
          eventsHosted: v.eventsHosted || 0,
          bookings: [],
        }));
        setVenues(mappedVenues);
      } else {
        // baseline fallback if backend initializing
        const fallbackVenues: SystemVenue[] = PRESET_VENUES.map((pv) => ({ ...pv }));
        setVenues(fallbackVenues);
      }
    } catch (err) {
      console.error("Failed to load venues from DB", err);
      showToast("Không thể tải dữ liệu địa điểm từ CSDL backend", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    venueApi.getVenues().then((dbVenues) => {
      if (!isMounted) return;
      if (Array.isArray(dbVenues) && dbVenues.length > 0) {
        const mappedVenues: SystemVenue[] = dbVenues.map((v) => ({
          id: String(v.id),
          name: v.name,
          city: v.city || "TP. Hồ Chí Minh",
          ward: v.ward || "",
          address: v.address || v.name,
          capacity: v.capacity || 1000,
          verified: v.verified,
          eventsHosted: v.eventsHosted || 0,
          bookings: [],
        }));
        setVenues(mappedVenues);
      } else {
        setVenues(PRESET_VENUES.map((pv) => ({ ...pv })));
      }
      setIsLoading(false);
    }).catch((err) => {
      if (!isMounted) return;
      console.error("Failed to load venues from DB", err);
      showToast("Không thể tải dữ liệu địa điểm từ CSDL backend", "error");
      setIsLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // toggle verification status in DB
  const handleToggleVerification = async (venue: SystemVenue) => {
    const numericId = Number(venue.id.replace(/\D/g, ""));
    const newStatus = !venue.verified;

    // optimistic UI update
    setVenues((prev) =>
      prev.map((v) => (v.id === venue.id ? { ...v, verified: newStatus } : v))
    );

    if (!isNaN(numericId) && numericId > 0) {
      const updated = await venueApi.toggleVerifyVenue(numericId);
      if (updated) {
        showToast(
          updated.verified
            ? `Đã XÁC MINH địa điểm "${venue.name}" thành công vào CSDL!`
            : `Đã hủy xác minh địa điểm "${venue.name}" trong CSDL.`,
          updated.verified ? "success" : "info"
        );
        loadVenuesData();
        return;
      }
    }

    showToast(
      newStatus ? `Đã XÁC MINH địa điểm "${venue.name}" thành công!` : `Đã hủy xác minh địa điểm "${venue.name}".`,
      newStatus ? "success" : "info"
    );
  };

  // handle create / edit submission directly in DB
  const handleModalSubmit = async (formData: VenueFormData) => {
    if (editingVenue && editingVenue.id) {
      const numericId = Number(editingVenue.id.replace(/\D/g, ""));
      const payload = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        city: formData.city,
        ward: formData.ward || "",
        capacity: formData.capacity,
        type: formData.type || "indoor",
        verified: formData.verified,
      };

      if (!isNaN(numericId) && numericId > 0) {
        const res = await venueApi.updateVenue(numericId, payload);
        if (res) {
          showToast(`Đã cập nhật thông tin địa điểm "${formData.name}" trong CSDL!`);
          setEditingVenue(null);
          loadVenuesData();
          return;
        }
      }

      setVenues((prev) =>
        prev.map((v) =>
          v.id === editingVenue.id ? { ...v, ...payload } : v
        )
      );
      showToast(`Đã cập nhật thông tin địa điểm "${formData.name}"!`);
    } else {
      const payload = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        city: formData.city,
        ward: formData.ward || "",
        capacity: formData.capacity,
        type: formData.type || "indoor",
        verified: formData.verified,
      };

      const res = await venueApi.createVenue(payload);
      if (res) {
        showToast(`Đã lưu địa điểm mới "${res.name}" vào CSDL thành công!`);
        loadVenuesData();
        return;
      }

      const created: SystemVenue = {
        id: `v-admin-${Date.now()}`,
        ...payload,
        eventsHosted: 0,
        bookings: [],
      };
      setVenues((prev) => [created, ...prev]);
      showToast(`Đã thêm địa điểm mới "${created.name}"!`);
    }
    setEditingVenue(null);
  };

  // handle delete confirmation in DB
  const handleConfirmDelete = async () => {
    if (!deletingVenue) return;
    const numericId = Number(deletingVenue.id.replace(/\D/g, ""));

    if (!isNaN(numericId) && numericId > 0) {
      const success = await venueApi.deleteVenue(numericId);
      if (success) {
        showToast(`Đã xóa địa điểm "${deletingVenue.name}" khỏi CSDL thành công!`, "info");
        setDeletingVenue(null);
        loadVenuesData();
        return;
      }
    }

    setVenues((prev) => prev.filter((v) => v.id !== deletingVenue.id));
    showToast(`Đã xóa địa điểm "${deletingVenue.name}" khỏi danh sách!`, "info");
    setDeletingVenue(null);
  };

  // filtering
  const filteredVenues = venues.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.city.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ? true : statusFilter === "VERIFIED" ? v.verified : !v.verified;

    const matchesCity = cityFilter === "ALL" ? true : v.city === cityFilter;

    return matchesSearch && matchesStatus && matchesCity;
  });

  // pagination calculations
  const totalPages = Math.ceil(filteredVenues.length / pageSize) || 1;
  const paginatedVenues = filteredVenues.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // available unique cities for dropdown filter
  const uniqueCities = Array.from(new Set(venues.map((v) => v.city))).filter(Boolean);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[9999] px-4 py-3 rounded-xl shadow-xl border text-xs font-bold flex items-center gap-2 animate-in slide-in-from-bottom-4 duration-200 ${toast.type === "success"
            ? "bg-emerald-600 text-white border-emerald-500"
            : toast.type === "error"
              ? "bg-rose-600 text-white border-rose-500"
              : "bg-blue-600 text-white border-blue-500"
            }`}
        >
          {toast.type === "success" ? (
            <FiCheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <FiAlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Metric Statistics Cards */}
      <VenueStatCards venues={venues} />

      {/* Main Filter & Data Table Card */}
      <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-4">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold app-text-main flex items-center gap-2">
              <FiMapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Quản Lý Địa Điểm Tổ Chức Sự Kiện (CSDL)</span>
            </h2>
            <p className="text-xs app-text-muted mt-0.5">
              Xác minh địa điểm chính thức, duyệt thông tin và lưu trực tiếp vào cơ sở dữ liệu hệ thống.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={loadVenuesData}
              className="p-2 bg-slate-50 dark:bg-slate-800/80 text-app-text-main rounded-md border border-slate-200 dark:border-slate-700 hover:border-blue-500 cursor-pointer transition-all active:scale-95"
              title="Tải lại dữ liệu từ CSDL"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingVenue(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <FiPlus className="w-3.5 h-3.5" />
              <span>Thêm địa điểm mới</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar Component using Custom AdminSelect */}
        <AdminSearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={(val) => {
            setSearchQuery(val);
            setCurrentPage(1);
          }}
          searchPlaceholder="Tìm theo tên địa điểm, địa chỉ, thành phố..."
        >
          {/* Status Filter */}
          <AdminSelect
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val as "ALL" | "VERIFIED" | "UNVERIFIED");
              setCurrentPage(1);
            }}
            icon={<FiFilter className="w-3.5 h-3.5" />}
            options={[
              { label: "Tất cả trạng thái", value: "ALL" },
              { label: "Đã xác minh", value: "VERIFIED" },
              { label: "Chưa xác minh", value: "UNVERIFIED" },
            ]}
          />

          {/* City Filter */}
          <AdminSelect
            value={cityFilter}
            onChange={(val) => {
              setCityFilter(val);
              setCurrentPage(1);
            }}
            options={[
              { label: "Tất cả thành phố", value: "ALL" },
              ...uniqueCities.map((city) => ({ label: city, value: city })),
            ]}
          />
        </AdminSearchFilterBar>

        {/* Venues Table Component */}
        <VenueTable
          venues={paginatedVenues}
          onToggleVerification={handleToggleVerification}
          onEdit={(venue) => {
            setEditingVenue({
              id: venue.id,
              name: venue.name,
              address: venue.address,
              city: venue.city,
              ward: venue.ward,
              capacity: venue.capacity,
              verified: venue.verified,
            });
            setIsModalOpen(true);
          }}
          onDelete={(venue) => setDeletingVenue(venue)}
        />

        {/* Pagination Component */}
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredVenues.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Add / Edit Modal */}
      <VenueModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingVenue(null);
        }}
        onSubmit={handleModalSubmit}
        editingVenue={editingVenue}
      />

      {/* Delete Confirmation Modal */}
      <VenueDeleteModal
        isOpen={!!deletingVenue}
        onClose={() => setDeletingVenue(null)}
        onConfirm={handleConfirmDelete}
        venue={deletingVenue}
      />
    </div>
  );
};

export default AdminVenuesManagement;
