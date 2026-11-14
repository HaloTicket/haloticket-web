// Pre-publish checks of a seat map. Pure: takes the layout and the ticket tiers, returns a list of issues.
import type { Seat, SeatTier } from '@/types/seating';
import { isSeatInsideZone } from '@/utils/seatMapHelpers';
import type { SeatMapLayout } from './seatMapEditing';

export type SeatMapIssueSeverity = 'error' | 'warning';

export type SeatMapIssueCode =
  | 'NO_SEATS'
  | 'DUPLICATE_SEAT_LABEL'
  | 'SEAT_ZONE_MISSING'
  | 'SEAT_OUTSIDE_ZONE'
  | 'ZONE_WITHOUT_TIER'
  | 'ZONE_TIER_UNKNOWN'
  | 'SEATS_WITHOUT_TIER'
  | 'ZONE_EMPTY';

export interface SeatMapIssueTarget {
  kind: 'seat' | 'zone';
  id: string; // the element to scroll to
  ids?: string[]; // all the seats concerned, when kind is 'seat'
}

export interface SeatMapIssue {
  id: string;
  code: SeatMapIssueCode;
  severity: SeatMapIssueSeverity;
  // i18n key (the Vietnamese sentence with {{placeholders}}) and its values: the panel calls t(template, params)
  template: string;
  params: Record<string, string | number>;
  target?: SeatMapIssueTarget;
}

const label = (seat: Seat) => `${seat.row}${seat.number}`;

export const validateSeatMap = (layout: SeatMapLayout, tiers: SeatTier[]): SeatMapIssue[] => {
  const issues: SeatMapIssue[] = [];
  const zones = Object.values(layout.zones);
  const tierIds = new Set(tiers.map((tier) => tier.id));

  // a map with neither seats nor a standing zone with a capacity cannot sell anything
  const hasStanding = zones.some((zone) => (zone.capacity ?? 0) > 0);
  if (layout.seats.length === 0 && !hasStanding) {
    issues.push({
      id: 'NO_SEATS',
      code: 'NO_SEATS',
      severity: 'error',
      template: 'Sơ đồ chưa có ghế nào và không có khu đứng nào có sức chứa.',
      params: {},
    });
  }

  // duplicate labels inside one zone: same row and number
  const byLabel = new Map<string, Seat[]>();
  for (const seat of layout.seats) {
    const key = `${seat.zoneId}|${String(seat.row).trim().toLowerCase()}|${seat.number}`;
    const list = byLabel.get(key);
    if (list) list.push(seat);
    else byLabel.set(key, [seat]);
  }
  byLabel.forEach((list, key) => {
    if (list.length < 2) return;
    const zoneName = layout.zones[list[0].zoneId]?.name ?? list[0].zoneId;
    issues.push({
      id: `DUPLICATE_SEAT_LABEL:${key}`,
      code: 'DUPLICATE_SEAT_LABEL',
      severity: 'error',
      template: 'Ghế {{label}} bị trùng nhãn {{count}} lần trong khu {{zone}}.',
      params: { label: label(list[0]), count: list.length, zone: zoneName },
      target: { kind: 'seat', id: list[0].id, ids: list.map((seat) => seat.id) },
    });
  });

  // seats whose zone is gone, and seats lying outside the zone they belong to
  const missingZone = new Map<string, Seat[]>();
  const outside = new Map<string, Seat[]>();
  for (const seat of layout.seats) {
    const zone = layout.zones[seat.zoneId];
    if (!zone) {
      const list = missingZone.get(seat.zoneId);
      if (list) list.push(seat);
      else missingZone.set(seat.zoneId, [seat]);
    } else if (zone.width && zone.height && !isSeatInsideZone(seat, zone)) {
      const list = outside.get(zone.id);
      if (list) list.push(seat);
      else outside.set(zone.id, [seat]);
    }
  }
  missingZone.forEach((list, zoneId) =>
    issues.push({
      id: `SEAT_ZONE_MISSING:${zoneId}`,
      code: 'SEAT_ZONE_MISSING',
      severity: 'error',
      template: '{{count}} ghế thuộc một khu không còn tồn tại.',
      params: { count: list.length },
      target: { kind: 'seat', id: list[0].id, ids: list.map((seat) => seat.id) },
    })
  );
  outside.forEach((list, zoneId) =>
    issues.push({
      id: `SEAT_OUTSIDE_ZONE:${zoneId}`,
      code: 'SEAT_OUTSIDE_ZONE',
      severity: 'warning',
      template: '{{count}} ghế nằm ngoài ranh giới khu {{zone}}.',
      params: { count: list.length, zone: layout.zones[zoneId].name },
      target: { kind: 'seat', id: list[0].id, ids: list.map((seat) => seat.id) },
    })
  );

  // ticket tiers
  const seatsByZone = new Map<string, Seat[]>();
  for (const seat of layout.seats) {
    const list = seatsByZone.get(seat.zoneId);
    if (list) list.push(seat);
    else seatsByZone.set(seat.zoneId, [seat]);
  }
  for (const zone of zones) {
    const zoneSeats = seatsByZone.get(zone.id) ?? [];
    if (!zone.tierId) {
      issues.push({
        id: `ZONE_WITHOUT_TIER:${zone.id}`,
        code: 'ZONE_WITHOUT_TIER',
        severity: 'error',
        template: 'Khu {{zone}} chưa gán hạng vé.',
        params: { zone: zone.name },
        target: { kind: 'zone', id: zone.id },
      });
    } else if (tierIds.size > 0 && !tierIds.has(zone.tierId)) {
      issues.push({
        id: `ZONE_TIER_UNKNOWN:${zone.id}`,
        code: 'ZONE_TIER_UNKNOWN',
        severity: 'error',
        template: 'Khu {{zone}} gán hạng vé không còn tồn tại.',
        params: { zone: zone.name },
        target: { kind: 'zone', id: zone.id },
      });
    }

    // a seat takes the tier of its own, or else its zone's: it has none only when both are empty
    if (!zone.tierId) {
      const untiered = zoneSeats.filter((seat) => !seat.tierId);
      if (untiered.length) {
        issues.push({
          id: `SEATS_WITHOUT_TIER:${zone.id}`,
          code: 'SEATS_WITHOUT_TIER',
          severity: 'warning',
          template: '{{count}} ghế trong khu {{zone}} chưa có hạng vé.',
          params: { count: untiered.length, zone: zone.name },
          target: { kind: 'seat', id: untiered[0].id, ids: untiered.map((seat) => seat.id) },
        });
      }
    }

    if (zoneSeats.length === 0 && !(zone.capacity && zone.capacity > 0)) {
      issues.push({
        id: `ZONE_EMPTY:${zone.id}`,
        code: 'ZONE_EMPTY',
        severity: 'warning',
        template: 'Khu {{zone}} không có ghế và không có sức chứa.',
        params: { zone: zone.name },
        target: { kind: 'zone', id: zone.id },
      });
    }
  }

  return issues;
};

export const countIssues = (issues: SeatMapIssue[]): { errors: number; warnings: number } => ({
  errors: issues.filter((issue) => issue.severity === 'error').length,
  warnings: issues.filter((issue) => issue.severity === 'warning').length,
});
