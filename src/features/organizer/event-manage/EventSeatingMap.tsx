import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBlocker, useParams } from 'react-router-dom';
import { ticketApi } from '@/services/ticketApi';
import { venueApi } from '@/services/venueApi';
import { eventApi } from '@/services/eventApi';
import { isForbiddenError } from '@/utils/httpError';
import { useStickyTopOffset } from '@/hooks/useStickyTopOffset';
import type { CSSProperties } from 'react';
import { extractSvgShapes, shapesToZones } from '@/utils/svgImport';

import {
  FiCamera,
  FiCheck,
  FiCheckCircle,
  FiCopy,
  FiDownload,
  FiLayers,
  FiRefreshCw,
  FiSave,
  FiSend,
  FiTag,
  FiTrash2,
  FiUpload,
  FiX,
} from 'react-icons/fi';
import { ToastContainer, type ToastMessage } from './components/seating/SeatingToast';
import ConfirmModal from '@/components/common/ConfirmModal';
import type {
  CanvasSettings,
  HistoryState,
  Seat,
  SeatMapDocument,
  SeatTier,
  StageElement,
  StructureElement,
  VenueTemplate,
  ZoneBlock,
  AddArcConfig,
  AddMatrixConfig,
  AddRowConfig,
  AddZoneConfig,
} from '@/types/seating';
import { SeatCanvas } from './components/seating/SeatCanvas';
import { ToolBar } from './components/seating/ToolBar';
import { PropertyPanel } from './components/seating/PropertyPanel';
import { AttendeePreview } from './components/seating/AttendeePreview';
import { VenueTemplateModal } from './components/seating/VenueTemplateModal';
import { TierManagerModal } from './components/seating/TierManagerModal';
import { SeatMapStats } from './components/seating/SeatMapStats';
import { SeatMapIssuesPanel } from './components/seating/SeatMapIssuesPanel';
import { ShortcutsDialog } from './components/seating/ShortcutsDialog';
import type { SeatCanvasExtraProps } from './components/seating/SeatCanvas';
import {
  buildClipboard,
  nudgeSelection,
  pasteClipboard,
  type SeatMapClipboard,
  type SeatMapLayout,
  type SeatMapSelection,
} from './seatMapEditing';
import { validateSeatMap, countIssues, type SeatMapIssue } from './seatMapValidation';
import {
  chooseNewerDraft,
  deepEqual,
  documentTimestamp,
  hasLayoutContent,
  readLocalDraft,
  writeLocalDraft,
  type DraftStorage,
} from './seatMapDraft';
import { PRESET_TEMPLATES } from '@/mock/presetTemplates';
import {
  buildSeatMapDocument,
  cloneTemplateForCurrentEvent,
  DEFAULT_CANVAS_SETTINGS,
  generateSeatMapSVG,
  getRowLabel,
  isSeatInsideZone,
  safeClone,
} from '@/utils/seatMapHelpers';

/** Dung lượng tối đa của file SVG được nhập (byte). */
const MAX_SVG_IMPORT_BYTES = 2 * 1024 * 1024;

/** Props của studio sơ đồ ghế: tên sự kiện, các hạng vé, sơ đồ ban đầu và hàm gọi sau khi lưu thành công. */
interface EventSeatingMapProps {
  eventName?: string;
  ticketTiers?: SeatTier[];
  initialMap?: SeatMapDocument | null;
  onSave?: (payload: SeatMapDocument) => Promise<void> | void;
}

/** Ảnh chụp trạng thái studio (ghế, sân khấu, cấu trúc, khu, cài đặt canvas) dùng cho lịch sử hoàn tác. */
interface StudioSnapshot extends HistoryState {
  canvasSettings: CanvasSettings;
}

/** Chuẩn hóa {@code tierId} của các khu khi nhập sơ đồ: giữ ID hợp lệ, ID lạ thì khớp theo tên hạng vé, đồng thời bỏ giá riêng của khu. */
const normalizeImportedTierIds = (
  zones: Record<string, ZoneBlock>,
  tiers: SeatTier[]
): Record<string, ZoneBlock> => {
  const validIds = new Set(tiers.map((tier) => tier.id));
  return Object.fromEntries(
    Object.entries(zones).map(([id, zone]) => {
      let matchedTierId: string | undefined = undefined;
      if (zone.tierId) {
        if (validIds.has(zone.tierId)) {
          matchedTierId = zone.tierId;
        } else {
          const matchByName = tiers.find(
            (t) => t.name.toLowerCase().trim() === zone.name.toLowerCase().trim()
          );
          if (matchByName) {
            matchedTierId = matchByName.id;
          } else {
            matchedTierId = zone.tierId;
          }
        }
      }
      return [
        id,
        {
          ...zone,
          tierId: matchedTierId,
          price: undefined,
        },
      ];
    })
  );
};

/** Lấy {@code localStorage} cho mã bản nháp; nếu truy cập bị chặn (tắt dữ liệu trang, cửa sổ riêng tư) thì trả storage giả có {@code setItem} ném lỗi để lỗi lưu không bị bỏ sót. */
const browserStorage = (): DraftStorage => {
  try {
    return window.localStorage;
  } catch {
    return {
      /** Storage giả: không có dữ liệu nào. */
      getItem: () => null,
      /** Storage giả: luôn ném lỗi vì {@code localStorage} không dùng được. */
      setItem: () => {
        throw new Error('localStorage is not available');
      },
    };
  }
};

/**
 * Studio thiết kế sơ đồ ghế của sự kiện: canvas vẽ ghế, khu, sân khấu và cấu trúc phụ, lịch sử hoàn tác, mẫu địa điểm, quản lý hạng vé,
 * tự động lưu nháp (cục bộ rồi lên máy chủ), kiểm tra lỗi và xuất bản sơ đồ chính thức.
 */
