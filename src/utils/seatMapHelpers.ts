import type {
    CanvasSettings,
    ElementShape,
    Seat,
    SeatMapDocument,
    SeatTier,
    VenueTemplate,
    ZoneBlock,
    ZoneShape,
} from '@/types/seating';

// default canvas settings
export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
    width: 1500,
    height: 1050,
    gridSize: 20,
    snapEnabled: true,
    showGrid: true,
    backgroundLabel: 'MẶT BẰNG SỰ KIỆN',
};

// default event ticket tiers
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

// currency formatter
export const formatCurrency = (value?: number) =>
    typeof value === 'number' ? `${value.toLocaleString('vi-VN')} đ` : 'Chưa gán giá';

// find ticket tier by id
export const getTierById = (tiers: SeatTier[], tierId?: string) =>
    tierId ? tiers.find((tier) => tier.id === tierId) : undefined;

// get ticket tier for zone
export const getTierForZone = (
    zone: ZoneBlock | undefined,
    tiers: SeatTier[]
): SeatTier | undefined => getTierById(tiers, zone?.tierId);

// get ticket tier for seat
export const getTierForSeat = (
    seat: Seat,
    zones: Record<string, ZoneBlock>,
    tiers: SeatTier[]
): SeatTier | undefined => {
    const explicit = getTierById(tiers, seat.tierId);
    if (explicit) return explicit;
    return getTierForZone(zones[seat.zoneId], tiers);
};

// get color for zone
export const getZoneColor = (
    zone: ZoneBlock | undefined,
    tiers: SeatTier[]
): string => getTierForZone(zone, tiers)?.color || zone?.color || '#64748b';

// get clip path for zone shape
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

// get clip path for element shape
export const getElementClipPath = (shape?: ElementShape) => {
    if (shape === 'ellipse') return 'ellipse(50% 50% at 50% 50%)';
    if (shape === 'trapezoid') return 'polygon(8% 0, 92% 0, 100% 100%, 0 100%)';
    if (shape === 'runway') return 'polygon(6% 0, 94% 0, 100% 20%, 100% 80%, 94% 100%, 6% 100%, 0 80%, 0 20%)';
    return undefined;
};

// snap value to grid
export const snapValue = (value: number, gridSize: number, enabled = true) =>
    enabled ? Math.round(value / gridSize) * gridSize : Math.round(value);

// clone venue template for current event
export const cloneTemplateForCurrentEvent = (
    template: VenueTemplate,
    ticketTiers: SeatTier[]
) => {
    const zones = Object.fromEntries(
        Object.entries(template.zones || {}).map(([id, zone]) => [
            id,
            {
                ...zone,
                // Preserve layout color only as a visual hint. Current event pricing is not copied.
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

// build seat map document
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

// safely clone object
export const safeClone = <T,>(value: T): T => {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value)) as T;
};

// check if seat position is inside zone bounds
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

// find matching zone for seat position
export const findZoneForSeat = (
  seat: { x: number; y: number },
  zones: Record<string, ZoneBlock>
): string | null => {
  for (const zone of Object.values(zones)) {
    if (isSeatInsideZone(seat, zone)) {
      return zone.id;
    }
  }
  return null;
};

// reassign zones for seat array
export const reassignSeatZones = (
  seats: Seat[],
  zones: Record<string, ZoneBlock>
): Seat[] => {
  const zoneList = Object.values(zones);
  if (!zoneList.length) return seats;

  return seats.map((seat) => {
    const currentZone = zones[seat.zoneId];
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

