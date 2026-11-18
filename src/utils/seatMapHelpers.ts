import type {
    CanvasSettings,
    ElementShape,
    Seat,
    SeatMapDocument,
    SeatTier,
    StructureElement,
    VenueTemplate,
    ZoneBlock,
    ZoneShape,
} from '@/types/seating';

/** Cài đặt khung vẽ mặc định của sơ đồ chỗ ngồi. */
export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
    width: 1500,
    height: 1050,
    gridSize: 20,
    snapEnabled: true,
    showGrid: true,
    backgroundLabel: 'MẶT BẰNG SỰ KIỆN',
};

/** Các hạng vé mặc định của sự kiện dùng khi chưa có cấu hình vé. */
export const DEFAULT_EVENT_TICKET_TIERS: SeatTier[] = [
    {
        id: 'tier-vvip',
        code: 'VVIP',
        name: 'VVIP',
        price: 5000000,
        color: '#7c3aed',
        description: 'Hạng vé đã được thiết lập từ bước Cấu hình vé.',
    },
    {
        id: 'tier-vip',
        code: 'VIP',
        name: 'VIP',
        price: 3000000,
        color: '#2563eb',
        description: 'Hạng vé đã được thiết lập từ bước Cấu hình vé.',
    },
    {
        id: 'tier-cat1',
        code: 'CAT1',
        name: 'CAT 1',
        price: 2000000,
        color: '#0891b2',
        description: 'Hạng vé đã được thiết lập từ bước Cấu hình vé.',
    },
    {
        id: 'tier-cat2',
        code: 'CAT2',
        name: 'CAT 2',
        price: 1500000,
        color: '#0f766e',
        description: 'Hạng vé đã được thiết lập từ bước Cấu hình vé.',
    },
    {
        id: 'tier-standard',
        code: 'STD',
        name: 'Standard',
        price: 1000000,
        color: '#475569',
        description: 'Hạng vé đã được thiết lập từ bước Cấu hình vé.',
    },
];

/**
 * Định dạng giá vé (VNĐ), hoặc "Chưa gán giá" khi chưa có giá.
 *
 * @param value - Giá vé.
 */
export const formatCurrency = (value?: number) =>
    typeof value === 'number' ? `${value.toLocaleString('vi-VN')} đ` : 'Chưa gán giá';

/** Tìm hạng vé theo mã; trả về `undefined` nếu không có mã hoặc không tìm thấy. */
export const getTierById = (tiers: SeatTier[], tierId?: string) =>
    tierId ? tiers.find((tier) => tier.id === tierId) : undefined;

/** Lấy hạng vé được gán cho khu vực. */
export const getTierForZone = (
    zone: ZoneBlock | undefined,
    tiers: SeatTier[]
): SeatTier | undefined => getTierById(tiers, zone?.tierId);

/** Lấy hạng vé của ghế: ưu tiên hạng gán riêng cho ghế, nếu không có thì dùng hạng của khu vực chứa ghế. */
export const getTierForSeat = (
    seat: Seat,
    zones: Record<string, ZoneBlock> | ZoneBlock[] | undefined | null,
    tiers: SeatTier[]
): SeatTier | undefined => {
    const explicit = getTierById(tiers, seat.tierId);
    if (explicit) return explicit;
    const zone = !zones ? undefined : Array.isArray(zones) ? zones.find((z) => z.id === seat.zoneId) : zones[seat.zoneId];
    return getTierForZone(zone, tiers);
};

/** Lấy màu hiển thị của khu vực: theo hạng vé, nếu không có thì theo màu của khu vực, cuối cùng là màu xám mặc định. */
export const getZoneColor = (
    zone: ZoneBlock | undefined,
    tiers: SeatTier[]
): string => getTierForZone(zone, tiers)?.color || zone?.color || '#64748b';

/** Lấy giá trị CSS `clip-path` cho hình dạng khu vực; hình `polygon` dùng đường cắt tùy chỉnh nếu có. Hình khác trả về `undefined`. */
export const getZoneClipPath = (
    shape?: ZoneShape | string,
    customClipPath?: string
): string | undefined => {
    switch (shape) {
        case 'ellipse':
            return 'ellipse(50% 50% at 50% 50%)';
        case 'trapezoid':
            return 'polygon(8% 0, 92% 0, 100% 100%, 0 100%)';
        case 'trapezoid_reverse':
            return 'polygon(0 0, 100% 0, 92% 100%, 8% 100%)';
        case 'diamond':
            return 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)';
        case 'fan':
            return 'polygon(12% 0, 88% 0, 100% 100%, 0 100%, 5% 52%)';
        case 'polygon':
            return customClipPath || 'polygon(8% 0, 92% 0, 100% 36%, 88% 100%, 12% 100%, 0 36%)';
        default:
            return undefined;
    }
};

