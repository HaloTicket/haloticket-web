import React, { useState, useEffect } from "react";
import { FiMapPin, FiPlus, FiRefreshCw, FiAlertCircle, FiCheckCircle, FiFilter } from "react-icons/fi";
import { eventApi } from "@/services/eventApi";
import { PRESET_VENUES, type SystemVenue } from "@/utils/venueUtils";

import { AdminSearchFilterBar } from "@/components/admin/AdminSearchFilterBar";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { VenueStatCards } from "./components/venues/VenueStatCards";
import { VenueTable } from "./components/venues/VenueTable";
import { VenueModal, type VenueFormData } from "./components/venues/VenueModal";
import { VenueDeleteModal } from "./components/venues/VenueDeleteModal";

export const AdminVenuesManagement: React.FC = () => {
  const [venues, setVenues] = useState<SystemVenue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "VERIFIED" | "UNVERIFIED">("ALL");
  const [cityFilter, setCityFilter] = useState("ALL");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<VenueFormData | null>(null);
  const [deletingVenue, setDeletingVenue] = useState<SystemVenue | null>(null);

  // Toast state
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Load venue data from backend events & localStorage
  const loadVenuesData = async () => {
    setIsLoading(true);
    try {
      const realEvents = await eventApi.getAllEvents();
      const venueMap = new Map<string, SystemVenue>();

      // Load saved admin venues overrides from localStorage
      const savedAdminVenuesRaw = localStorage.getItem("halo_admin_venues");
      let savedAdminVenues: SystemVenue[] = [];
      if (savedAdminVenuesRaw) {
        try {
          savedAdminVenues = JSON.parse(savedAdminVenuesRaw);
        } catch {}
      }

      savedAdminVenues.forEach((sv) => {
        venueMap.set(sv.name.toLowerCase().trim(), { ...sv });
      });

      if (Array.isArray(realEvents)) {
        realEvents.forEach((ev: any) => {
          if (!ev.locationName || !ev.locationName.trim()) return;

          const key = ev.locationName.toLowerCase().trim();
          const existing = venueMap.get(key);

          const status = (ev.eventStatus || ev.status || "").toUpperCase();
          const approval = (ev.eventApprovalStatus || ev.approvalStatus || "").toUpperCase();
          const isCompletedOrPublished = status === "COMPLETED" || status === "PUBLISHED" || approval === "APPROVED";

          const bookingItem = {
            eventName: ev.title || "Sự kiện",
            organizer: ev.organizer?.name || ev.author || "Ban Tổ Chức",
            date: ev.datesSummary || (ev.startTime ? new Date(ev.startTime).toLocaleDateString("vi-VN") : "Đã đặt chỗ"),
            timeSlot: ev.startTime
              ? `${new Date(ev.startTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} - ${
                  ev.endTime ? new Date(ev.endTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "23:00"
                }`
              : "08:00 - 22:00",
            status: "CONFIRMED" as const,
          };

          if (existing) {
            const exists = existing.bookings.some((b) => b.eventName === bookingItem.eventName);
            if (!exists) {
              existing.bookings.push(bookingItem);
              existing.eventsHosted += 1;
            }
            if (isCompletedOrPublished) {
              existing.verified = true;
            }
          } else {
            venueMap.set(key, {
              id: `v-db-${ev.id}`,
              name: ev.locationName,
              city: ev.city || "TP. Hồ Chí Minh",
              ward: ev.ward || "",
              address: ev.address || ev.locationName,
              capacity: 3000,
              verified: isCompletedOrPublished,
              eventsHosted: 1,
              bookings: [bookingItem],
            });
          }
        });
      }

      if (venueMap.size === 0) {
        PRESET_VENUES.forEach((pv) => {
          venueMap.set(pv.name.toLowerCase().trim(), { ...pv });
        });
      }

      setVenues(Array.from(venueMap.values()));
    } catch (err) {
      console.error("Failed to load venues", err);
      showToast("Không thể tải dữ liệu địa điểm từ hệ thống", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVenuesData();
  }, []);

  const saveVenuesToStorage = (updatedList: SystemVenue[]) => {
    setVenues(updatedList);
    localStorage.setItem("halo_admin_venues", JSON.stringify(updatedList));
  };

  // Toggle verification status
  const handleToggleVerification = (venue: SystemVenue) => {
    const newStatus = !venue.verified;
    const updated = venues.map((v) => (v.id === venue.id ? { ...v, verified: newStatus } : v));
    saveVenuesToStorage(updated);
    showToast(
      newStatus ? `Đã XÁC MINH địa điểm "${venue.name}" thành công!` : `Đã hủy xác minh địa điểm "${venue.name}".`,
      newStatus ? "success" : "info"
    );
  };

  // Handle Create / Edit submission from VenueModal
  const handleModalSubmit = (formData: VenueFormData) => {
    if (editingVenue && editingVenue.id) {
      const updated = venues.map((v) =>
        v.id === editingVenue.id
          ? {
              ...v,
              name: formData.name.trim(),
              address: formData.address.trim(),
              city: formData.city,
              ward: formData.ward || v.ward || "",
              capacity: formData.capacity,
              verified: formData.verified,
            }
          : v
      );
      saveVenuesToStorage(updated);
      showToast(`Đã cập nhật thông tin địa điểm "${formData.name}" thành công!`);
    } else {
      const created: SystemVenue = {
        id: `v-admin-${Date.now()}`,
        name: formData.name.trim(),
        city: formData.city,
        ward: formData.ward || "",
        address: formData.address.trim(),
        capacity: formData.capacity,
        verified: formData.verified,
        eventsHosted: 0,
        bookings: [],
      };
      saveVenuesToStorage([created, ...venues]);
      showToast(`Đã thêm địa điểm mới "${created.name}" thành công!`);
    }
    setEditingVenue(null);
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = () => {
    if (!deletingVenue) return;
    const updated = venues.filter((v) => v.id !== deletingVenue.id);
    saveVenuesToStorage(updated);
    showToast(`Đã xóa địa điểm "${deletingVenue.name}" khỏi hệ thống!`, "info");
    setDeletingVenue(null);
  };

  // Filtering
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredVenues.length / pageSize) || 1;
  const paginatedVenues = filteredVenues.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Available unique cities for dropdown filter
  const uniqueCities = Array.from(new Set(venues.map((v) => v.city))).filter(Boolean);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[9999] px-4 py-3 rounded-xl shadow-xl border text-xs font-bold flex items-center gap-2 animate-in slide-in-from-bottom-4 duration-200 ${
            toast.type === "success"
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

      {/* Main Filter & Data Table Card (matching UserManagement / CategoryConfig style) */}
      <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-4">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold app-text-main flex items-center gap-2">
              <FiMapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Quản Lý Địa Điểm Tổ Chức Sự Kiện</span>
            </h2>
            <p className="text-xs app-text-muted mt-0.5">
              Xác minh địa điểm chính thức, duyệt thông tin và dọn dẹp địa điểm không hợp lệ trong hệ thống.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={loadVenuesData}
              className="p-2 bg-slate-50 dark:bg-slate-800/80 text-app-text-main rounded-md border border-slate-200 dark:border-slate-700 hover:border-blue-500 cursor-pointer transition-all active:scale-95"
              title="Tải lại dữ liệu"
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

        {/* Search & Filter Bar Component */}
        <AdminSearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={(val) => {
            setSearchQuery(val);
            setCurrentPage(1);
          }}
          searchPlaceholder="Tìm theo tên địa điểm, địa chỉ, thành phố..."
        >
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-xs font-semibold">
            <FiFilter className="w-3.5 h-3.5 app-text-muted shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-transparent app-text-main text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="VERIFIED">🟢 Đã xác minh</option>
              <option value="UNVERIFIED">🟠 Chưa xác minh</option>
            </select>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-xs font-semibold">
            <select
              value={cityFilter}
              onChange={(e) => {
                setCityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent app-text-main text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả thành phố</option>
              {uniqueCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
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
