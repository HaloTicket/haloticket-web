import type { Seat, ZoneBlock, ZoneSellMode } from '@/types/seating';

/** Trạng thái (không phân biệt hoa thường) mà ghế không còn mua được. */
const UNAVAILABLE_SEAT_STATUSES = new Set(['sold', 'held', 'holding', 'reserved', 'blocked', 'maintenance']);

/**
 * Kiểm tra một trạng thái ghế có nghĩa là không còn mua được (đã bán, đang giữ, đã đặt trước, bị chặn hoặc bảo trì).
 *
 * @param status - Trạng thái ghế, không phân biệt hoa thường; rỗng được coi là còn trống.
 * @returns True nếu ghế không mua được.
 */
export const isSeatUnavailableStatus = (status: string | undefined | null): boolean =>
  UNAVAILABLE_SEAT_STATUSES.has(String(status ?? '').toLowerCase());

/** Trạng thái (không phân biệt hoa thường) tính là đã dùng chỗ của khu bán theo số lượng. */
const USED_GENERAL_STATUSES = new Set(['sold', 'held', 'holding']);

/** Hạng vé tối thiểu cần để xác định hạng của khu vực. */
interface TierLike {
  id: string;
  name: string;
}

/** Tình trạng chỗ của một khu vực, dùng chung cho trình thiết kế và trang mua vé. */
export interface ZoneAvailability {
  /** Kiểu bán của khu vực. */
  mode: ZoneSellMode;
  /** Tổng số chỗ; `null` khi khu bán theo số lượng mà chưa khai báo sức chứa. */
  total: number | null;
  /** Số chỗ đã bán, đang giữ hoặc không mua được. */
  unavailable: number;
  /** Số chỗ còn lại; `null` khi không biết tổng. */
  remaining: number | null;
  /** True khi chắc chắn không còn chỗ. Khu chưa khai báo sức chứa không bao giờ bị coi là hết. */
  soldOut: boolean;
}

/**
 * Lấy các ghế thuộc một khu vực: ghế có `zoneId` trùng mã khu, hoặc trùng tên khu (dữ liệu cũ lưu tên thay vì mã).
 * Không đoán theo vị trí hình học để khu chồng lên nhau không lấy nhầm ghế.
 *
 * @param zone - Khu vực cần xét.
 * @param seats - Toàn bộ ghế của sơ đồ.
 * @returns Danh sách ghế của khu vực.
 */
export const getZoneSeats = <T extends Pick<Seat, 'zoneId'>>(zone: Pick<ZoneBlock, 'id' | 'name'>, seats: T[] | undefined | null): T[] =>
  (seats ?? []).filter((s) => s.zoneId === zone.id || (!!zone.name && s.zoneId === zone.name));

/**
 * Xác định kiểu bán của khu vực: khu có ghế bán theo ghế, khu không có ghế bán theo số lượng.
 * Kiểu bán không được lưu riêng mà luôn suy ra từ dữ liệu, để không lệch với số ghế thật.
 *
 * @param zone - Khu vực cần xét.
 * @param seats - Toàn bộ ghế của sơ đồ.
 * @returns `'SEATED'` hoặc `'GENERAL'`.
 */
export const getZoneSellMode = (zone: ZoneBlock, seats: Pick<Seat, 'zoneId'>[] | undefined | null): ZoneSellMode =>
  getZoneSeats(zone, seats).length > 0 ? 'SEATED' : 'GENERAL';

/**
 * Tính tình trạng chỗ của khu vực theo một quy tắc duy nhất.
 * Khu bán theo ghế: đếm ghế không còn mua được. Khu bán theo số lượng: đếm các khóa trạng thái trùng mã khu
 * (đúng `zone.id` hoặc bắt đầu bằng `zone.id_`) có trạng thái đã bán hoặc đang giữ, rồi trừ khỏi sức chứa.
 *
 * @param zone - Khu vực cần xét.
 * @param seats - Toàn bộ ghế của sơ đồ.
 * @param statusMap - Bản đồ mã sang trạng thái lấy từ máy chủ (có thể rỗng).
 * @returns Tình trạng chỗ của khu vực.
 */