/** Lấy giá trị CSS `clip-path` cho hình dạng của phần tử cấu trúc; hình không cần cắt trả về `undefined`. */
export const getElementClipPath = (shape?: ElementShape) => {
    if (shape === 'ellipse') return 'ellipse(50% 50% at 50% 50%)';
    if (shape === 'trapezoid') return 'polygon(8% 0, 92% 0, 100% 100%, 0 100%)';
    if (shape === 'runway') return 'polygon(6% 0, 94% 0, 100% 20%, 100% 80%, 94% 100%, 6% 100%, 0 80%, 0 20%)';
    return undefined;
};

/**
 * Làm tròn giá trị theo lưới; khi tắt bắt dính thì chỉ làm tròn về số nguyên.
 *
 * @param value - Giá trị cần làm tròn.
 * @param gridSize - Kích thước ô lưới.
 * @param enabled - Bật bắt dính lưới.
 */
export const snapValue = (value: number, gridSize: number, enabled = true) =>
    enabled ? Math.round(value / gridSize) * gridSize : Math.round(value);

/**
 * Sao chép mẫu địa điểm cho sự kiện hiện tại: bỏ gán hạng vé và giá, mở khóa và hiện mọi phần tử, đặt lại trạng thái ghế (chỉ giữ ghế dành cho người khuyết tật).
 *
 * @param template - Mẫu địa điểm.
 * @param ticketTiers - Hạng vé của sự kiện hiện tại.
 */
export const cloneTemplateForCurrentEvent = (
    template: VenueTemplate,
    ticketTiers: SeatTier[]
) => {
    const zones = Object.fromEntries(
        Object.entries(template.zones || {}).map(([id, zone]) => [
            id,
            {
                ...zone,
                // Chỉ giữ màu của bố cục làm gợi ý trực quan; không sao chép giá của sự kiện hiện tại.
                tierId: undefined,
                price: undefined,
                color: zone.color || '#64748b',
                hidden: false,
                locked: false,
            } satisfies ZoneBlock,
        ])
    );

    const seats = template.seats.map((seat) => ({
        ...seat,
        tierId: undefined,
        status: seat.status === 'accessible' ? 'accessible' : 'available',
        locked: false,
        hidden: false,
    })) as Seat[];

    return {
        seats,
        stages: template.stages.map((stage) => ({ ...stage, locked: false, hidden: false })),
        structures: template.structures.map((item) => ({ ...item, locked: false, hidden: false })),
        zones,
        canvasSettings: {
            ...DEFAULT_CANVAS_SETTINGS,
            ...(template.canvasSettings || {}),
        },
        ticketTiers,
    };
};

/**
 * Dựng tài liệu sơ đồ chỗ ngồi (phiên bản 2.0) kèm thời điểm tạo từ các thành phần của trình thiết kế.
 *
 * @param args - Tên, mẫu địa điểm, cài đặt khung vẽ, khu vực, sân khấu, cấu trúc, ghế và hạng vé.
 */
export const buildSeatMapDocument = (args: {
    name?: string;
    venueTemplateId?: string;
    canvasSettings: CanvasSettings;
    zones: Record<string, ZoneBlock>;
    stages: SeatMapDocument['stages'];
    structures: SeatMapDocument['structures'];
    seats: SeatMapDocument['seats'];
    ticketTiers: SeatTier[];
}): SeatMapDocument => ({
    version: '2.0',
    timestamp: new Date().toISOString(),
    name: args.name,
    venueTemplateId: args.venueTemplateId,
    canvasSettings: args.canvasSettings,
    zones: args.zones,
    stages: args.stages,
    structures: args.structures,
    seats: args.seats,
    ticketTiers: args.ticketTiers,
});

/** Sao chép sâu một đối tượng bằng `structuredClone`, hoặc bằng JSON nếu môi trường không hỗ trợ. */
export const safeClone = <T,>(value: T): T => {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value)) as T;
};

/**
 * Kiểm tra ghế có nằm trong khu vực không (có biên đệm 12 px), tính cả trường hợp khu vực bị xoay.
 *
 * @param seat - Tọa độ của ghế.
 * @param zone - Khu vực cần kiểm tra.
 */
