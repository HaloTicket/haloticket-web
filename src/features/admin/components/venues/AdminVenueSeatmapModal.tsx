import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  FiX,
  FiLayers,
  FiPlus,
  FiTrash2,
  FiEye,
  FiEdit,
  FiCheckCircle,
  FiMapPin,
  FiUsers,
  FiRefreshCw,
  FiCopy,
  FiSend,
  FiAlertCircle,
  FiCalendar,
  FiLock,
  FiGlobe
} from 'react-icons/fi';
import type { SystemVenue, VenueSeatmapsResponse, VenueOrganizerSeatmap } from '@/types';
import type { SeatMapDocument, ZoneBlock } from '@/types/seating';
import { venueApi } from '@/services/venueApi';
import { PATHS } from '@/routes/paths';
import { toast } from 'sonner';

interface AdminVenueSeatmapModalProps {
  isOpen: boolean;
  venue: (SystemVenue & { isPublic?: boolean; organizerId?: string; seatmapTemplate?: string }) | null;
  onClose: () => void;
  onTemplateUpdated?: () => void;
}

export interface AdminSeatmapTemplateItem {
  id: string;
  name: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  data: SeatMapDocument;
  capacity: number;
  totalSeats: number;
  totalZones: number;
}

export const AdminVenueSeatmapModal: React.FC<AdminVenueSeatmapModalProps> = ({
  isOpen,
  venue,
  onClose,
  onTemplateUpdated,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<VenueSeatmapsResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'admin' | 'organizers'>('admin');

  // admin templates list for this venue
  const [adminTemplates, setAdminTemplates] = useState<AdminSeatmapTemplateItem[]>([]);
  const [selectedAdminTplId, setSelectedAdminTplId] = useState<string | null>(null);

  // selected organizer map
  const [selectedOrgIndex, setSelectedOrgIndex] = useState<number>(0);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const isPublicVenue = venue?.isPublic !== false && !venue?.organizerId;

  // load backend data and stored templates
  useEffect(() => {
    if (isOpen && venue) {
      loadSeatmaps();
    } else {
      setData(null);
      setAdminTemplates([]);
      setSelectedAdminTplId(null);
      setSelectedOrgIndex(0);
    }
  }, [isOpen, venue?.id]);

  const loadSeatmaps = async () => {
    if (!venue) return;
    setLoading(true);
    try {
      const res = await venueApi.getVenueSeatmaps(venue.id);
      setData(res);

      // load additional templates from localStorage
      const localKey = `admin_venue_templates_${venue.id}`;
      let localList: AdminSeatmapTemplateItem[] = [];
      try {
        const saved = localStorage.getItem(localKey);
        if (saved) localList = JSON.parse(saved);
      } catch (e) {
        console.warn("Failed to parse local templates", e);
      }

      const templatesMap = new Map<string, AdminSeatmapTemplateItem>();

      // if backend has an official adminTemplate, include it as published
      if (res?.adminTemplate) {
        try {
          const parsed: SeatMapDocument = JSON.parse(res.adminTemplate);
          const rawZones = parsed.zones;
          const zonesList: ZoneBlock[] = Array.isArray(rawZones)
            ? (rawZones as ZoneBlock[])
            : rawZones && typeof rawZones === 'object'
            ? Object.values(rawZones)
            : [];
          const totalSeatsCount = parsed.seats?.length || 0;
          const standingCap = zonesList
            .filter((z) => !parsed.seats?.some((s) => s.zoneId === z.id))
            .reduce((acc: number, z: ZoneBlock): number => acc + (z.tierId ? (Number(z?.capacity) || 0) : 0), 0);
          const capacity = totalSeatsCount + standingCap || totalSeatsCount || venue.capacity;
          const officialTpl: AdminSeatmapTemplateItem = {
            id: `official_tpl_${venue.id}`,
            name: parsed.name || `Sơ đồ chuẩn - ${venue.name}`,
            isPublished: true,
            createdAt: parsed.timestamp || new Date().toISOString(),
            updatedAt: parsed.timestamp || new Date().toISOString(),
            data: parsed,
            capacity,
            totalSeats: parsed.seats?.length || 0,
            totalZones: zonesList.length,
          };
          templatesMap.set(officialTpl.id, officialTpl);
        } catch (e) {
          console.warn("Failed to parse backend adminTemplate", e);
        }
      }

      // add local templates
      localList.forEach((tpl) => {
        // if an official template exists from backend, unpublish local ones with same id
        if (res?.adminTemplate && tpl.id === `official_tpl_${venue.id}`) {
          // already handled
        } else {
          templatesMap.set(tpl.id, {
            ...tpl,
            isPublished: res?.adminTemplate ? false : tpl.isPublished,
          });
        }
      });

      const merged = Array.from(templatesMap.values());
      setAdminTemplates(merged);
      if (merged.length > 0) {
        setSelectedAdminTplId(merged[0].id);
      }
    } catch {
      toast.error(t('Không thể tải danh sách SeatMap của địa điểm này'));
    } finally {
      setLoading(false);
    }
  };

  const saveLocalTemplates = (list: AdminSeatmapTemplateItem[]) => {
    if (!venue) return;
    setAdminTemplates(list);
    try {
      localStorage.setItem(`admin_venue_templates_${venue.id}`, JSON.stringify(list));
    } catch (e) {
      console.warn("Failed to persist admin templates", e);
    }
  };

  // publish a template to organizers
  const handlePublishTemplate = async (template: AdminSeatmapTemplateItem) => {
    if (!venue) return;
    if (!isPublicVenue) {
      toast.error(t('Chỉ có thể xuất bản Sơ đồ mẫu cho Địa điểm công cộng.'));
      return;
    }

    setPublishingId(template.id);
    try {
      const payload: SeatMapDocument = {
        ...template.data,
        name: template.name,
        timestamp: new Date().toISOString(),
      };

      const result = await venueApi.saveVenueSeatmapTemplate(venue.id, JSON.stringify(payload));
      if (result) {
        toast.success(t('Đã xuất bản Sơ đồ mẫu thành công! Ban tổ chức có thể xem và áp dụng mẫu này khi tạo sự kiện.'));
        // update published status across list
        const updated = adminTemplates.map((t) => ({
          ...t,
          isPublished: t.id === template.id,
        }));
        saveLocalTemplates(updated);
        onTemplateUpdated?.();
      } else {
        throw new Error('Publish failed');
      }
    } catch {
      toast.error(t('Không thể xuất bản Sơ đồ mẫu. Vui lòng thử lại.'));
    } finally {
      setPublishingId(null);
    }
  };

  // unpublish official template
  const handleUnpublishTemplate = async (templateId: string) => {
    if (!venue || !window.confirm(t('Bạn có chắc muốn hủy xuất bản sơ đồ này? Ban tổ chức sẽ không còn thấy mẫu này nữa.'))) return;
    setPublishingId(templateId);
    try {
      await venueApi.saveVenueSeatmapTemplate(venue.id, '');
      toast.success(t('Đã gỡ xuất bản sơ đồ mẫu.'));
      const updated = adminTemplates.map((t) => ({
        ...t,
        isPublished: false,
      }));
      saveLocalTemplates(updated);
      onTemplateUpdated?.();
    } catch {
      toast.error(t('Không thể gỡ xuất bản.'));
    } finally {
      setPublishingId(null);
    }
  };

  // duplicate template
  const handleDuplicateTemplate = (tpl: AdminSeatmapTemplateItem) => {
    const duplicated: AdminSeatmapTemplateItem = {
      ...tpl,
      id: `admin_tpl_${Date.now()}`,
      name: `${tpl.name} (Bản sao)`,
      isPublished: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const nextList = [duplicated, ...adminTemplates];
    saveLocalTemplates(nextList);
    setSelectedAdminTplId(duplicated.id);
    toast.success(t('Đã nhân bản sơ đồ mẫu!'));
  };

  // delete template
  const handleDeleteTemplate = (tpl: AdminSeatmapTemplateItem) => {
    if (!window.confirm(t('Bạn có chắc chắn muốn xóa sơ đồ mẫu "{{name}}"?', { name: tpl.name }))) return;
    if (tpl.isPublished) {
      venueApi.saveVenueSeatmapTemplate(venue!.id, '').catch(() => {});
    }
    const nextList = adminTemplates.filter((t) => t.id !== tpl.id);
    saveLocalTemplates(nextList);
    if (selectedAdminTplId === tpl.id) {
      setSelectedAdminTplId(nextList.length > 0 ? nextList[0].id : null);
    }
    toast.success(t('Đã xóa sơ đồ mẫu.'));
    onTemplateUpdated?.();
  };

  // edit template in Designer Studio
  const handleEditInStudio = (tpl: AdminSeatmapTemplateItem) => {
    if (!venue) return;
    // set active draft in localStorage
    try {
      localStorage.setItem(`admin_venue_seatmap_draft_${venue.id}`, JSON.stringify(tpl.data));
    } catch {
      // ignore
    }
    onClose();
    navigate(PATHS.ADMIN_VENUE_SEATMAP(venue.id));
  };

  // clone an Organizer's seatmap into Admin templates
  const handleCloneOrganizerSeatmap = (orgSeatmap: VenueOrganizerSeatmap) => {
    if (!venue) return;
    if (!isPublicVenue) {
      toast.error(t('Chỉ có thể tạo Sơ đồ mẫu cho Địa điểm công cộng.'));
      return;
    }
    if (!orgSeatmap.draftJson) {
      toast.error(t('Sơ đồ này chưa có dữ liệu thiết kế hợp lệ.'));
      return;
    }

    try {
      const parsed: SeatMapDocument = JSON.parse(orgSeatmap.draftJson);
      const rawZones = parsed.zones;
      const zonesList: ZoneBlock[] = Array.isArray(rawZones)
        ? (rawZones as ZoneBlock[])
        : rawZones && typeof rawZones === 'object'
        ? Object.values(rawZones)
        : [];
      const totalSeatsCount = parsed.seats?.length || 0;
      const standingCap = zonesList
        .filter((z) => !parsed.seats?.some((s) => s.zoneId === z.id))
        .reduce((acc: number, z: ZoneBlock): number => acc + (z.tierId ? (Number(z?.capacity) || 0) : 0), 0);
      const capacity = totalSeatsCount + standingCap || totalSeatsCount || 0;

      const newTpl: AdminSeatmapTemplateItem = {
        id: `cloned_admin_${Date.now()}`,
        name: `Mẫu từ sự kiện: ${orgSeatmap.eventTitle || 'BTC'}`,
        isPublished: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        data: parsed,
        capacity,
        totalSeats: parsed.seats?.length || 0,
        totalZones: zonesList.length,
      };

      const nextList = [newTpl, ...adminTemplates];
      saveLocalTemplates(nextList);
      setActiveTab('admin');
      setSelectedAdminTplId(newTpl.id);
      toast.success(t('Đã sao chép sơ đồ của Ban Tổ Chức thành Sơ đồ Mẫu Admin!'));
    } catch {
      toast.error(t('Không thể đọc dữ liệu sơ đồ của Ban tổ chức.'));
    }
  };

  // active previewed template
  const activeAdminTemplate = useMemo(() => {
    return adminTemplates.find((t) => t.id === selectedAdminTplId) || adminTemplates[0] || null;
  }, [adminTemplates, selectedAdminTplId]);

  // active previewed organizer seatmap
  const activeOrganizerSeatmap = useMemo(() => {
    if (!data?.organizerSeatmaps || data.organizerSeatmaps.length === 0) return null;
    return data.organizerSeatmaps[selectedOrgIndex] || null;
  }, [data?.organizerSeatmaps, selectedOrgIndex]);

  // parse active organizer doc for live SVG preview
  const activeOrganizerDoc = useMemo<SeatMapDocument | null>(() => {
    if (!activeOrganizerSeatmap?.draftJson) return null;
    try {
      return JSON.parse(activeOrganizerSeatmap.draftJson);
    } catch {
      return null;
    }
  }, [activeOrganizerSeatmap]);

  if (!isOpen || !venue) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 md:p-6 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl app-bg-card border app-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b app-border app-bg-subnav shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-600 flex items-center justify-center font-bold">
              <FiLayers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-extrabold app-text-main">
                  {t('Quản lý Sơ đồ Ghế (SeatMap)')}
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  {venue.name}
                </span>
                {isPublicVenue ? (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <FiGlobe className="w-3 h-3" /> {t('Địa điểm công cộng')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    <FiLock className="w-3 h-3" /> {t('Địa điểm riêng (BTC)')}
                  </span>
                )}
              </div>
              <p className="text-xs app-text-muted flex items-center gap-1.5 mt-0.5">
                <FiMapPin className="w-3.5 h-3.5 shrink-0" />
                <span>{venue.address}, {venue.city}</span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <FiUsers className="w-3.5 h-3.5 shrink-0" />
                <span>{venue.capacity.toLocaleString('vi-VN')} {t('chỗ')}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center app-text-muted hover:app-text-main hover:bg-slate-500/10 transition-colors cursor-pointer"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Private Venue Alert Banner */}
        {!isPublicVenue && (
          <div className="px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4 shrink-0" />
            <span>
              {t('Đây là địa điểm riêng tư do Ban tổ chức tự tạo. Quản trị viên chỉ có thể tạo và xuất bản Sơ đồ mẫu cho các Địa điểm công cộng.')}
            </span>
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex items-center justify-between px-6 pt-2 border-b app-border bg-slate-500/5 shrink-0">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'admin'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent app-text-muted hover:app-text-main'
              }`}
            >
              <FiLayers className="w-4 h-4" />
              <span>{t('Sơ đồ mẫu của Admin')} ({adminTemplates.length})</span>
              {adminTemplates.some((t) => t.isPublished) && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" title={t('Đã có mẫu xuất bản')} />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('organizers')}
              className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'organizers'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent app-text-muted hover:app-text-main'
              }`}
            >
              <FiUsers className="w-4 h-4" />
              <span>{t('Sơ đồ của Ban Tổ Chức')} ({data?.organizerSeatmaps?.length || 0})</span>
            </button>
          </div>

          {activeTab === 'admin' && isPublicVenue && (
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`${PATHS.ADMIN_VENUE_SEATMAP(venue.id)}?isNew=1`);
              }}
              className="mb-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <FiPlus className="w-3.5 h-3.5" />
              <span>{t('Thiết kế Sơ đồ mới')}</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden p-5 flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center py-20 gap-2.5 text-sm app-text-muted">
              <FiRefreshCw className="w-5 h-5 animate-spin text-blue-500" />
              <span>{t('Đang tải dữ liệu SeatMap...')}</span>
            </div>
          ) : activeTab === 'admin' ? (
            /* Tab 1: Admin Templates */
            adminTemplates.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <FiLayers className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h4 className="text-base font-bold app-text-main">
                    {t('Chưa có Sơ đồ mẫu nào cho địa điểm này')}
                  </h4>
                  <p className="text-xs app-text-muted leading-relaxed">
                    {isPublicVenue
                      ? t('Quản trị viên có thể tạo nhiều sơ đồ mẫu khác nhau. Mẫu nào được Xuất bản sẽ hiển thị cho Ban tổ chức xem và áp dụng khi tổ chức sự kiện.')
                      : t('Địa điểm này là địa điểm riêng tư của Ban tổ chức. Không được phép tạo sơ đồ mẫu công cộng.')}
                  </p>
                </div>
                {isPublicVenue && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate(`${PATHS.ADMIN_VENUE_SEATMAP(venue.id)}?isNew=1`);
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <FiPlus className="w-4 h-4" />
                    <span>{t('Tạo Sơ đồ mẫu đầu tiên ngay')}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full overflow-hidden">
                {/* Left: Templates list (7 cols) */}
                <div className="lg:col-span-7 flex flex-col overflow-y-auto space-y-3 pr-1">
                  <div className="text-[11px] font-bold app-text-muted uppercase tracking-wider mb-0.5">
                    {t('Danh sách Sơ đồ mẫu đã tạo')} ({adminTemplates.length}):
                  </div>
                  {adminTemplates.map((tpl) => {
                    const isSelected = tpl.id === activeAdminTemplate?.id;
                    const isPublishing = publishingId === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => setSelectedAdminTplId(tpl.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 ${
                          isSelected
                            ? 'app-bg-subnav border-blue-500/60 ring-2 ring-blue-500/20 shadow-md'
                            : 'app-bg-card app-border hover:border-slate-400/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="text-sm font-extrabold app-text-main truncate">
                                {tpl.name}
                              </h5>
                              {tpl.isPublished ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                  <FiCheckCircle className="w-3 h-3" />
                                  <span>{t('Đang Xuất Bản (Chính Thức)')}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/10 text-slate-500 border border-slate-500/20">
                                  <span>{t('Bản nháp / Mẫu phụ')}</span>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs app-text-muted flex-wrap">
                              <span className="flex items-center gap-1">
                                <FiUsers className="w-3 h-3 text-blue-500" />
                                <span>{tpl.capacity.toLocaleString('vi-VN')} {t('sức chứa')}</span>
                              </span>
                              <span className="text-slate-300 dark:text-slate-700">•</span>
                              <span className="flex items-center gap-1">
                                <FiLayers className="w-3 h-3 text-indigo-500" />
                                <span>{tpl.totalZones} {t('khu vực')}</span>
                              </span>
                              <span className="text-slate-300 dark:text-slate-700">•</span>
                              <span>{tpl.totalSeats} {t('ghế ngồi')}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t app-border">
                          <div className="flex items-center gap-2">
                            {tpl.isPublished ? (
                              <button
                                type="button"
                                disabled={isPublishing}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnpublishTemplate(tpl.id);
                                }}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                              >
                                {isPublishing ? t('Đang xử lý...') : t('Hủy xuất bản')}
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isPublishing || !isPublicVenue}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePublishTemplate(tpl);
                                }}
                                className="px-3 py-1 rounded-lg text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <FiSend className="w-3 h-3" />
                                <span>{isPublishing ? t('Đang lưu...') : t('Xuất bản cho BTC')}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditInStudio(tpl);
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <FiEdit className="w-3 h-3" />
                              <span>{t('Chỉnh sửa')}</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateTemplate(tpl);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-500/10 transition-colors cursor-pointer"
                              title={t('Nhân bản sơ đồ mẫu này')}
                            >
                              <FiCopy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTemplate(tpl);
                              }}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title={t('Xóa sơ đồ mẫu')}
                            >
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right: Live Interactive SVG Visual Preview (5 cols) */}
                <div className="lg:col-span-5 p-4 rounded-xl app-bg-subnav border app-border flex flex-col justify-between overflow-y-auto space-y-4">
                  {activeAdminTemplate ? (
                    <div className="space-y-3.5 flex-1 flex flex-col">
                      <div className="flex items-center justify-between border-b app-border pb-2.5">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-500 flex items-center gap-1">
                            <FiEye className="w-3.5 h-3.5" /> {t('Live Preview Sơ Đồ')}
                          </span>
                          <h4 className="text-sm font-extrabold app-text-main mt-0.5 truncate max-w-[240px]">
                            {activeAdminTemplate.name}
                          </h4>
                        </div>
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-mono font-bold">
                          {activeAdminTemplate.capacity.toLocaleString('vi-VN')} {t('khán giả')}
                        </span>
                      </div>

                      {/* SVG Live Preview */}
                      <div className="relative w-full h-56 rounded-xl bg-slate-950 border border-slate-800 p-2 overflow-hidden flex items-center justify-center shadow-inner">
                        <svg className="w-full h-full" viewBox="0 0 1000 650" preserveAspectRatio="xMidYMid meet">
                          <defs>
                            <pattern id="adminPreviewGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                            </pattern>
                          </defs>
                          <rect width="100%" height="100%" fill="url(#adminPreviewGrid)" />

                          {/* Stages */}
                          {(activeAdminTemplate.data.stages || []).map((stg, idx) => (
                            <g key={idx} transform={`translate(${stg.x}, ${stg.y}) rotate(${stg.rotation || 0})`}>
                              <rect
                                width={stg.width || 400}
                                height={stg.height || 100}
                                rx="12"
                                fill={stg.color || '#6366f1'}
                                stroke="#818cf8"
                                strokeWidth="2"
                              />
                              <text
                                x={(stg.width || 400) / 2}
                                y={(stg.height || 100) / 2}
                                fill="#ffffff"
                                fontSize="22"
                                fontWeight="bold"
                                textAnchor="middle"
                                dominantBaseline="middle"
                              >
                                {stg.label || 'SÂN KHẤU CHÍNH'}
                              </text>
                            </g>
                          ))}

                          {/* Zones */}
                          {Object.values(activeAdminTemplate.data.zones || {}).map((zone, idx) => (
                            <g key={idx} transform={`translate(${zone.x}, ${zone.y}) rotate(${zone.rotation || 0})`}>
                              <rect
                                width={zone.width || 250}
                                height={zone.height || 150}
                                rx={12}
                                fill={zone.color || '#3b82f6'}
                                fillOpacity="0.3"
                                stroke={zone.color || '#3b82f6'}
                                strokeWidth="3"
                              />
                              <text
                                x={(zone.width || 250) / 2}
                                y={(zone.height || 150) / 2}
                                fill="#ffffff"
                                fontSize="18"
                                fontWeight="bold"
                                textAnchor="middle"
                                dominantBaseline="middle"
                              >
                                {zone.name || `KHU VỰC ${idx + 1}`}
                              </text>
                            </g>
                          ))}

                          {/* Seats sample */}
                          {(activeAdminTemplate.data.seats || []).slice(0, 160).map((seat, idx) => {
                            const zColor = (activeAdminTemplate.data.zones as any)?.[seat.zoneId]?.color || '#3b82f6';
                            return (
                              <circle
                                key={idx}
                                cx={seat.x}
                                cy={seat.y}
                                r="6"
                                fill={zColor}
                                stroke="#ffffff"
                                strokeWidth="1"
                              />
                            );
                          })}
                        </svg>
                      </div>

                      {/* Zone breakdown stats */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold app-text-muted uppercase tracking-wider">
                          {t('Phân khu trong sơ đồ')} ({activeAdminTemplate.totalZones}):
                        </span>
                        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1">
                          {Object.values(activeAdminTemplate.data.zones || {}).map((z, idx) => {
                            const zoneSeatsCount = (activeAdminTemplate.data.seats || []).filter((s) => s.zoneId === z.id).length;
                            return (
                              <div
                                key={idx}
                                className="p-2 rounded-lg app-bg-card border app-border flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: z.color || '#3b82f6' }} />
                                  <span className="font-bold app-text-main truncate">{z.name}</span>
                                </div>
                                <span className="text-slate-400 font-mono text-[11px] shrink-0">
                                  {z.tierId ? (
                                    `${zoneSeatsCount || z.capacity || 0} vé`
                                  ) : zoneSeatsCount > 0 ? (
                                    `${zoneSeatsCount} ghế`
                                  ) : (
                                    <span className="text-amber-500/90 dark:text-amber-400/90 text-[10px] font-medium">
                                      {t('Chưa gán hạng vé')}
                                    </span>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )
          ) : (
            /* Tab 2: Organizer Seatmaps */
            (!data?.organizerSeatmaps || data.organizerSeatmaps.length === 0) ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <FiUsers className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h4 className="text-base font-bold app-text-main">
                    {t('Chưa có Sơ đồ nào từ Ban Tổ Chức')}
                  </h4>
                  <p className="text-xs app-text-muted leading-relaxed">
                    {t('Khi các Ban tổ chức tạo sự kiện tại địa điểm này và thiết kế sơ đồ ghế riêng, sơ đồ của họ sẽ hiển thị tại đây để Quản trị viên tham khảo hoặc sao chép thành mẫu chuẩn.')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full overflow-hidden">
                {/* Left: Organizer Seatmaps list (7 cols) */}
                <div className="lg:col-span-7 flex flex-col overflow-y-auto space-y-3 pr-1">
                  <div className="text-[11px] font-bold app-text-muted uppercase tracking-wider mb-0.5">
                    {t('Sơ đồ do Ban Tổ Chức thiết kế cho các sự kiện')} ({data.organizerSeatmaps.length}):
                  </div>
                  {data.organizerSeatmaps.map((s, idx) => {
                    const isSelected = idx === selectedOrgIndex;
                    let parsedCap = 0;
                    let parsedSeats = 0;
                    let parsedZones = 0;
                    try {
                      if (s.draftJson) {
                        const parsed: SeatMapDocument = JSON.parse(s.draftJson);
                        parsedSeats = parsed.seats?.length || 0;
                        const zList: ZoneBlock[] = parsed.zones
                          ? Array.isArray(parsed.zones)
                            ? (parsed.zones as ZoneBlock[])
                            : Object.values(parsed.zones)
                          : [];
                        parsedZones = zList.length;
                        const standingCap = zList
                          .filter((z) => !parsed.seats?.some((s) => s.zoneId === z.id))
                          .reduce((acc: number, z: ZoneBlock): number => acc + (z.tierId ? (Number(z?.capacity) || 0) : 0), 0);
                        parsedCap = parsedSeats + standingCap || parsedSeats;
                      }
                    } catch {
                      // ignore
                    }

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedOrgIndex(idx)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 ${
                          isSelected
                            ? 'app-bg-subnav border-indigo-500/60 ring-2 ring-indigo-500/20 shadow-md'
                            : 'app-bg-card app-border hover:border-slate-400/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <h5 className="text-sm font-extrabold app-text-main truncate">
                              {s.eventTitle || t('Sự kiện chưa đặt tên')}
                            </h5>
                            <div className="flex items-center gap-3 text-xs app-text-muted flex-wrap">
                              <span className="flex items-center gap-1 font-mono">
                                <FiCalendar className="w-3 h-3 text-indigo-500" />
                                <span>{t('Sự kiện ID')}: #{s.eventId}</span>
                              </span>
                              <span className="text-slate-300 dark:text-slate-700">•</span>
                              <span className="flex items-center gap-1">
                                <FiUsers className="w-3 h-3 text-emerald-500" />
                                <span>{parsedCap.toLocaleString('vi-VN')} {t('sức chứa')}</span>
                              </span>
                              <span className="text-slate-300 dark:text-slate-700">•</span>
                              <span>{parsedSeats} {t('ghế')}</span>
                              <span className="text-slate-300 dark:text-slate-700">•</span>
                              <span>{parsedZones} {t('khu vực')}</span>
                            </div>
                          </div>
                        </div>

                        {/* Clone action */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t app-border">
                          <span className="text-[11px] text-slate-400">
                            {s.seatLayoutId ? `Layout: #${s.seatLayoutId}` : ''}
                          </span>
                          {isPublicVenue && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCloneOrganizerSeatmap(s);
                              }}
                              className="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <FiCopy className="w-3 h-3" />
                              <span>{t('Sao chép thành Mẫu Admin')}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right: Live Interactive SVG Visual Preview (5 cols) */}
                <div className="lg:col-span-5 p-4 rounded-xl app-bg-subnav border app-border flex flex-col justify-between overflow-y-auto space-y-4">
                  {activeOrganizerSeatmap && activeOrganizerDoc ? (
                    <div className="space-y-3.5 flex-1 flex flex-col">
                      <div className="flex items-center justify-between border-b app-border pb-2.5">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-500 flex items-center gap-1">
                            <FiEye className="w-3.5 h-3.5" /> {t('Sơ đồ sự kiện của BTC')}
                          </span>
                          <h4 className="text-sm font-extrabold app-text-main mt-0.5 truncate max-w-[240px]">
                            {activeOrganizerSeatmap.eventTitle}
                          </h4>
                        </div>
                      </div>

                      {/* SVG Live Preview */}
                      <div className="relative w-full h-56 rounded-xl bg-slate-950 border border-slate-800 p-2 overflow-hidden flex items-center justify-center shadow-inner">
                        <svg className="w-full h-full" viewBox="0 0 1000 650" preserveAspectRatio="xMidYMid meet">
                          <defs>
                            <pattern id="orgPreviewGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                            </pattern>
                          </defs>
                          <rect width="100%" height="100%" fill="url(#orgPreviewGrid)" />

                          {/* Stages */}
                          {(activeOrganizerDoc.stages || []).map((stg, idx) => (
                            <g key={idx} transform={`translate(${stg.x}, ${stg.y}) rotate(${stg.rotation || 0})`}>
                              <rect
                                width={stg.width || 400}
                                height={stg.height || 100}
                                rx="12"
                                fill={stg.color || '#6366f1'}
                                stroke="#818cf8"
                                strokeWidth="2"
                              />
                              <text
                                x={(stg.width || 400) / 2}
                                y={(stg.height || 100) / 2}
                                fill="#ffffff"
                                fontSize="22"
                                fontWeight="bold"
                                textAnchor="middle"
                                dominantBaseline="middle"
                              >
                                {stg.label || 'SÂN KHẤU CHÍNH'}
                              </text>
                            </g>
                          ))}

                          {/* Zones */}
                          {Object.values(activeOrganizerDoc.zones || {}).map((zone, idx) => (
                            <g key={idx} transform={`translate(${zone.x}, ${zone.y}) rotate(${zone.rotation || 0})`}>
                              <rect
                                width={zone.width || 250}
                                height={zone.height || 150}
                                rx={12}
                                fill={zone.color || '#3b82f6'}
                                fillOpacity="0.3"
                                stroke={zone.color || '#3b82f6'}
                                strokeWidth="3"
                              />
                              <text
                                x={(zone.width || 250) / 2}
                                y={(zone.height || 150) / 2}
                                fill="#ffffff"
                                fontSize="18"
                                fontWeight="bold"
                                textAnchor="middle"
                                dominantBaseline="middle"
                              >
                                {zone.name || `KHU VỰC ${idx + 1}`}
                              </text>
                            </g>
                          ))}

                          {/* Seats sample */}
                          {(activeOrganizerDoc.seats || []).slice(0, 160).map((seat, idx) => {
                            const zColor = (activeOrganizerDoc.zones as any)?.[seat.zoneId]?.color || '#3b82f6';
                            return (
                              <circle
                                key={idx}
                                cx={seat.x}
                                cy={seat.y}
                                r="6"
                                fill={zColor}
                                stroke="#ffffff"
                                strokeWidth="1"
                              />
                            );
                          })}
                        </svg>
                      </div>

                      {/* Zone breakdown stats */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold app-text-muted uppercase tracking-wider">
                          {t('Phân khu trong sơ đồ')}:
                        </span>
                        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1">
                          {Object.values(activeOrganizerDoc.zones || {}).map((z, idx) => {
                            const zoneSeatsCount = (activeOrganizerDoc.seats || []).filter((s) => s.zoneId === z.id).length;
                            return (
                              <div
                                key={idx}
                                className="p-2 rounded-lg app-bg-card border app-border flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: z.color || '#3b82f6' }} />
                                  <span className="font-bold app-text-main truncate">{z.name}</span>
                                </div>
                                <span className="text-slate-400 font-mono text-[11px] shrink-0">
                                  {z.tierId ? (
                                    `${zoneSeatsCount || z.capacity || 0} vé`
                                  ) : zoneSeatsCount > 0 ? (
                                    `${zoneSeatsCount} ghế`
                                  ) : (
                                    <span className="text-amber-500/90 dark:text-amber-400/90 text-[10px] font-medium">
                                      {t('Chưa gán hạng vé')}
                                    </span>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