export const getZoneAvailability = (
  zone: ZoneBlock,
  seats: Seat[] | undefined | null,
  statusMap: Record<string, string> | undefined | null
): ZoneAvailability => {
  const map = statusMap ?? {};
  const mode = getZoneSellMode(zone, seats);

  if (mode === 'SEATED') {
    const zoneSeats = getZoneSeats(zone, seats);
    const unavailable = zoneSeats.filter((s) => isSeatUnavailableStatus(map[s.id] ?? s.status)).length;
    const remaining = Math.max(0, zoneSeats.length - unavailable);
    return { mode, total: zoneSeats.length, unavailable, remaining, soldOut: remaining <= 0 };
  }

  const total = zone.capacity && zone.capacity > 0 ? zone.capacity : null;
  const prefix = `${zone.id}_`;
  const unavailable = Object.entries(map).filter(
    ([key, status]) => (key === zone.id || key.startsWith(prefix)) && USED_GENERAL_STATUSES.has(String(status).toLowerCase())
  ).length;
  const remaining = total === null ? null : Math.max(0, total - unavailable);
  return { mode, total, unavailable, remaining, soldOut: remaining !== null && remaining <= 0 };
};

/**
 * Tìm hạng vé của một khu vực. Chỉ chấp nhận khớp chắc chắn: theo mã hạng vé, theo mã hạng vé của sơ đồ rồi đối chiếu tên,
 * hoặc theo tên khu trùng hẳn tên hạng (dữ liệu cũ). Không đoán theo tên có chứa hay "chỉ có một hạng".
 *
 * @param zone - Khu vực cần xét.
 * @param tiers - Danh sách hạng vé đang bán.
 * @param layoutTiers - Danh sách hạng vé lưu trong sơ đồ (id có thể khác `tiers`), dùng để đối chiếu theo tên.
 * @returns Hạng vé tìm được, hoặc `undefined` nếu khu chưa gán hạng hợp lệ.
 */
export const resolveZoneTier = <T extends TierLike>(
  zone: Pick<ZoneBlock, 'name' | 'tierId'>,
  tiers: T[] | undefined | null,
  layoutTiers?: TierLike[] | null
): T | undefined => {
  const list = tiers ?? [];
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

  if (zone.tierId) {
    const byId = list.find((t) => t.id === zone.tierId);
    if (byId) return byId;
    const layoutTier = (layoutTiers ?? []).find((t) => t.id === zone.tierId);
    if (layoutTier) {
      const byLayoutName = list.find((t) => same(t.name, layoutTier.name));
      if (byLayoutName) return byLayoutName;
    }
    return undefined;
  }
  return zone.name ? list.find((t) => same(t.name, zone.name)) : undefined;
};

/**
 * Giới hạn tình trạng chỗ của khu bán theo số lượng bằng số vé còn mua được của hạng vé. Kho vé do máy chủ quản lý theo hạng vé
 * (các khu cùng hạng dùng chung kho), nên số chỗ thực còn lại là số nhỏ hơn giữa sức chứa của khu và kho của hạng.
 * Khu bán theo ghế không đổi vì mỗi ghế đã là một đơn vị tồn kho.
 *
 * @param availability - Kết quả của getZoneAvailability.
 * @param tierBuyable - Số vé hạng vé còn mua được; `undefined` nếu chưa biết.
 * @returns Tình trạng chỗ đã áp giới hạn của hạng vé.
 */
export const applyTierStock = (availability: ZoneAvailability, tierBuyable: number | undefined | null): ZoneAvailability => {
  if (availability.mode !== 'GENERAL' || tierBuyable === undefined || tierBuyable === null || !Number.isFinite(tierBuyable)) {
    return availability;
  }
  const stock = Math.max(0, tierBuyable);
  const remaining = availability.remaining === null ? stock : Math.min(availability.remaining, stock);
  return { ...availability, remaining, soldOut: remaining <= 0 };
};