export const isSeatInsideZone = (seat: { x: number; y: number }, zone: ZoneBlock): boolean => {
  const zX = zone.x || 0;
  const zY = zone.y || 0;
  const zW = zone.width || 800;
  const zH = zone.height || 180;
  const rot = zone.rotation || 0;

  const pad = 12;

  if (rot === 0) {
    return (
      seat.x >= zX - pad &&
      seat.x <= zX + zW + pad &&
      seat.y >= zY - pad &&
      seat.y <= zY + zH + pad
    );
  }

  const cx = zX + zW / 2;
  const cy = zY + zH / 2;
  const rad = (-rot * Math.PI) / 180;
  const dx = seat.x - cx;
  const dy = seat.y - cy;
  const localX = cx + dx * Math.cos(rad) - dy * Math.sin(rad);
  const localY = cy + dx * Math.sin(rad) + dy * Math.cos(rad);

  return (
    localX >= zX - pad &&
    localX <= zX + zW + pad &&
    localY >= zY - pad &&
    localY <= zY + zH + pad
  );
};

/**
 * Tìm khu vực đầu tiên chứa vị trí của ghế.
 *
 * @returns Mã khu vực, hoặc `null` nếu không có khu vực nào chứa.
 */
export const findZoneForSeat = (
  seat: { x: number; y: number },
  zones: Record<string, ZoneBlock> | ZoneBlock[] | undefined | null
): string | null => {
  const zoneList = !zones ? [] : Array.isArray(zones) ? zones : Object.values(zones);
  for (const zone of zoneList) {
    if (isSeatInsideZone(seat, zone)) {
      return zone.id;
    }
  }
  return null;
};

/**
 * Gán lại khu vực cho các ghế: ghế còn nằm trong khu vực hiện tại thì giữ nguyên, ngược lại chuyển sang khu vực chứa nó (nếu có).
 *
 * @param seats - Danh sách ghế.
 * @param zones - Các khu vực.
 * @returns Danh sách ghế mới; giữ nguyên nếu không có khu vực nào.
 */
export const reassignSeatZones = (
  seats: Seat[],
  zones: Record<string, ZoneBlock> | ZoneBlock[] | undefined | null
): Seat[] => {
  const zoneList = !zones ? [] : Array.isArray(zones) ? zones : Object.values(zones);
  if (!zoneList.length) return seats;

  return (seats || []).map((seat) => {
    const currentZone = Array.isArray(zones)
      ? zones.find((z) => z.id === seat.zoneId)
      : zones?.[seat.zoneId];
    if (currentZone && isSeatInsideZone(seat, currentZone)) {
      return seat;
    }
    const newZoneId = findZoneForSeat(seat, zones);
    if (newZoneId && newZoneId !== seat.zoneId) {
      return { ...seat, zoneId: newZoneId };
    }
    return seat;
  });
};

/**
 * Tạo chuỗi SVG hợp lệ của sơ đồ chỗ ngồi: nền trắng, tiêu đề, sân khấu, khu vực và ghế (màu theo ghế, hạng vé hoặc khu vực).
 *
 * @param doc - Dữ liệu sơ đồ.
 * @returns Chuỗi SVG.
 */