export const EventSeatingMap: React.FC<EventSeatingMapProps> = ({
  eventName = 'Sự kiện mới',
  ticketTiers,
  initialMap,
  onSave,
}) => {
  const { t } = useTranslation();
  const { eventId: urlEventId } = useParams<{ eventId: string }>();
  const activeEventId = urlEventId || 'e045ea48-2a1b-4914-8d90-3e29ff7cce03';

  const [backendTiers, setBackendTiers] = useState<SeatTier[]>([]);

  const effectiveTiers = useMemo(
    () => (backendTiers.length ? backendTiers : (ticketTiers?.length ? ticketTiers : [])),
    [backendTiers, ticketTiers]
  );
  const defaultTemplate = PRESET_TEMPLATES[0];
  const defaultLayout = useMemo(
    () => cloneTemplateForCurrentEvent(defaultTemplate, effectiveTiers),
    [defaultTemplate, effectiveTiers]
  );

  // khởi tạo ảnh chụp ban đầu
  const initialSnapshot = useMemo<StudioSnapshot>(() => {
    if (initialMap) {
      return {
        seats: safeClone(initialMap.seats || []),
        stages: safeClone(initialMap.stages || []),
        structures: safeClone(initialMap.structures || []),
        zones: normalizeImportedTierIds(safeClone(initialMap.zones || {}), effectiveTiers),
        canvasSettings: { ...DEFAULT_CANVAS_SETTINGS, ...(initialMap.canvasSettings || {}) },
      };
    }
    return {
      seats: [],
      stages: [],
      structures: [],
      zones: {},
      canvasSettings: safeClone(DEFAULT_CANVAS_SETTINGS),
    };
  }, [defaultLayout, effectiveTiers, initialMap]);

  // khai báo các state của studio
  const [seats, setSeats] = useState<Seat[]>(initialSnapshot.seats);
  const [stages, setStages] = useState<StageElement[]>(initialSnapshot.stages);
  const [structures, setStructures] = useState<StructureElement[]>(initialSnapshot.structures);
  const [zones, setZones] = useState<Record<string, ZoneBlock>>(initialSnapshot.zones);
  const [canvasSettings, setCanvasSettings] = useState<CanvasSettings>(initialSnapshot.canvasSettings);

  const [history, setHistory] = useState<StudioSnapshot[]>([safeClone(initialSnapshot)]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyIndexRef = useRef(0);

  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const [isAttendeeMode, _setIsAttendeeMode] = useState(false);
  const [attendeeCart, setAttendeeCart] = useState<Seat[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // cột công cụ dính ngay dưới thanh tiêu đề khi cuộn trang; ở toàn màn hình thì mỗi cột tự cuộn trong khung
  const stickyTop = useStickyTopOffset(!isFullscreen);
  const sideColumnStyle: CSSProperties = isFullscreen ? { alignSelf: 'stretch' } : { position: 'sticky', top: stickyTop };
  const panelColumnStyle: CSSProperties = isFullscreen
    ? { height: '100%', overflowY: 'auto' }
    : { position: 'sticky', top: stickyTop, maxHeight: `calc(100vh - ${stickyTop + 16}px)`, overflowY: 'auto' };
  const studioRef = useRef<HTMLDivElement | null>(null);

  const [templates, setTemplates] = useState<VenueTemplate[]>(PRESET_TEMPLATES);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplate.id);

  const [isJSONModalOpen, setIsJSONModalOpen] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>(() => t('Đã tự động lưu nháp'));
  const [layoutStatus, setLayoutStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  // số lần sửa do người dùng thực hiện (không tính khi tải dữ liệu) và phiên bản sửa gần nhất đã lên máy chủ: chưa lưu = đang đi trước nó
  const [editVersion, setEditVersion] = useState(0);
  const [savedVersion, setSavedVersion] = useState(0);
  const editCounterRef = useRef(0);
  const layoutSettledRef = useRef(false);
  const unsaved = editVersion > savedVersion;
  const unsavedRef = useRef(false);
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);
  const autoSaveFailedRef = useRef(false);
  const localDraftFailedRef = useRef(false);
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [focusRequest, setFocusRequest] = useState<SeatCanvasExtraProps['focusRequest']>(null);
  const clipboardRef = useRef<SeatMapClipboard | null>(null);
  const pasteCountRef = useRef(0);
  const idCounterRef = useRef(0);

  /** Ghi nhận một lần sửa của người dùng bằng cách tăng bộ đếm phiên bản sửa. */
  const markEdited = () => {
    editCounterRef.current += 1;
    setEditVersion(editCounterRef.current);
  };

  const [eventVenue, setEventVenue] = useState<{ id?: string; name?: string; address?: string } | null>(null);
  const [previousSnapshotBeforePreset, setPreviousSnapshotBeforePreset] = useState<StudioSnapshot | null>(null);

  /** Quay lại sơ đồ trước khi áp dụng mẫu địa điểm (nếu có bản lưu), đồng thời ghi vào lịch sử. */
  const handleRevertToPreviousVersion = () => {
    if (!previousSnapshotBeforePreset) return;
    applySnapshot(previousSnapshotBeforePreset);
    latestRef.current = previousSnapshotBeforePreset;
    pushHistory(previousSnapshotBeforePreset);
    setPreviousSnapshotBeforePreset(null);
    showToast('info', t('Đã khôi phục lại phiên bản sơ đồ trước khi áp dụng mẫu.'));
  };

  /** Hiện toast trong 4 giây rồi tự ẩn. */
  const showToast = (type: 'success' | 'error' | 'warning' | 'info', text: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const [isPropertyPanelCollapsed, setIsPropertyPanelCollapsed] = useState(false);
  const [lastClickedPos, setLastClickedPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedZoneModal, setSelectedZoneModal] = useState<ZoneBlock | null>(null);
  const [zoneTicketQuantity, setZoneTicketQuantity] = useState<number>(1);

  const latestRef = useRef<StudioSnapshot>(initialSnapshot);
  useEffect(() => {
    latestRef.current = { seats, stages, structures, zones, canvasSettings };
  }, [canvasSettings, seats, stages, structures, zones]);

  // tải địa điểm hiện tại của sự kiện từ CSDL
  useEffect(() => {
    /** Lấy sự kiện rồi ghép địa điểm theo tên (khớp một phần, không phân biệt hoa thường) với danh sách địa điểm; không khớp thì dùng tên địa điểm của sự kiện. */
    const fetchEventVenue = async () => {
      try {
        const ev = await eventApi.getEventById(activeEventId);
        if (ev) {
          const locName = (ev.locationName as string) || (ev.address as string) || '';
          const venues = await venueApi.getVenues();
          const matched = venues.find(v => 
            (locName && v.name && v.name.toLowerCase().includes(locName.toLowerCase())) ||
            (locName && v.name && locName.toLowerCase().includes(v.name.toLowerCase()))
          );
          if (matched) {
            setEventVenue({ id: String(matched.id), name: matched.name, address: matched.address });
          } else if (locName) {
            setEventVenue({ name: locName, address: ev.address as string });
          }
        }
      } catch (e) {
        console.warn("Could not load event venue for seating map", e);
      }
    };
    fetchEventVenue();
  }, [activeEventId]);

  // tải các địa điểm thật từ Backend API qua {@code venueApi}
  useEffect(() => {
    /** Tải danh sách địa điểm đã xác minh và dựng mỗi địa điểm thành các mẫu sơ đồ hệ thống (concert, sân vận động, sân khấu trung tâm). */
    const fetchVenues = async () => {
      try {
        const venues = await venueApi.getVenues();
        if (venues && venues.length > 0) {
          const venueTemplates: VenueTemplate[] = [];
          venues.forEach((v: any, idx: number) => {
            if (v.verified === false) return; // chỉ lấy địa điểm công khai đã xác minh

            // biến thể bố cục 1: sân khấu concert và âm nhạc
            const preset1 = PRESET_TEMPLATES[idx % PRESET_TEMPLATES.length] || PRESET_TEMPLATES[0];
            venueTemplates.push({
              id: `venue_${v.id}_concert`,
              name: `${v.name} - ${t('Sơ đồ Concert & Âm Nhạc')}`,
              address: v.address,
              city: v.city,
              capacity: v.capacity || preset1.capacity || 5000,
              description: `${t('Địa điểm công cộng')}: ${v.name} (${v.address || ''}, ${v.city || ''}). ${t('Sơ đồ bố cục biểu diễn Concert Sân khấu chính.')}`,
              source: 'system',
              stages: safeClone(preset1.stages || []),
              structures: safeClone(preset1.structures || []),
              seats: safeClone(preset1.seats || []),
              zones: safeClone(preset1.zones || {}),
              canvasSettings: safeClone(preset1.canvasSettings || DEFAULT_CANVAS_SETTINGS),
            });

            // biến thể bố cục 2: khán đài thể thao và đấu trường
            const preset2 = PRESET_TEMPLATES[(idx + 1) % PRESET_TEMPLATES.length] || PRESET_TEMPLATES[1];
            if (preset2) {
              venueTemplates.push({
                id: `venue_${v.id}_sports`,
                name: `${v.name} - ${t('Sơ đồ Thể Thao & Khán Đài')}`,
                address: v.address,
                city: v.city,
                capacity: v.capacity ? Math.round(v.capacity * 0.9) : 4500,
                description: `${t('Địa điểm công cộng')}: ${v.name} (${v.address || ''}, ${v.city || ''}). ${t('Sơ đồ bố cục Giải đấu thể thao & Khán đài.')}`,
                source: 'system',
                stages: safeClone(preset2.stages || []),
                structures: safeClone(preset2.structures || []),
                seats: safeClone(preset2.seats || []),
                zones: safeClone(preset2.zones || {}),
                canvasSettings: safeClone(preset2.canvasSettings || DEFAULT_CANVAS_SETTINGS),
              });
            }

            // biến thể bố cục 3: đấu trường 360 độ với sân khấu ở giữa
            const preset3 = PRESET_TEMPLATES[(idx + 2) % PRESET_TEMPLATES.length] || PRESET_TEMPLATES[2];
            if (preset3) {
              venueTemplates.push({
                id: `venue_${v.id}_arena360`,
                name: `${v.name} - ${t('Sơ đồ Sân Khấu Tròn 360°')}`,
                address: v.address,
                city: v.city,
                capacity: v.capacity ? Math.round(v.capacity * 1.1) : 6000,
                description: `${t('Địa điểm công cộng')}: ${v.name} (${v.address || ''}, ${v.city || ''}). ${t('Sơ đồ bố cục Sân khấu trung tâm 360 độ góc nhìn đa chiều.')}`,
                source: 'system',
                stages: safeClone(preset3.stages || []),
                structures: safeClone(preset3.structures || []),
                seats: safeClone(preset3.seats || []),
                zones: safeClone(preset3.zones || {}),
                canvasSettings: safeClone(preset3.canvasSettings || DEFAULT_CANVAS_SETTINGS),
              });
            }
          });

          setTemplates((prev) => [...venueTemplates, ...prev.filter((t) => !t.id.startsWith('venue_'))]);
        }
      } catch {
        // nếu API chưa sẵn sàng thì dùng các mẫu có sẵn
      }
    };
    fetchVenues();
  }, []);

  /** Dựng ảnh chụp studio từ tài liệu sơ đồ, bổ sung giá trị mặc định cho phần thiếu. */
  const snapshotFromDocument = (doc: Partial<SeatMapDocument>): StudioSnapshot => ({
    seats: safeClone(doc.seats || []),
    stages: safeClone(doc.stages || []),
    structures: safeClone(doc.structures || []),
    zones: safeClone(doc.zones || {}),
    canvasSettings: { ...DEFAULT_CANVAS_SETTINGS, ...(doc.canvasSettings || {}) },
  });

  /**
   * Đề nghị khôi phục bản nháp lưu trong trình duyệt khi nó rõ ràng mới hơn bản trên máy chủ (tải lên lỗi, đóng tab).
   * Không bao giờ tự áp dụng ngầm: người dùng quyết định qua hộp xác nhận.
   *
   * @param serverSavedAt thời điểm lưu của bản trên máy chủ, hoặc {@code null} nếu chưa có
   */
  const offerLocalDraft = (serverSavedAt: number | null) => {
    const local = readLocalDraft(browserStorage(), activeEventId);
    if (!local || !hasLayoutContent(local.doc)) return;
    if (chooseNewerDraft(local.savedAt, serverSavedAt) !== 'local') return;
    const when = local.savedAt ? new Date(local.savedAt).toLocaleString('vi-VN') : '';
    setConfirmModal({
      isOpen: true,
      title: t('Khôi phục bản nháp trên trình duyệt?'),
      message: `${t('Trình duyệt đang giữ một bản nháp chưa được lưu lên máy chủ, mới hơn bản đã lưu')} (${when}). ${t('Khôi phục bản nháp này?')}`,
      type: 'info',
      /** Áp bản nháp cục bộ vào studio, đặt lại lịch sử và đánh dấu là chưa lên máy chủ. */
      onConfirm: () => {
        const snapshot = snapshotFromDocument(local.doc);
        applySnapshot(snapshot);
        latestRef.current = snapshot;
        setHistory([safeClone(snapshot)]);
        setHistoryIndex(0);
        historyIndexRef.current = 0;
        markEdited(); // vẫn phải được gửi lên máy chủ
        setConfirmModal(null);
      },
    });
  };

  // tải các hạng vé và sơ đồ ghế đã có từ Backend API qua {@code ticketApi}
  useEffect(() => {
    if (!activeEventId) return;
    /** Tải hạng vé rồi sơ đồ ghế (bản nháp hoặc bản đã xuất bản) của sự kiện; xong thì cho phép tự động lưu và đề nghị bản nháp cục bộ nếu có. */
    const fetchLayoutAndTypes = async () => {
      let serverSavedAt: number | null = null;
      try {
        // tải hạng vé qua {@code ticketApi}
        const typesList = await ticketApi.getTicketTypesByEventId(activeEventId);
        if (typesList && typesList.length > 0) {
          const colors = ['#f59e0b', '#9333ea', '#2563eb', '#10b981', '#f97316', '#ec4899', '#475569', '#06b6d4'];
          const mappedTiers: SeatTier[] = typesList.map((t: any, idx: number) => ({
            id: t.id,
            name: t.name,
            price: t.price || 0,
            color: colors[idx % colors.length],
            isFree: t.isFree ?? t.price === 0,
            totalQuantity: t.totalQuantity ?? 100,
            minPerOrder: t.minPerOrder ?? 1,
            maxPerOrder: t.maxPerOrder ?? 5,
            startSaleDate: t.startSaleDate || undefined,
            endSaleDate: t.endSaleDate || undefined,
            description: t.description || undefined,
          }));
          setBackendTiers(mappedTiers);
        }

        // tải sơ đồ qua {@code ticketApi}
        const layoutData = await ticketApi.getSeatLayoutByEventId(activeEventId);
        if (layoutData) {
          if (layoutData.status) {
            setLayoutStatus((layoutData.status as any) === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT');
          }
          if (layoutData.draftJson) {
            try {
              const parsedDoc = JSON.parse(layoutData.draftJson) as SeatMapDocument;
              serverSavedAt = documentTimestamp(parsedDoc);
              const snapshot = snapshotFromDocument(parsedDoc);
              applySnapshot(snapshot);
              latestRef.current = snapshot;
              setHistory([safeClone(snapshot)]);
              setHistoryIndex(0);
              historyIndexRef.current = 0;
              return;
            } catch (e) {
              console.warn('Failed to parse draftJson', e);
            }
          }

          if (layoutData.zones && Array.isArray(layoutData.zones) && layoutData.zones.length > 0) {
            const zonesMap: Record<string, ZoneBlock> = {};
            layoutData.zones.forEach((z: any) => {
              let parsedPoints = undefined;
              if (z.points) {
                if (typeof z.points === 'string') {
                  try { parsedPoints = JSON.parse(z.points); } catch { parsedPoints = undefined; }
                } else {
                  parsedPoints = z.points;
                }
              }
              zonesMap[z.id || `zone_${Date.now()}`] = {
                id: z.id || `zone_${Date.now()}`,
                name: z.name || t('Khu vực'),
                tierId: z.ticketTypeId || undefined,
                shape: (z.shapeType || 'rectangle').toString().toLowerCase() as any,
                color: z.colorCode || z.fillColor || '#3b82f6',
                fillColor: z.fillColor || z.colorCode || '#3b82f6',
                strokeColor: z.strokeColor || '#2563eb',
                curvature: z.curvature ?? 16,
                x: z.x ?? 100,
                y: z.y ?? 100,
                width: z.width ?? 300,
                height: z.height ?? 180,
                rotation: z.rotation ?? 0,
                points: parsedPoints,
                capacity: z.capacity,
              };
            });
            setZones(zonesMap);
            const snapshot: StudioSnapshot = {
              seats: safeClone(seats),
              stages: safeClone(stages),
              structures: safeClone(structures),
              zones: safeClone(zonesMap),
              canvasSettings: safeClone(canvasSettings),
            };
            applySnapshot(snapshot);
            latestRef.current = snapshot;
            setHistory([safeClone(snapshot)]);
            setHistoryIndex(0);
            historyIndexRef.current = 0;
          }
        }
      } catch (err) {
        console.error('Error fetching seat layout or ticket types:', err);
      } finally {
        // từ đây studio mới được tự động lưu; trước đó không được ghi đè bản nháp trên máy chủ bằng sơ đồ trống
        layoutSettledRef.current = true;
        offerLocalDraft(serverSavedAt);
      }
    };

    fetchLayoutAndTypes();
  }, [activeEventId]);

  // Tự động lưu: bản cục bộ trước (để lưu lên máy chủ lỗi vẫn còn bản nháp khôi phục được), sau đó mới tới bản nháp trên máy chủ.
  // Chỉ chạy sau khi chính người dùng sửa: không lưu gì khi sơ đồ còn đang tải, nên sơ đồ trống ban đầu
  // không bao giờ ghi đè được bản nháp đang có trên máy chủ.
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    if (editVersion === 0 || !layoutSettledRef.current) return;

    setAutoSaveStatus(t('Đang tự động lưu nháp...'));
    autoSaveTimerRef.current = setTimeout(async () => {
      const versionAtStart = editCounterRef.current;
      const payload = buildSeatMapDocument({
        name: eventName,
        venueTemplateId: selectedTemplateId,
        canvasSettings,
        zones,
        stages,
        structures,
        seats,
        ticketTiers: effectiveTiers,
      });

      const local = writeLocalDraft(browserStorage(), activeEventId, payload);
      if (!local.ok && !localDraftFailedRef.current) {
        localDraftFailedRef.current = true;
        showToast('warning', `${t('Không lưu được bản nháp trên trình duyệt')}: ${local.message}`);
      } else if (local.ok) {
        localDraftFailedRef.current = false;
      }

      // route không có ID sự kiện thì không được ghi vào sự kiện thật (ID khi đó rơi về một hằng số)
      if (!urlEventId) {
        setAutoSaveStatus(t('Chỉ lưu trên trình duyệt'));
        return;
      }

      try {
        const zonesPayload = buildZonesPayload(zones);
        await ticketApi.saveSeatLayoutDraft(activeEventId, {
          eventId: activeEventId,
          draftJson: JSON.stringify(payload),
          svgData: generateSeatMapSVG(payload),
          imageUrl: null,
          status: 'DRAFT',
          zones: zonesPayload,
        });

        const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        setAutoSaveStatus(`${t('Đã tự động lưu nháp lúc')} ${timeStr}`);
        setAutoSaveError(null);
        autoSaveFailedRef.current = false;
        setSavedVersion((prev) => Math.max(prev, versionAtStart));
      } catch (err) {
        const message = isForbiddenError(err)
          ? t('Bạn không có quyền thực hiện thao tác này')
          : err instanceof Error
            ? err.message
            : String(err);
        console.error('Auto-save of the seat map draft failed:', err);
        setAutoSaveStatus(t('Lỗi tự động lưu nháp'));
        setAutoSaveError(message);
        if (!autoSaveFailedRef.current) {
          autoSaveFailedRef.current = true;
          showToast('error', `${t('Không thể tự động lưu bản nháp lên máy chủ')}: ${message}`);
        }
      }
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seats, stages, structures, zones, canvasSettings, eventName, effectiveTiers, selectedTemplateId, activeEventId, editVersion]);

  // rời trang khi còn thay đổi mà máy chủ chưa có: hỏi trước (đóng tab và chuyển sang trang khác)
  useEffect(() => {
    unsavedRef.current = unsaved;
    if (!unsaved) return;
    /** Hiện hộp thoại xác nhận mặc định của trình duyệt khi đóng hoặc tải lại tab. */
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [unsaved]);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => unsavedRef.current && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    setConfirmModal({
      isOpen: true,
      title: t('Rời khỏi trang?'),
      message: t('Sơ đồ có thay đổi chưa được lưu lên máy chủ. Nếu rời đi, các thay đổi đó có thể bị mất.'),
      type: 'warning',
      /** Cho phép rời trang khi người dùng xác nhận. */
      onConfirm: () => {
        setConfirmModal(null);
        blocker.proceed();
      },
      /** Ở lại trang khi người dùng hủy. */
      onCancel: () => blocker.reset(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocker.state]);

  /** Xuất sơ đồ ghế thành ảnh PNG: dựng SVG, vẽ lên canvas nền trắng rồi tải xuống. */
  const handleExportImage = () => {
    const payload: SeatMapDocument = {
      version: '2.0',
      timestamp: new Date().toISOString(),
      name: eventName,
      venueTemplateId: 'default',
      canvasSettings,
      zones,
      stages,
      structures,
      seats,
      ticketTiers: effectiveTiers,
    };
    const svgString = generateSeatMapSVG(payload);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const w = canvasSettings?.width || 1500;
      const h = canvasSettings?.height || 1050;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `${t('Sơ_đồ_ghế')}_${eventName.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    };
    img.src = url;
  };

  /** Đẩy một ảnh chụp vào lịch sử (mặc định là trạng thái mới nhất), cắt phần "làm lại" phía sau và giữ tối đa 80 bước. */
  const pushHistory = (snapshot?: StudioSnapshot) => {
    const source = snapshot || latestRef.current;
    setHistory((prev) => {
      const base = prev.slice(0, historyIndexRef.current + 1);
      const last = base[base.length - 1];
      // so sánh theo cấu trúc, chỉ nhân bản ảnh chụp khi nó thật sự đổi (không phải JSON.stringify
      // cả hai ảnh chụp ở mỗi lần commit)
      if (last && deepEqual(last, source)) return prev;
      markEdited();
      const next = [...base, safeClone(source)].slice(-80);
      const newIdx = next.length - 1;
      historyIndexRef.current = newIdx;
      setHistoryIndex(newIdx);
      return next;
    });
  };

  /** Áp một ảnh chụp lên các state của studio và bỏ mọi lựa chọn đang có. */
  const applySnapshot = (snapshot: StudioSnapshot) => {
    setSeats(safeClone(snapshot.seats));
    setStages(safeClone(snapshot.stages));
    setStructures(safeClone(snapshot.structures));
    setZones(safeClone(snapshot.zones));
    setCanvasSettings(safeClone(snapshot.canvasSettings));
    setSelectedSeatIds([]);
    setSelectedStageId(null);
    setSelectedStructureId(null);
    setSelectedZoneId(null);
  };

  /** Hoàn tác về bước lịch sử trước đó (nếu có). */
  const handleUndo = () => {
    if (historyIndexRef.current <= 0) return;
    const nextIndex = historyIndexRef.current - 1;
    if (history[nextIndex]) {
      applySnapshot(history[nextIndex]);
      historyIndexRef.current = nextIndex;
      setHistoryIndex(nextIndex);
      markEdited();
    }
  };

  /** Làm lại bước lịch sử kế tiếp (nếu có). */
  const handleRedo = () => {
    if (historyIndexRef.current >= history.length - 1) return;
    const nextIndex = historyIndexRef.current + 1;
    if (history[nextIndex]) {
      applySnapshot(history[nextIndex]);
      historyIndexRef.current = nextIndex;
      setHistoryIndex(nextIndex);
      markEdited();
    }
  };

  /** Ghi một thay đổi một phần lên trạng thái mới nhất và đẩy vào lịch sử thành một bước. */
  const commitWith = (partial: Partial<StudioSnapshot>) => {
    const current = latestRef.current;
    const next: StudioSnapshot = {
      seats: partial.seats ?? current.seats,
      stages: partial.stages ?? current.stages,
      structures: partial.structures ?? current.structures,
      zones: partial.zones ?? current.zones,
      canvasSettings: partial.canvasSettings ?? current.canvasSettings,
    };
    latestRef.current = next;
    pushHistory(next);
  };

  /** Bỏ chọn mọi ghế, sân khấu, cấu trúc và khu. */
  const resetSelection = () => {
    setSelectedSeatIds([]);
    setSelectedStageId(null);
    setSelectedStructureId(null);
    setSelectedZoneId(null);
  };

  /** Thêm một hàng ghế thẳng vào khu: nhận cấu hình dạng đối tượng hoặc các tham số rời (kiểu cũ), mặc định hàng A với 12 ghế. */
  const handleAddRow = (

    configOrLetter: AddRowConfig | string,
    countVal?: number,
    zoneIdVal?: string
  ) => {
    let rowLetter = 'A';
    let count = 12;
    let zoneId = '';
    let spacing = 32;

    if (typeof configOrLetter === 'object' && configOrLetter !== null) {
      rowLetter = configOrLetter.rowLetter || 'A';
      count = configOrLetter.count || 12;
      zoneId = configOrLetter.zoneId || '';
      spacing = configOrLetter.spacing || 48;
    } else {
      rowLetter = (configOrLetter as string) || 'A';
      count = countVal || 12;
      zoneId = zoneIdVal || '';
      spacing = 48;
    }

    const targetZoneId = zoneId && zones[zoneId] ? zoneId : Object.keys(zones)[0];
    if (!targetZoneId || !zones[targetZoneId]) return showToast('warning', t('Hãy tạo/chọn khu vực trước khi tạo ghế.'));
    const zone = zones[targetZoneId];
    const startX = lastClickedPos ? lastClickedPos.x : (zone.x || 120) + 32;
    const startY = lastClickedPos ? lastClickedPos.y : (zone.y || 180) + 70;
    const baseId = Date.now();
    const newSeats = Array.from({ length: count }, (_, index): Seat => ({
      id: `seat_${baseId}_${index}`,
      row: rowLetter,
      number: index + 1,
      col: index + 1,
      x: startX + index * spacing,
      y: startY,
      zoneId: targetZoneId,
      status: 'available',
      rotation: 0,
      shape: 'rounded',
    }));
    const nextSeats = [...seats, ...newSeats];
    setSeats(nextSeats);
    setSelectedSeatIds(newSeats.map((seat) => seat.id));
    setSelectedZoneId(null);
    commitWith({ seats: nextSeats });
  };

  /** Thêm một ma trận ghế (nhiều hàng, nhiều cột, có thể có lối đi) vào khu; nhận cấu hình dạng đối tượng hoặc tham số rời. */
  const handleAddMatrix = (
    configOrRows: AddMatrixConfig | number,
    colsVal?: number,
    startRowLetterVal?: string,
    zoneIdVal?: string
  ) => {
    let rowCount = 4;
    let cols = 10;
    let startRowLetter = 'A';
    let zoneId = '';
    let spacingX = 32;
    let spacingY = 32;
    let aisleAfter = 0;
    let aisleGap = 0;

    if (typeof configOrRows === 'object' && configOrRows !== null) {
      rowCount = configOrRows.rows || 4;
      cols = configOrRows.cols || 10;
      startRowLetter = configOrRows.startRowLetter || 'A';
      zoneId = configOrRows.zoneId || '';
      spacingX = configOrRows.spacingX || 48;
      spacingY = configOrRows.spacingY || 48;
      aisleAfter = configOrRows.aisleAfter || 0;
      aisleGap = configOrRows.aisleGap || 0;
    } else {
      rowCount = typeof configOrRows === 'number' ? configOrRows : 4;
      cols = colsVal || 10;
      startRowLetter = startRowLetterVal || 'A';
      zoneId = zoneIdVal || '';
      spacingX = 48;
      spacingY = 48;
    }

    const targetZoneId = zoneId && zones[zoneId] ? zoneId : Object.keys(zones)[0];
    if (!targetZoneId || !zones[targetZoneId]) return showToast('warning', t('Hãy tạo/chọn khu vực trước khi tạo ghế.'));
    const zone = zones[targetZoneId];
    const startX = lastClickedPos ? lastClickedPos.x : (zone.x || 100) + 34;
    const startY = lastClickedPos ? lastClickedPos.y : (zone.y || 180) + 68;
    const startChar = (startRowLetter || 'A').charCodeAt(0);
    const baseId = Date.now();
    const newSeats: Seat[] = [];

    for (let r = 0; r < rowCount; r += 1) {
      const rowName = String.fromCharCode(startChar + r);
      for (let c = 0; c < cols; c += 1) {
        const aisleOffset = aisleAfter > 0 && c >= aisleAfter ? aisleGap : 0;
        newSeats.push({
          id: `seat_${baseId}_${r}_${c}`,
          row: rowName,
          number: c + 1,
          col: c + 1,
          x: startX + c * spacingX + aisleOffset,
          y: startY + r * spacingY,
          zoneId: targetZoneId,
          status: 'available',
          shape: 'rounded',
          rotation: 0,
        });
      }
    }

    const nextSeats = [...seats, ...newSeats];
    setSeats(nextSeats);
    setSelectedSeatIds(newSeats.map((seat) => seat.id));
    setSelectedZoneId(null);
    commitWith({ seats: nextSeats });
  };

  /** Thêm một hàng ghế xếp theo cung tròn (bán kính, góc mở) vào khu; nhận cấu hình dạng đối tượng hoặc tham số rời. */
  const handleAddArc = (
    configOrLetter: AddArcConfig | string,
    countVal?: number,
    radiusVal?: number,
    zoneIdVal?: string
  ) => {
    let rowLetter = 'A';
    let count = 16;
    let radius = 280;
    let zoneId = '';
    let spanDegrees = 140;

    if (typeof configOrLetter === 'object' && configOrLetter !== null) {
      rowLetter = configOrLetter.rowLetter || 'A';
      count = configOrLetter.count || 16;
      radius = configOrLetter.radius || 280;
      zoneId = configOrLetter.zoneId || '';
      spanDegrees = configOrLetter.spanDegrees || 140;
    } else {
      rowLetter = (configOrLetter as string) || 'A';
      count = countVal || 16;
      radius = radiusVal || 280;
      zoneId = zoneIdVal || '';
    }

    const targetZoneId = zoneId && zones[zoneId] ? zoneId : Object.keys(zones)[0];
    if (!targetZoneId || !zones[targetZoneId]) return showToast('warning', t('Hãy tạo/chọn khu vực trước khi tạo ghế.'));
    const zone = zones[targetZoneId];
    const centerX = lastClickedPos ? lastClickedPos.x : (zone.x || 0) + (zone.width || 600) / 2;
    const centerY = lastClickedPos ? lastClickedPos.y : (zone.y || 0) + 20;
    const startAngle = ((90 - spanDegrees / 2) * Math.PI) / 180;
    const endAngle = ((90 + spanDegrees / 2) * Math.PI) / 180;
    const step = count > 1 ? (endAngle - startAngle) / (count - 1) : 0;
    const baseId = Date.now();
    const newSeats: Seat[] = [];

    for (let i = 0; i < count; i += 1) {
      const angle = startAngle + i * step;
      newSeats.push({
        id: `seat_${baseId}_arc_${i}`,
        row: rowLetter,
        number: i + 1,
        col: i + 1,
        x: Math.round(centerX + Math.cos(angle) * radius),
        y: Math.round(centerY + Math.sin(angle) * radius),
        rotation: Math.round(((angle - Math.PI / 2) * 180) / Math.PI),
        zoneId: targetZoneId,
        status: 'available',
        shape: 'rounded',
      });
    }

    const nextSeats = [...seats, ...newSeats];
    setSeats(nextSeats);
    setSelectedSeatIds(newSeats.map((seat) => seat.id));
    commitWith({ seats: nextSeats });
  };

  /**
   * Thêm một bàn tròn gồm nhiều ghế quanh tâm bàn, vào khu chỉ định (hoặc khu đầu tiên). Tâm đặt tại vị trí bấm gần nhất,
   * không có thì ở giữa khu; chưa có khu nào thì báo cảnh báo.
   */
  const handleAddTable = (zoneIdVal?: string, seatsPerTableVal?: number, radiusVal?: number) => {
    const targetZoneId = (zoneIdVal && zones[zoneIdVal]) ? zoneIdVal : Object.keys(zones)[0];
    if (!targetZoneId || !zones[targetZoneId]) return showToast('warning', t('Hãy tạo/chọn khu vực trước khi tạo bàn.'));
    const seatsPerTable = seatsPerTableVal || 8;
    const radius = radiusVal || 50;
    const zone = zones[targetZoneId];
    const tablePrefix = `${t('Bàn')} `;
    const existingTables = new Set(seats.filter((seat) => seat.row.startsWith(tablePrefix) || seat.row.startsWith('Bàn ')).map((seat) => seat.row));
    const tableNumber = existingTables.size + 1;
    const centerX = lastClickedPos ? lastClickedPos.x : (zone.x || 0) + (zone.width || 500) / 2;
    const centerY = lastClickedPos ? lastClickedPos.y : (zone.y || 0) + (zone.height || 300) / 2;
    const baseId = Date.now();
    const newSeats: Seat[] = [];

    for (let i = 0; i < seatsPerTable; i += 1) {
      const angle = (i * 2 * Math.PI) / seatsPerTable;
      newSeats.push({
        id: `seat_${baseId}_table_${i}`,
        row: `${t('Bàn')} ${tableNumber}`,
        number: i + 1,
        col: i + 1,
        x: Math.round(centerX + Math.cos(angle) * radius),
        y: Math.round(centerY + Math.sin(angle) * radius),
        rotation: Math.round((angle * 180) / Math.PI + 90),
        zoneId: targetZoneId,
        status: 'available',
        shape: 'circle',
      });
    }

    const nextSeats = [...seats, ...newSeats];
    setSeats(nextSeats);
    setSelectedSeatIds(newSeats.map((seat) => seat.id));
    commitWith({ seats: nextSeats });
  };

  /** Thêm một sân khấu (chính hoặc chữ T) với nhãn cho trước, đặt ở vị trí bấm gần nhất. */
  const handleAddStage = (kindOrLabel: 'stage' | 't_stage' | string, labelVal?: string) => {
    let kind: 'stage' | 't_stage' = 'stage';
    let label = 'SÂN KHẤU CHÍNH (MAIN STAGE)';

    if (kindOrLabel === 't_stage' || kindOrLabel === 'stage') {
      kind = kindOrLabel;
      label = labelVal || (kind === 't_stage' ? 'SÂN KHẤU T-STAGE' : 'SÂN KHẤU CHÍNH (MAIN STAGE)');
    } else {
      label = kindOrLabel;
    }

    const width = kind === 't_stage' ? 140 : Math.min(620, canvasSettings.width - 200);
    const height = kind === 't_stage' ? 260 : 100;
    const newStage: StageElement = {
      id: `stage_${Date.now()}`,
      type: kind,
      label,
      x: lastClickedPos ? Math.round(lastClickedPos.x - width / 2) : Math.round((canvasSettings.width - width) / 2),
      y: lastClickedPos ? Math.round(lastClickedPos.y - height / 2) : 70,
      width,
      height,
      color: kind === 't_stage' ? '#1d4ed8' : '#1e293b',
      rotation: 0,
      shape: kind === 't_stage' ? 'runway' : 'rounded',
    };
    const nextStages = [...stages, newStage];
    setStages(nextStages);
    resetSelection();
    setSelectedStageId(newStage.id);
    commitWith({ stages: nextStages });
  };

  /**
   * Nhập các khu vực từ file SVG: mỗi hình tô màu thành một khu đa giác (chưa gán hạng vé), co giãn vừa khung vẽ.
   * Khu nhập vào được thêm cạnh các khu đang có, không thay thế sơ đồ hiện tại.
   */
  const handleImportSvg = async (file: File) => {
    if (file.size > MAX_SVG_IMPORT_BYTES) {
      showToast('error', t('File SVG quá lớn (tối đa 2 MB).'));
      return;
    }
    try {
      const shapes = extractSvgShapes(await file.text());
      const imported = shapesToZones(shapes, { width: canvasSettings.width, height: canvasSettings.height });
      if (imported.length === 0) {
        showToast('warning', t('Không tìm thấy hình nào có thể nhập trong file SVG này.'));
        return;
      }
      const nextZones = { ...zones };
      imported.forEach((zone) => {
        nextZones[zone.id] = zone;
      });
      setZones(nextZones);
      resetSelection();
      commitWith({ zones: nextZones });
      const cut = shapes.length > imported.length;
      showToast(
        cut ? 'warning' : 'success',
        cut
          ? t('Đã nhập {{count}} khu; các hình quá nhỏ hoặc trùng nền đã được bỏ qua. Hãy gán hạng vé cho từng khu.', { count: imported.length })
          : t('Đã nhập {{count}} khu từ file SVG. Hãy gán hạng vé cho từng khu.', { count: imported.length })
      );
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : t('Không đọc được file SVG.'));
    }
  };

  /** Thêm một cấu trúc phụ (lối ra, cổng, bàn điều khiển, nhà vệ sinh hoặc ăn uống...) với màu theo loại. */
  const handleAddStructure = (type: StructureElement['type'], label?: string) => {
    const colorMap: Record<StructureElement['type'], string> = {
      exit: '#dc2626',
      gate: '#059669',
      control_booth: '#475569',
      wc_food: '#0891b2',
      structure: '#64748b',
      label: '#e2e8f0',
    };
    const newStructure: StructureElement = {
      id: `structure_${Date.now()}`,
      type,
      label: label || 'CẤU TRÚC PHỤ',
      x: lastClickedPos ? Math.round(lastClickedPos.x - (type === 'control_booth' ? 110 : type === 'label' ? 100 : 75)) : 70,
      y: lastClickedPos ? Math.round(lastClickedPos.y - (type === 'label' ? 24 : 22)) : 80 + structures.length * 55,
      width: type === 'control_booth' ? 220 : type === 'label' ? 200 : 150,
      height: type === 'label' ? 48 : 44,
      color: colorMap[type] || '#64748b',
      rotation: 0,
      shape: 'rounded',
      ...(type === 'label' ? { fontSize: 28, textColor: '#e2e8f0' } : {}),
    };
    const nextStructures = [...structures, newStructure];
    setStructures(nextStructures);
    resetSelection();
    setSelectedStructureId(newStructure.id);
    commitWith({ structures: nextStructures });
  };

  /** Thêm một khu ghế mới, có thể gắn hạng vé, kích thước, kiểu viền và sinh sẵn ghế theo số hàng và cột; nhận cấu hình dạng đối tượng hoặc tham số rời. */
  const handleAddZoneBlock = (
    configOrName: AddZoneConfig | string,
    priceVal?: number,
    colorVal?: string,
    widthVal?: number,
    heightVal?: number,
    borderStyleVal?: 'dashed' | 'solid',
    rowsVal?: number,
    colsVal?: number
  ) => {
    const id = `zone_${Date.now()}`;
    const index = Object.keys(zones).length;
    let name = `${t('Khu Vực Ghế')} ${index + 1}`;
    let tierId: string | undefined = undefined;
    let price: number | undefined = priceVal;
    let color = colorVal || ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'][index % 5];
    let width = widthVal || 520;
    let height = heightVal || 220;
    let borderStyle: 'dashed' | 'solid' = borderStyleVal || 'dashed';
    let shape: any = undefined;
    let type: any = undefined;
    let layoutType: string = 'STANDING';
    let rowPrefix = 'A';
    let rowCount = rowsVal ?? 0;
    let seatsPerRow = colsVal ?? 0;
    let arcCount = 0;
    let arcRadius = 240;
    let tableCount = 0;
    let seatsPerTable = 8;
    let capacityVal: number | undefined = undefined;

    if (typeof configOrName === 'object' && configOrName !== null) {
      name = configOrName.name || name;
      tierId = configOrName.tierId;
      price = configOrName.price;
      color = configOrName.color || color;
      width = configOrName.width || width;
      height = configOrName.height || height;
      borderStyle = configOrName.borderStyle || borderStyle;
      shape = configOrName.shape;
      type = configOrName.type;
      layoutType = configOrName.layoutType || (rowCount > 0 && seatsPerRow > 0 ? 'MATRIX' : 'STANDING');
      rowPrefix = configOrName.rowPrefix || 'A';
      rowCount = configOrName.rowCount || rowCount;
      seatsPerRow = configOrName.seatsPerRow || seatsPerRow;
      arcCount = configOrName.arcCount || 0;
      arcRadius = configOrName.arcRadius || 240;
      tableCount = configOrName.tableCount || 0;
      seatsPerTable = configOrName.seatsPerTable || 8;
      capacityVal = configOrName.capacity;
    } else if (typeof configOrName === 'string') {
      name = configOrName || name;
      if (rowCount > 0 && seatsPerRow > 0) layoutType = 'MATRIX';
    }

    const tier = effectiveTiers.find((item) => item.id === tierId);
    const zoneX = lastClickedPos ? lastClickedPos.x : 120 + (index % 5) * 28;
    const zoneY = lastClickedPos ? lastClickedPos.y : 220 + (index % 5) * 28;

    const newZone: ZoneBlock = {
      id,
      name,
      tierId,
      price: price ?? tier?.price,
      color: color,
      shape,
      type,
      x: zoneX,
      y: zoneY,
      width,
      height,
      borderStyle,
      fillOpacity: 0.15,
      rotation: 0,
      capacity: capacityVal,
    };

    const baseId = Date.now();
    const generatedSeats: Seat[] = [];

    if (layoutType === 'ROW' && seatsPerRow > 0) {
      const spacingX = 38;
      const totalW = seatsPerRow * spacingX;
      const startX = Math.round(zoneX + (width - totalW) / 2 + spacingX / 2);
      const startY = Math.round(zoneY + height / 2);

      for (let c = 0; c < seatsPerRow; c++) {
        generatedSeats.push({
          id: `seat_${baseId}_${c}`,
          row: rowPrefix,
          number: c + 1,
          col: c + 1,
          x: startX + c * spacingX,
          y: startY,
          zoneId: id,
          status: 'available',
          shape: 'rounded',
          rotation: 0,
        });
      }
    } else if (layoutType === 'MATRIX' && rowCount > 0 && seatsPerRow > 0) {
      const spacingX = 38;
      const spacingY = 38;
      const totalW = seatsPerRow * spacingX;
      const startX = Math.round(zoneX + (width - totalW) / 2 + spacingX / 2);
      const startY = Math.round(zoneY + 45);

      for (let r = 0; r < rowCount; r++) {
        const rowName = getRowLabel(rowPrefix, r);
        for (let c = 0; c < seatsPerRow; c++) {
          generatedSeats.push({
            id: `seat_${baseId}_${r}_${c}`,
            row: rowName,
            number: c + 1,
            col: c + 1,
            x: startX + c * spacingX,
            y: startY + r * spacingY,
            zoneId: id,
            status: 'available',
            shape: 'rounded',
            rotation: 0,
          });
        }
      }
    } else if (layoutType === 'ARC' && arcCount > 0) {
      const centerX = Math.round(zoneX + width / 2);
      const centerY = Math.round(zoneY + height - 35);
      const startAngle = -150;
      const endAngle = -30;
      const stepAngle = (endAngle - startAngle) / Math.max(1, arcCount - 1);

      for (let i = 0; i < arcCount; i++) {
        const currentAngleDeg = startAngle + i * stepAngle;
        const angleRad = (currentAngleDeg * Math.PI) / 180;
        const x = Math.round(centerX + arcRadius * Math.cos(angleRad));
        const y = Math.round(centerY + arcRadius * Math.sin(angleRad));
        const rot = Math.round(currentAngleDeg + 90);

        generatedSeats.push({
          id: `seat_${baseId}_arc_${i}`,
          row: rowPrefix,
          number: i + 1,
          x,
          y,
          zoneId: id,
          status: 'available',
          shape: 'rounded',
          rotation: rot,
        });
      }
    } else if (layoutType === 'GALA' && tableCount > 0 && seatsPerTable > 0) {
      const tableRadius = 55;
      for (let t = 0; t < tableCount; t++) {
        const tableCenterX = Math.round(zoneX + (width / (tableCount + 1)) * (t + 1));
        const tableCenterY = Math.round(zoneY + height / 2 + 10);

        for (let s = 0; s < seatsPerTable; s++) {
          const angleDeg = s * (360 / seatsPerTable);
          const angleRad = (angleDeg * Math.PI) / 180;
          const x = Math.round(tableCenterX + tableRadius * Math.cos(angleRad));
          const y = Math.round(tableCenterY + tableRadius * Math.sin(angleRad));

          generatedSeats.push({
            id: `seat_${baseId}_gala_${t}_${s}`,
            row: `B${t + 1}`,
            number: s + 1,
            x,
            y,
            zoneId: id,
            status: 'available',
            shape: 'circle',
            rotation: Math.round(angleDeg),
          });
        }
      }
    }

    const nextZones = { ...zones, [id]: newZone };
    const nextSeats = generatedSeats.length > 0 ? [...seats, ...generatedSeats] : seats;
    setZones(nextZones);
    setSeats(nextSeats);
    resetSelection();
    setSelectedZoneId(id);
    commitWith({ zones: nextZones, seats: nextSeats });
  };

  /**
   * Xóa phần tử đang chọn theo thứ tự ưu tiên: ghế, sân khấu, cấu trúc, khu.
   * Xóa khu đang chứa ghế thì hỏi xác nhận vì các ghế đó bị xóa theo.
   */
  const handleDeleteSelected = () => {
    let nextSeats = seats;
    let nextStages = stages;
    let nextStructures = structures;

    if (selectedSeatIds.length) {
      nextSeats = seats.filter((seat) => !selectedSeatIds.includes(seat.id));
      setSeats(nextSeats);
      resetSelection();
      commitWith({ seats: nextSeats });
    } else if (selectedStageId) {
      nextStages = stages.filter((stage) => stage.id !== selectedStageId);
      setStages(nextStages);
      resetSelection();
      commitWith({ stages: nextStages });
    } else if (selectedStructureId) {
      nextStructures = structures.filter((item) => item.id !== selectedStructureId);
      setStructures(nextStructures);
      resetSelection();
      commitWith({ structures: nextStructures });
    } else if (selectedZoneId) {
      const seatCount = seats.filter((seat) => seat.zoneId === selectedZoneId).length;
      if (seatCount > 0) {
        setConfirmModal({
          isOpen: true,
          title: t('Xác Nhận Xóa Khu Vực'),
          message: `${t('Khu vực này đang chứa')} ${seatCount} ${t('ghế. Xóa khu vực sẽ xóa luôn các ghế đó. Tiếp tục?')}`,
          type: 'danger',
          /** Xóa khu cùng các ghế thuộc khu sau khi người dùng xác nhận. */
          onConfirm: () => {
            const filteredSeats = seats.filter((seat) => seat.zoneId !== selectedZoneId);
            const { [selectedZoneId]: _removed, ...rest } = zones;
            setSeats(filteredSeats);
            setZones(rest);
            resetSelection();
            commitWith({ seats: filteredSeats, zones: rest });
            setConfirmModal(null);
          },
        });
        return;
      }
      const { [selectedZoneId]: _removed, ...rest } = zones;
      setZones(rest);
      resetSelection();
      commitWith({ zones: rest });
    }
  };

  /** Lấy bố cục mới nhất (ghế, sân khấu, cấu trúc, khu) từ tham chiếu {@code latestRef}. */
  const currentLayout = (): SeatMapLayout => ({
    seats: latestRef.current.seats,
    stages: latestRef.current.stages,
    structures: latestRef.current.structures,
    zones: latestRef.current.zones,
  });
  /** Gom các phần tử đang được chọn thành một đối tượng lựa chọn. */
  const currentSelection = (): SeatMapSelection => ({
    seatIds: selectedSeatIds,
    stageId: selectedStageId,
    structureId: selectedStructureId,
    zoneId: selectedZoneId,
  });
  const hasAnySelection = selectedSeatIds.length > 0 || Boolean(selectedStageId || selectedStructureId || selectedZoneId);
  /** Sinh ID duy nhất cho phần tử mới theo loại, dựa trên thời gian và bộ đếm. */
  const makeElementId = (kind: 'seat' | 'stage' | 'structure' | 'zone') => {
    idCounterRef.current += 1;
    return `${kind}_${Date.now()}_${idCounterRef.current}`;
  };

  /** Ghi cả bố cục trở lại studio (một bước lịch sử) và có thể chuyển lựa chọn sang các phần tử mới. */
  const applyLayout = (next: SeatMapLayout, selection?: SeatMapSelection) => {
    setSeats(next.seats);
    setStages(next.stages);
    setStructures(next.structures);
    setZones(next.zones);
    commitWith(next);
    if (selection) {
      setSelectedSeatIds(selection.seatIds);
      setSelectedStageId(selection.stageId);
      setSelectedStructureId(selection.structureId);
      setSelectedZoneId(selection.zoneId);
    }
  };

  /** Sao chép ghế, sân khấu, cấu trúc hoặc khu đang chọn vào clipboard nội bộ (khu được sao chép kèm ghế của nó). */
  const handleCopySelected = () => {
    const clip = buildClipboard(currentLayout(), currentSelection());
    if (!clip) return;
    clipboardRef.current = clip;
    pasteCountRef.current = 0;
    const count = clip.seats.length + clip.stages.length + clip.structures.length + clip.zones.length;
    showToast('info', `${t('Đã sao chép')} ${count} ${t('phần tử')}`);
  };

  /** Dán clipboard nội bộ; mỗi lần dán lệch thêm một đoạn để các bản sao không chồng lên nhau. */
  const handlePasteClipboard = () => {
    const clip = clipboardRef.current;
    if (!clip) {
      showToast('info', t('Chưa có gì để dán. Chọn phần tử rồi nhấn Ctrl + C.'));
      return;
    }
    pasteCountRef.current += 1;
    const result = pasteClipboard(currentLayout(), clip, 32 * pasteCountRef.current, makeElementId, ` ${t('(bản sao)')}`);
    applyLayout(result.layout, result.selection);
  };

  /** Nhân đôi phần tử đang chọn (sao chép và dán trong một bước). */
  const handleDuplicateSelected = () => {
    const clip = buildClipboard(currentLayout(), currentSelection());
    if (!clip) return;
    const result = pasteClipboard(currentLayout(), clip, 32, makeElementId, ` ${t('(bản sao)')}`);
    applyLayout(result.layout, result.selection);
  };

  /**
   * Dịch lựa chọn theo bước lưới khi nhấn phím mũi tên. Chỉ cập nhật state; canvas ghi một bước lịch sử sau lần nhấn phím cuối.
   *
   * @param dx độ dịch theo trục ngang
   * @param dy độ dịch theo trục dọc
   */
  const handleNudgeSelected = (dx: number, dy: number) => {
    const next = nudgeSelection(currentLayout(), currentSelection(), dx, dy);
    const base = latestRef.current;
    if (next.seats !== base.seats) setSeats(next.seats);
    if (next.stages !== base.stages) setStages(next.stages);
    if (next.structures !== base.structures) setStructures(next.structures);
    if (next.zones !== base.zones) setZones(next.zones);
    latestRef.current = { ...base, ...next };
  };

  /** Chọn mọi ghế không bị ẩn. */
  const handleSelectAll = () => {
    setSelectedSeatIds(seats.filter((seat) => !seat.hidden).map((seat) => seat.id));
    setSelectedStageId(null);
    setSelectedStructureId(null);
    setSelectedZoneId(null);
  };

  /** Cập nhật thuộc tính cho các ghế đang chọn. */
  const handleUpdateSeatProps = (props: Partial<Seat>) => {
    const nextSeats = seats.map((seat) => selectedSeatIds.includes(seat.id) ? { ...seat, ...props } : seat);
    setSeats(nextSeats);
    commitWith({ seats: nextSeats });
  };

  /** Chuyển các ghế đang chọn sang khu khác và xóa hạng vé riêng của ghế (dùng hạng vé của khu). */
  const handleMoveSeatsToZone = (zoneId: string) => {
    if (!zones[zoneId]) return;
    const nextSeats = seats.map((seat) => selectedSeatIds.includes(seat.id) ? { ...seat, zoneId, tierId: undefined } : seat);
    setSeats(nextSeats);
    commitWith({ seats: nextSeats });
  };

  /** Cập nhật thuộc tính của một sân khấu. */
  const handleUpdateStageProps = (stageId: string, props: Partial<StageElement>) => {
    const nextStages = stages.map((stage) => stage.id === stageId ? { ...stage, ...props } : stage);
    setStages(nextStages);
    commitWith({ stages: nextStages });
  };

  /** Cập nhật thuộc tính của một cấu trúc phụ. */
  const handleUpdateStructureProps = (structureId: string, props: Partial<StructureElement>) => {
    const nextStructures = structures.map((item) => item.id === structureId ? { ...item, ...props } : item);
    setStructures(nextStructures);
    commitWith({ structures: nextStructures });
  };

  /**
   * Cập nhật thuộc tính của một khu. Đổi hạng vé thì lấy màu của hạng và xóa giá riêng của khu cùng hạng vé riêng của ghế;
   * đổi góc xoay thì xoay các ghế thuộc khu quanh tâm khu theo phần chênh lệch.
   */
  const handleUpdateZoneProps = (zoneId: string, props: Partial<ZoneBlock>) => {
    const currentZone = zones[zoneId];
    if (!currentZone) return;
    const nextZone = { ...currentZone, ...props };
    if (props.tierId !== undefined) {
      const tier = effectiveTiers.find((item) => item.id === props.tierId);
      if (tier) nextZone.color = tier.color;
      nextZone.price = undefined;
    }

    let nextSeats = props.tierId !== undefined
      ? seats.map((seat) => seat.zoneId === zoneId ? { ...seat, tierId: undefined } : seat)
      : seats;

    if (props.rotation !== undefined && props.rotation !== (currentZone.rotation || 0)) {
      const oldRot = currentZone.rotation || 0;
      const deltaDeg = props.rotation - oldRot;
      const cx = (currentZone.x || 0) + (currentZone.width || 800) / 2;
      const cy = (currentZone.y || 0) + (currentZone.height || 180) / 2;
      const rad = (deltaDeg * Math.PI) / 180;
      const cosVal = Math.cos(rad);
      const sinVal = Math.sin(rad);

      nextSeats = nextSeats.map((s) => {
        const isBelongingSeat = s.zoneId === zoneId || isSeatInsideZone(s, currentZone);
        if (isBelongingSeat) {
          const dx = s.x - cx;
          const dy = s.y - cy;
          const newX = Math.round(cx + dx * cosVal - dy * sinVal);
          const newY = Math.round(cy + dx * sinVal + dy * cosVal);
          const newRot = Math.round((((s.rotation || 0) + deltaDeg) % 360 + 360) % 360);
          return { ...s, x: newX, y: newY, rotation: newRot, zoneId };
        }
        return s;
      });
    }

    const nextZones = { ...zones, [zoneId]: nextZone };
    setZones(nextZones);
    setSeats(nextSeats);
    commitWith({ zones: nextZones, seats: nextSeats });
  };

  /** Căn hoặc phân bố đều các ghế đang chọn (cần ít nhất 2 ghế, bỏ qua ghế bị khóa). */
  const handleArrangeSeats = (
    action: 'align-left' | 'align-center' | 'align-right' | 'align-top' | 'align-middle' | 'align-bottom' | 'distribute-x' | 'distribute-y'
  ) => {
    const selected = seats.filter((seat) => selectedSeatIds.includes(seat.id));
    if (selected.length < 2) return;
    const xs = selected.map((seat) => seat.x);
    const ys = selected.map((seat) => seat.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const xSorted = [...selected].sort((a, b) => a.x - b.x);
    const ySorted = [...selected].sort((a, b) => a.y - b.y);
    const xStep = selected.length > 1 ? (maxX - minX) / (selected.length - 1) : 0;
    const yStep = selected.length > 1 ? (maxY - minY) / (selected.length - 1) : 0;
    const xOrder = new Map(xSorted.map((seat, index) => [seat.id, index]));
    const yOrder = new Map(ySorted.map((seat, index) => [seat.id, index]));

    const nextSeats = seats.map((seat) => {
      if (!selectedSeatIds.includes(seat.id) || seat.locked) return seat;
      if (action === 'align-left') return { ...seat, x: minX };
      if (action === 'align-center') return { ...seat, x: centerX };
      if (action === 'align-right') return { ...seat, x: maxX };
      if (action === 'align-top') return { ...seat, y: minY };
      if (action === 'align-middle') return { ...seat, y: centerY };
      if (action === 'align-bottom') return { ...seat, y: maxY };
      if (action === 'distribute-x') return { ...seat, x: minX + (xOrder.get(seat.id) || 0) * xStep };
      if (action === 'distribute-y') return { ...seat, y: minY + (yOrder.get(seat.id) || 0) * yStep };
      return seat;
    });
    setSeats(nextSeats);
    commitWith({ seats: nextSeats });
  };

  /** Đổi kích thước canvas và (nếu có) kích thước lưới. */
  const handleResizeCanvas = (width: number, height: number, gridSize?: number) => {
    const next = { ...canvasSettings, width, height, gridSize: gridSize ?? canvasSettings.gridSize };
    setCanvasSettings(next);
    commitWith({ canvasSettings: next });
  };

  /** Áp một mẫu địa điểm: lưu bản trước đó (nếu sơ đồ không trống) để có thể khôi phục, rồi thay toàn bộ sơ đồ và đặt lại lịch sử. */
  const handleLoadPreset = (template: VenueTemplate) => {
    const current = latestRef.current;
    if (current.seats.length > 0 || current.stages.length > 0 || Object.keys(current.zones).length > 0) {
      setPreviousSnapshotBeforePreset(safeClone(current));
    }

    const cloned = cloneTemplateForCurrentEvent(template, effectiveTiers);
    const snapshot: StudioSnapshot = {
      seats: safeClone(cloned.seats),
      stages: safeClone(cloned.stages),
      structures: safeClone(cloned.structures),
      zones: safeClone(cloned.zones),
      canvasSettings: safeClone(cloned.canvasSettings),
    };
    applySnapshot(snapshot);
    latestRef.current = snapshot;
    setHistory([safeClone(snapshot)]);
    setHistoryIndex(0);
    historyIndexRef.current = 0;
    setSelectedTemplateId(template.id);
    setAttendeeCart([]);
    setIsTemplateModalOpen(false);
    showToast('success', `${t('Đã áp dụng mẫu')} "${template.name}". ${t('Bạn có thể bấm "Khôi phục bản trước" nếu muốn hoàn tác.')}`);
  };

  /** Hỏi xác nhận rồi xóa toàn bộ nội dung canvas. */
  const handleClearCanvas = () => {
    setConfirmModal({
      isOpen: true,
      title: t('Xóa Canvas'),
      message: t('Bạn có chắc chắn muốn xóa toàn bộ ghế, khu vực, sân khấu và tiện ích trên canvas không?'),
      type: 'danger',
      /** Đặt lại sơ đồ về trống (có ghi vào lịch sử) và xóa giỏ hàng mô phỏng. */
      onConfirm: () => {
        const snapshot: StudioSnapshot = {
          seats: [],
          stages: [],
          structures: [],
          zones: {},
          canvasSettings,
        };
        applySnapshot(snapshot);
        latestRef.current = snapshot;
        pushHistory(snapshot);
        setAttendeeCart([]);
        setConfirmModal(null);
        showToast('info', t('Đã xóa toàn bộ nội dung canvas.'));
      },
    });
  };

  /** Chọn hoặc bỏ chọn một ghế trong giỏ hàng ở chế độ mô phỏng người mua. */
  const handleToggleAttendeeSeat = (seat: Seat) => {
    setAttendeeCart((prev) => prev.some((item) => item.id === seat.id) ? prev.filter((item) => item.id !== seat.id) : [...prev, seat]);
  };

  /** Mở modal JSON với tài liệu sơ đồ hiện tại đã được tuần tự hóa. */
  const handleOpenJSONModal = () => {
    const payload = buildSeatMapDocument({
      name: eventName,
      venueTemplateId: selectedTemplateId,
      canvasSettings,
      zones,
      stages,
      structures,
      seats,
      ticketTiers: effectiveTiers,
    });
    setJsonText(JSON.stringify(payload, null, 2));
    setIsJSONModalOpen(true);
  };

  /** Nạp sơ đồ từ JSON trong modal: chuẩn hóa hạng vé, thay toàn bộ sơ đồ; JSON sai thì báo lỗi. */
  const handleImportJSON = () => {
    try {
      const parsed = JSON.parse(jsonText) as Partial<SeatMapDocument>;
      const nextZones = normalizeImportedTierIds(parsed.zones || {}, effectiveTiers);
      const nextSeats = (parsed.seats || []).map((seat) => ({
        ...seat,
        tierId: seat.tierId && effectiveTiers.some((tier) => tier.id === seat.tierId) ? seat.tierId : undefined,
      }));
      const snapshot: StudioSnapshot = {
        seats: nextSeats,
        stages: parsed.stages || [],
        structures: parsed.structures || [],
        zones: nextZones,
        canvasSettings: { ...DEFAULT_CANVAS_SETTINGS, ...(parsed.canvasSettings || {}) },
      };
      applySnapshot(snapshot);
      latestRef.current = snapshot;
      pushHistory(snapshot);
      setIsJSONModalOpen(false);
      showToast('success', t('Đã nạp bản đồ từ JSON thành công.'));
    } catch {
      showToast('error', t('JSON không đúng định dạng Seat Map v2.0.'));
    }
  };

  /**
   * Đồng bộ các hạng vé của studio lên backend và ánh xạ lại {@code tierId} của các khu theo ID thật vừa nhận được (khớp theo ID hoặc tên).
   * Lỗi đồng bộ chỉ ghi cảnh báo, vẫn dùng hạng vé hiện có.
   *
   * @returns các hạng vé sau đồng bộ và các khu đã cập nhật {@code tierId}
   */
  const syncTiersAndGetUpdatedData = async () => {
    let syncedTiers = effectiveTiers;
    if (effectiveTiers && effectiveTiers.length > 0) {
      try {
        const requests = effectiveTiers.map((tier) => ({
          id: tier.id.startsWith("tier_") ? undefined : tier.id,
          eventId: activeEventId,
          name: tier.name,
          price: tier.price,
          isFree: tier.price === 0,
          totalQuantity: tier.totalQuantity ?? 500,
          minPerOrder: 1,
          maxPerOrder: 10,
          description: tier.description || `${t('Hạng vé')} ${tier.name}`,
        }));
        const res = await ticketApi.syncTicketTypesForEvent(activeEventId, requests);
        if (res && res.length > 0) {
          const colors = ['#f59e0b', '#9333ea', '#2563eb', '#10b981', '#f97316', '#ec4899', '#475569', '#06b6d4'];
          syncedTiers = res.map((t: any, idx: number) => ({
            id: t.id,
            name: t.name,
            price: t.price || 0,
            color: colors[idx % colors.length],
            totalQuantity: t.totalQuantity ?? 500,
            description: t.description || undefined,
          }));
          setBackendTiers(syncedTiers);
        }
      } catch (e) {
        console.warn('Sync ticket types warning:', e);
      }
    }

    const tierIdMap = new Map<string, string>();
    effectiveTiers.forEach((oldTier) => {
      const matched = syncedTiers.find(
        (st) => st.id === oldTier.id || st.name.toLowerCase().trim() === oldTier.name.toLowerCase().trim()
      );
      if (matched) tierIdMap.set(oldTier.id, matched.id);
    });

    const updatedZones: Record<string, ZoneBlock> = {};
    Object.entries(zones).forEach(([zId, z]) => {
      const mappedTierId = z.tierId ? (tierIdMap.get(z.tierId) || z.tierId) : undefined;
      updatedZones[zId] = { ...z, tierId: mappedTierId };
    });

    setZones(updatedZones);
    return { syncedTiers, updatedZones };
  };

  /** Dựng danh sách khu theo định dạng API từ các khu của studio (hình dạng, màu, tọa độ, sức chứa tính từ số ghế nếu chưa có). */
  const buildZonesPayload = (targetZones: Record<string, ZoneBlock> = zones) => {
    return Object.entries(targetZones).map(([zId, z]) => {
      const rawZone = z as any;
      const shapeVal = rawZone.shape || rawZone.shapeType || 'RECTANGLE';
      const pointsVal = rawZone.points;
      return {
        id: zId,
        name: z.name,
        ticketTypeId: z.tierId || null,
        shapeType: String(shapeVal).toUpperCase(),
        colorCode: z.color,
        fillColor: z.fillColor || z.color,
        strokeColor: z.strokeColor || z.color,
        curvature: z.curvature ?? 16,
        x: z.x ?? 100,
        y: z.y ?? 100,
        width: z.width ?? 300,
        height: z.height ?? 180,
        rotation: z.rotation ?? 0,
        points: pointsVal ? (typeof pointsVal === 'string' ? pointsVal : JSON.stringify(pointsVal)) : null,
        capacity: z.capacity || (seats.filter((s) => s.zoneId === zId).length || 100),
      };
    });
  };

  // 1. Lưu bản nháp
  /** Đồng bộ hạng vé rồi lưu sơ đồ lên máy chủ ở trạng thái {@code DRAFT}; thành công thì ghi nhận phiên bản đã lưu, lỗi thì báo toast. */
  const handleSaveDraft = async () => {
    const versionAtStart = editCounterRef.current;
    try {
      setIsSaving(true);
      const { syncedTiers, updatedZones } = await syncTiersAndGetUpdatedData();

      const payload = buildSeatMapDocument({
        name: eventName,
        venueTemplateId: selectedTemplateId,
        canvasSettings,
        zones: updatedZones,
        stages,
        structures,
        seats,
        ticketTiers: syncedTiers,
      });

      await ticketApi.saveSeatLayoutDraft(activeEventId, {
        eventId: activeEventId,
        draftJson: JSON.stringify(payload),
        svgData: generateSeatMapSVG(payload),
        imageUrl: null,
        status: 'DRAFT',
        zones: buildZonesPayload(updatedZones),
      });

      await onSave?.(payload);
      setSavedVersion((prev) => Math.max(prev, versionAtStart));
      setLayoutStatus('DRAFT');
      setSaveSuccess(true);
      window.setTimeout(() => setSaveSuccess(false), 2500);
      setAutoSaveStatus(t('Đã lưu bản nháp vào CSDL!'));
      showToast('info', t('Đã lưu bản nháp sơ đồ ghế (DRAFT) thành công!'));
    } catch (err) {
      console.error('Error saving seat layout draft:', err);
      showToast('error', isForbiddenError(err) ? t("Bạn không có quyền thực hiện thao tác này") : t('Đã xảy ra lỗi khi kết nối tới backend để lưu bản nháp!'));
    } finally {
      setIsSaving(false);
    }
  };

  // 2. Lưu chính thức (xuất bản sơ đồ)
  /** Xuất bản sơ đồ; còn lỗi nghiêm trọng thì hiện bảng lỗi và hỏi xác nhận trước khi xuất bản. */
  const handlePublishOfficial = () => {
    const { errors } = countIssues(issues);
    if (errors === 0) {
      void publishOfficial();
      return;
    }
    // còn lỗi nghiêm trọng: hiện ra và hỏi, thay vì xuất bản một sơ đồ mà người mua không dùng được
    setIssuesOpen(true);
    setConfirmModal({
      isOpen: true,
      title: t('Sơ đồ còn lỗi nghiêm trọng'),
      message: `${errors} ${t('lỗi nghiêm trọng chưa xử lý (xem bảng Kiểm tra trước khi xuất bản). Vẫn xuất bản?')}`,
      type: 'warning',
      /** Tiếp tục xuất bản dù còn lỗi nghiêm trọng, sau khi người dùng xác nhận. */
      onConfirm: () => {
        setConfirmModal(null);
        void publishOfficial();
      },
    });
  };

  /** Đồng bộ hạng vé rồi xuất bản sơ đồ lên máy chủ ở trạng thái {@code PUBLISHED}; thành công thì ghi nhận phiên bản đã lưu, lỗi thì báo toast. */
  const publishOfficial = async () => {
    const versionAtStart = editCounterRef.current;
    try {
      setIsSaving(true);
      const { syncedTiers, updatedZones } = await syncTiersAndGetUpdatedData();

      const payload = buildSeatMapDocument({
        name: eventName,
        venueTemplateId: selectedTemplateId,
        canvasSettings,
        zones: updatedZones,
        stages,
        structures,
        seats,
        ticketTiers: syncedTiers,
      });

      await ticketApi.publishSeatLayout(activeEventId, {
        eventId: activeEventId,
        draftJson: JSON.stringify(payload),
        svgData: generateSeatMapSVG(payload),
        imageUrl: null,
        status: 'PUBLISHED',
        zones: buildZonesPayload(updatedZones),
      });

      await onSave?.(payload);
      setSavedVersion((prev) => Math.max(prev, versionAtStart));
      setLayoutStatus('PUBLISHED');
      setSaveSuccess(true);
      window.setTimeout(() => setSaveSuccess(false), 2500);
      setAutoSaveStatus(t('Đã xuất bản sơ đồ chính thức!'));
      showToast('success', t('ĐÃ LƯU CHÍNH THỨC & XUẤT BẢN (PUBLISHED) SƠ ĐỒ GHẾ THÀNH CÔNG!'));
    } catch (err) {
      console.error('Error publishing seat layout:', err);
      showToast('error', isForbiddenError(err) ? t("Bạn không có quyền thực hiện thao tác này") : t('Đã xảy ra lỗi khi xuất bản sơ đồ ghế lên CSDL!'));
    } finally {
      setIsSaving(false);
    }
  };

  /** Bật hoặc thoát chế độ toàn màn hình cho vùng studio. */
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      studioRef.current?.requestFullscreen?.().catch(() => { });
    } else {
      document.exitFullscreen?.().catch(() => { });
    }
  };

  useEffect(() => {
    /** Cập nhật cờ toàn màn hình theo trạng thái thật của trình duyệt (kể cả khi thoát bằng phím Esc). */
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const assignedZoneCount = Object.values(zones).filter((zone) => zone.tierId).length;

  // các vấn đề tìm thấy trong sơ đồ, chỉ tính lại khi sơ đồ hoặc hạng vé đổi
  const issues = useMemo(
    () => validateSeatMap({ seats, stages, structures, zones }, effectiveTiers),
    [seats, stages, structures, zones, effectiveTiers]
  );

  /** Chọn phần tử mà một lỗi nói tới và yêu cầu canvas cuộn tới đó. */
  const handleSelectIssue = (issue: SeatMapIssue) => {
    const target = issue.target;
    if (!target) return;
    if (target.kind === 'seat') {
      setSelectedSeatIds(target.ids ?? [target.id]);
      setSelectedZoneId(null);
    } else {
      setSelectedSeatIds([]);
      setSelectedZoneId(target.id);
    }
    setSelectedStageId(null);
    setSelectedStructureId(null);
    setFocusRequest((prev) => ({ kind: target.kind, id: target.id, nonce: (prev?.nonce ?? 0) + 1 }));
  };

  return (
    <div ref={studioRef} className={`seat-studio-root ${isFullscreen ? 'is-fullscreen' : ''}`}>
      <div className="seat-studio-header">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="seat-studio-badge">HALOTICKET</span>
            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.16em]">Seat Map Studio</span>
            <span
              className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${autoSaveError
                ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                }`}
              title={autoSaveError ?? undefined}
              role={autoSaveError ? 'alert' : 'status'}
            >
              {autoSaveStatus}
            </span>
            {unsaved && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30 text-[10px] font-bold">
                {t('Chưa lưu lên máy chủ')}
              </span>
            )}
            {layoutStatus === 'PUBLISHED' ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold tracking-wide flex items-center gap-1">
                <FiCheckCircle className="w-3 h-3" /> CHÍNH THỨC (PUBLISHED)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-extrabold tracking-wide">
                BẢN NHÁP (DRAFT)
              </span>
            )}
          </div>
          <h2 className="text-base font-black app-text-main truncate mt-1">{eventName}</h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {previousSnapshotBeforePreset && (
            <button
              type="button"
              onClick={handleRevertToPreviousVersion}
              className="seat-studio-secondary-button border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 font-bold flex items-center gap-1.5"
              title={t("Khôi phục lại sơ đồ trước khi áp dụng mẫu địa điểm")}
            >
              <FiRefreshCw className="w-3.5 h-3.5" />
              <span>{t("Khôi phục bản trước")}</span>
            </button>
          )}
          <button type="button" onClick={() => setIsTemplateModalOpen(true)} className="seat-studio-secondary-button"><FiLayers className="w-4 h-4" />{t("Mẫu địa điểm")} <span className="seat-studio-badge ml-1">{templates.length}</span></button>
          <button type="button" onClick={() => setIsTierModalOpen(true)} className="seat-studio-secondary-button"><FiTag className="w-4 h-4" />{t("Hạng vé")} <span className="seat-studio-badge ml-1">{assignedZoneCount}/{Object.keys(zones).length}</span></button>
          <button type="button" onClick={handleExportImage} className="seat-studio-secondary-button border-teal-500/30 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10" title={t("Xuất file ảnh PNG sơ đồ sự kiện")}><FiCamera className="w-4 h-4" />{t("Xuất ảnh sơ đồ")}</button>

          <button type="button" onClick={handleOpenJSONModal} className="seat-studio-icon-button" title="Import/Export JSON"><FiDownload /></button>
          <button type="button" onClick={handleClearCanvas} className="seat-studio-icon-button text-rose-500" title={t("Xóa canvas")}><FiTrash2 /></button>
          
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="seat-studio-secondary-button border-amber-500/40 text-amber-500 hover:bg-amber-500/10 font-bold"
            title={t("Lưu tạm sơ đồ dưới dạng Bản nháp")}
          >
            <FiSave className="w-4 h-4" />
            <span>{isSaving ? t('Đang lưu...') : t('Lưu nháp')}</span>
          </button>
          <button
            type="button"
            onClick={handlePublishOfficial}
            disabled={isSaving}
            className="seat-studio-primary-button bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md"
            title={t("Xuất bản chính thức sơ đồ ghế cho khán giả mua vé")}
          >
            <FiSend className="w-4 h-4" />
            <span>{isSaving ? t('Đang lưu...') : t('Lưu chính thức')}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="seat-studio-save-toast"><FiCheckCircle className="w-4 h-4" />{t("Đã lưu Seat Map thành công.")}</div>
      )}

      <SeatMapStats seats={seats} tiers={effectiveTiers} zones={zones} stages={stages} structures={structures} compact />

      {!isAttendeeMode && (
        <SeatMapIssuesPanel
          issues={issues}
          isOpen={issuesOpen}
          onToggle={() => setIssuesOpen((prev) => !prev)}
          onSelectIssue={handleSelectIssue}
        />
      )}

      <div className={`flex flex-row gap-3 w-full ${isFullscreen ? 'flex-1 min-h-0 items-stretch' : 'items-start'}`}>
        {/* Cột công cụ bên trái (ToolBar): thanh dọc gọn */}
        {!isAttendeeMode && (
          <div className="w-12 flex-shrink-0 z-20" style={sideColumnStyle}>
            <ToolBar
              zones={zones}
              tiers={effectiveTiers}
              selectedSeatIds={selectedSeatIds}
              canvasSettings={canvasSettings}
              onAddRow={handleAddRow}
              onAddMatrix={handleAddMatrix}
              onAddArc={handleAddArc}
              onAddTable={handleAddTable}
              onAddStage={handleAddStage}
              onAddStructure={handleAddStructure}
              onAddZoneBlock={handleAddZoneBlock}
              onResizeCanvas={handleResizeCanvas}
              onImportSvg={handleImportSvg}
              onDeleteSelected={handleDeleteSelected}
              onDuplicateSelected={handleDuplicateSelected}
              onSelectAll={handleSelectAll}
              canDuplicate={hasAnySelection}
            />
          </div>
        )}

        {/* Cột canvas ở giữa (SeatCanvas): giãn ra chiếm hết chỗ trống */}
        <div className={`flex-1 min-w-0 ${isFullscreen ? 'h-full flex flex-col' : ''}`}>
          <SeatCanvas
            seats={seats}
            stages={stages}
            structures={structures}
            zones={zones}
            tiers={effectiveTiers}
            canvasSettings={canvasSettings}
            selectedSeatIds={selectedSeatIds}
            setSelectedSeatIds={setSelectedSeatIds}
            selectedStageId={selectedStageId}
            setSelectedStageId={setSelectedStageId}
            selectedStructureId={selectedStructureId}
            setSelectedStructureId={setSelectedStructureId}
            selectedZoneId={selectedZoneId}
            setSelectedZoneId={setSelectedZoneId}
            onUpdateSeats={setSeats}
            onUpdateStages={setStages}
            onUpdateStructures={setStructures}
            onUpdateZones={setZones}
            onUpdateCanvasSettings={setCanvasSettings}
            onDeleteSelected={handleDeleteSelected}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            onCommitHistory={() => window.requestAnimationFrame(() => pushHistory())}
            isAttendeeMode={isAttendeeMode}
            attendeeCart={attendeeCart}
            onToggleAttendeeSeat={handleToggleAttendeeSeat}
            onSelectZoneAttendee={(zone) => {
              setSelectedZoneModal(zone);
              setZoneTicketQuantity(1);
            }}
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
            onCanvasClickPosition={setLastClickedPos}
            onNotify={showToast}
            onCopy={handleCopySelected}
            onPaste={handlePasteClipboard}
            onDuplicate={handleDuplicateSelected}
            onNudge={handleNudgeSelected}
            onShowShortcuts={() => setShowShortcuts(true)}
            focusRequest={focusRequest}
          />
        </div>

        {/* Cột thuộc tính bên phải (PropertyPanel hoặc AttendeePreview) */}
        <div
          style={panelColumnStyle}
          className={`transition-all duration-200 flex-shrink-0 z-20 ${isPropertyPanelCollapsed ? 'w-12' : 'w-full lg:w-80'
            }`}
        >
          {!isAttendeeMode ? (
            <PropertyPanel
              isCollapsed={isPropertyPanelCollapsed}
              onToggleCollapse={() => setIsPropertyPanelCollapsed((prev) => !prev)}
              selectedSeatIds={selectedSeatIds}
              selectedStageId={selectedStageId}
              selectedStructureId={selectedStructureId}
              selectedZoneId={selectedZoneId}
              seats={seats}
              stages={stages}
              structures={structures}
              zones={zones}
              tiers={effectiveTiers}
              onUpdateSeatProps={handleUpdateSeatProps}
              onUpdateStageProps={handleUpdateStageProps}
              onUpdateStructureProps={handleUpdateStructureProps}
              onUpdateZoneProps={handleUpdateZoneProps}
              onMoveSeatsToZone={handleMoveSeatsToZone}
              onArrangeSeats={handleArrangeSeats}
              onDeleteSelected={handleDeleteSelected}
            />
          ) : (
            <AttendeePreview
              cart={attendeeCart}
              tiers={effectiveTiers}
              zones={zones}
              onRemoveCartSeat={(seatId) => setAttendeeCart((prev) => prev.filter((seat) => seat.id !== seatId))}
              onClearCart={() => setAttendeeCart([])}
            />
          )}
        </div>
      </div>

      <VenueTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        templates={templates}
        selectedTemplateId={selectedTemplateId}
        onSelectTemplate={handleLoadPreset}
        venueId={eventVenue?.id}
        venueName={eventVenue?.name}
      />

      <TierManagerModal
        isOpen={isTierModalOpen}
        onClose={() => setIsTierModalOpen(false)}
        tiers={effectiveTiers}
        readOnly={true}
      />

      {isJSONModalOpen && (
        <div className="seat-studio-modal-backdrop" onMouseDown={() => setIsJSONModalOpen(false)}>
          <div className="seat-studio-modal max-w-3xl" onMouseDown={(e) => e.stopPropagation()}>
            <div className="h-14 px-5 border-b app-border flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black app-text-main">Import / Export Seat Map JSON v2.0</h3>
                <p className="text-[10px] app-text-muted">{t("Import không ghi đè danh sách giá vé của sự kiện hiện tại.")}</p>
              </div>
              <button type="button" onClick={() => setIsJSONModalOpen(false)} className="seat-studio-icon-button"><FiX /></button>
            </div>
            <div className="p-5 space-y-4">
              <textarea rows={18} value={jsonText} onChange={(e) => setJsonText(e.target.value)} className="seat-studio-input font-mono text-[11px] resize-y" />
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(jsonText);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1600);
                  }}
                  className="seat-studio-secondary-button"
                >
                  {copied ? <FiCheck /> : <FiCopy />} {copied ? t('Đã sao chép') : t('Sao chép JSON')}
                </button>
                <button type="button" onClick={handleImportJSON} className="seat-studio-primary-button"><FiUpload />{t("Nạp JSON vào Studio")}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal chọn số vé theo khu ở chế độ xem trước */}
      {selectedZoneModal && (
        <div className="seat-studio-modal-backdrop" onMouseDown={() => setSelectedZoneModal(null)}>
          <div className="seat-studio-modal max-w-md p-6 space-y-4" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b app-border pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500">{t("Khán giả chọn mua vé theo Zone")}</span>
                <h3 className="text-base font-black app-text-main mt-0.5">{selectedZoneModal.name}</h3>
              </div>
              <button type="button" onClick={() => setSelectedZoneModal(null)} className="seat-studio-icon-button"><FiX /></button>
            </div>

            <div className="p-4 rounded-xl app-bg-main border app-border space-y-2 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="app-text-muted">{t("Hạng vé đính kèm")}:</span>
                <span className="font-bold text-blue-500">
                  {effectiveTiers.find((t) => t.id === selectedZoneModal.tierId)?.name || t('Vé Tiêu Chuẩn')}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="app-text-muted">{t("Đơn giá")}:</span>
                <span className="font-bold text-emerald-500">
                  {(selectedZoneModal.price ?? effectiveTiers.find((t) => t.id === selectedZoneModal.tierId)?.price ?? 0).toLocaleString('vi-VN')} đ
                </span>
              </div>
              {selectedZoneModal.capacity && (
                <div className="flex items-center justify-between text-xs">
                  <span className="app-text-muted">{t("Sức chứa tối đa")}:</span>
                  <span className="font-bold app-text-main">{selectedZoneModal.capacity} {t("vé")}</span>
                </div>
              )}
            </div>

            {/* Bộ đếm số lượng */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold app-text-muted uppercase">{t("Chọn Số Lượng Vé")}</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setZoneTicketQuantity((prev) => Math.max(1, prev - 1))}
                  className="w-10 h-10 rounded-xl app-bg-main border app-border font-bold text-lg hover:border-emerald-500/40 transition-colors cursor-pointer"
                >
                  -
                </button>
                <span className="flex-1 text-center font-mono font-extrabold text-lg app-text-main">
                  {zoneTicketQuantity}
                </span>
                <button
                  type="button"
                  onClick={() => setZoneTicketQuantity((prev) => Math.min(10, prev + 1))}
                  className="w-10 h-10 rounded-xl app-bg-main border app-border font-bold text-lg hover:border-emerald-500/40 transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Tính tổng tiền */}
            <div className="flex items-center justify-between pt-2 border-t app-border">
              <span className="text-xs font-bold app-text-muted">{t("Tổng tiền tạm tính")}:</span>
              <span className="font-mono text-lg font-black text-emerald-500">
                {((selectedZoneModal.price ?? effectiveTiers.find((t) => t.id === selectedZoneModal.tierId)?.price ?? 0) * zoneTicketQuantity).toLocaleString('vi-VN')} đ
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                const baseId = Date.now();
                const newZoneCartSeats: Seat[] = Array.from({ length: zoneTicketQuantity }, (_, idx) => ({
                  id: `cart_zone_${selectedZoneModal.id}_${baseId}_${idx}`,
                  row: selectedZoneModal.name,
                  number: idx + 1,
                  x: 0,
                  y: 0,
                  zoneId: selectedZoneModal.id,
                  tierId: selectedZoneModal.tierId,
                  status: 'available',
                }));

                setAttendeeCart((prev) => [...prev, ...newZoneCartSeats]);
                setSelectedZoneModal(null);
                setZoneTicketQuantity(1);
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{t("Thêm")} {zoneTicketQuantity} {t("Vé Vào Giỏ Hàng")}</span>
            </button>
          </div>
        </div>
      )}

      <ShortcutsDialog isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />

      {/* Thông báo toast toàn cục */}
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {/* Modal xác nhận tùy biến */}
      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          type={confirmModal.type}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => {
            confirmModal.onCancel?.();
            setConfirmModal(null);
          }}
        />
      )}
    </div>
  );
};

export default EventSeatingMap;