export const generateSeatMapSVG = (doc: {
  canvasSettings?: CanvasSettings;
  stages?: any[];
  structures?: any[];
  zones?: Record<string, ZoneBlock> | ZoneBlock[];
  seats?: Seat[];
  ticketTiers?: SeatTier[];
  name?: string;
}): string => {
  const w = doc.canvasSettings?.width || 1500;
  const h = doc.canvasSettings?.height || 1050;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`;
  
  // Nền trắng
  svg += `<rect width="100%" height="100%" fill="#ffffff"/>`;

  // Tên sự kiện / tiêu đề sơ đồ: căn giữa phía trên, cỡ lớn và rõ ràng
  const titleText = (doc.name || 'SƠ ĐỒ PHÂN BỔ GHẾ SỰ KIỆN').toUpperCase();
  svg += `<text x="${w / 2}" y="55" fill="#0f172a" font-size="28" font-weight="900" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle">${titleText}</text>`;
  svg += `<line x1="${w / 2 - 200}" y1="70" x2="${w / 2 + 200}" y2="70" stroke="#cbd5e1" stroke-width="2"/>`;

  // Vẽ sân khấu
  (doc.stages || []).forEach((stg) => {
    const rot = stg.rotation ? ` transform="rotate(${stg.rotation} ${stg.x + stg.width / 2} ${stg.y + stg.height / 2})"` : '';
    svg += `<g${rot}><rect x="${stg.x}" y="${stg.y}" width="${stg.width}" height="${stg.height}" rx="12" fill="${stg.color || '#6366f1'}" stroke="#4f46e5" stroke-width="2"/><text x="${stg.x + stg.width / 2}" y="${stg.y + stg.height / 2}" fill="#ffffff" font-size="16" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle" dominant-baseline="middle">${stg.label || 'SÂN KHẤU'}</text></g>`;
  });

  // Vẽ khu vực
  const zoneList = !doc.zones ? [] : Array.isArray(doc.zones) ? doc.zones : Object.values(doc.zones);
  zoneList.forEach((z) => {
    const zX = z.x ?? 0;
    const zY = z.y ?? 0;
    const zW = z.width ?? 100;
    const zH = z.height ?? 100;
    const rot = z.rotation ? ` transform="rotate(${z.rotation} ${zX + zW / 2} ${zY + zH / 2})"` : '';
    const color = z.color || '#3b82f6';
    svg += `<g${rot}><rect x="${zX}" y="${zY}" width="${zW}" height="${zH}" rx="${z.curvature || 12}" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="2.5"/><text x="${zX + zW / 2}" y="${zY + 28}" fill="${color}" font-size="14" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">${z.name || z.centerText || ''}</text></g>`;
  });

  // Vẽ ghế
  (doc.seats || []).forEach((seat) => {
    const zone = Array.isArray(doc.zones) ? doc.zones.find((z) => z.id === seat.zoneId) : doc.zones?.[seat.zoneId];
    const tier = doc.ticketTiers?.find((t) => t.id === (seat.tierId || zone?.tierId));
    const seatColor = seat.color || tier?.color || zone?.color || '#3b82f6';
    svg += `<circle cx="${seat.x}" cy="${seat.y}" r="12" fill="${seatColor}" stroke="#ffffff" stroke-width="1.5"/><text x="${seat.x}" y="${seat.y}" fill="#ffffff" font-size="9" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle" dominant-baseline="middle">${seat.number}</text>`;
  });

  svg += `</svg>`;
  return svg;
};

/**
 * Tạo bàn tiệc (gala) hình tròn và các ghế xếp quanh bàn; số ghế giới hạn từ 2 đến 24.
 *
 * @param args - Số bàn, tâm bàn, số ghế, bán kính (tùy chọn), khu vực và hạng vé.
 * @returns Cấu trúc bàn và danh sách ghế.
 */
export const generateGalaTableSeats = (args: {
  tableNumber: number;
  centerX: number;
  centerY: number;
  seatCount: number;
  radius?: number;
  zoneId: string;
  tierId?: string;
}) => {
  const count = Math.max(2, Math.min(24, args.seatCount));
  const r = args.radius || Math.max(50, Math.min(120, count * 9));
  const tableId = `gala_table_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  const tableStructure: StructureElement = {
    id: tableId,
    type: 'structure',
    label: `BÀN ${args.tableNumber}`,
    x: args.centerX - r,
    y: args.centerY - r,
    width: r * 2,
    height: r * 2,
    shape: 'ellipse',
    color: '#0284c7',
  };

  const seats: Seat[] = [];
  const distance = r + 24; // Khoảng cách từ tâm bàn tới ghế
  for (let i = 0; i < count; i++) {
    const angle = (i * 2 * Math.PI) / count - Math.PI / 2;
    const sx = Math.round(args.centerX + distance * Math.cos(angle));
    const sy = Math.round(args.centerY + distance * Math.sin(angle));
    const rotationDeg = Math.round((angle * 180) / Math.PI) + 90;

    seats.push({
      id: `seat_gala_${args.tableNumber}_${i + 1}_${Date.now()}_${i}`,
      row: `BÀN ${args.tableNumber}`,
      number: i + 1,
      x: sx,
      y: sy,
      rotation: rotationDeg,
      shape: 'circle',
      zoneId: args.zoneId,
      tierId: args.tierId,
      status: 'available',
    });
  }

  return { tableStructure, seats };
};

/**
 * Tạo nhãn hàng ghế theo thứ tự: tiền tố số thì cộng dần, tiền tố chữ thì tăng theo kiểu cột Excel (A, B, ..., Z, AA, AB...).
 *
 * @param startPrefix - Nhãn hàng đầu tiên, mặc định `A`.
 * @param rowIndex - Chỉ số hàng, bắt đầu từ 0.
 */
export const getRowLabel = (startPrefix: string, rowIndex: number): string => {
  const clean = (startPrefix || 'A').trim().toUpperCase();
  if (/^\d+$/.test(clean)) {
    return String(parseInt(clean, 10) + rowIndex);
  }

  let baseNum = 0;
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      baseNum = baseNum * 26 + (code - 64);
    }
  }

  const targetNum = (baseNum > 0 ? baseNum : 1) + rowIndex;
  let result = '';
  let n = targetNum;
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
};


