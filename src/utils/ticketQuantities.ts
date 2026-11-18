/**
 * Các số lượng hiển thị cho một loại vé. Backend mới gửi `remainingQuantity`, `heldQuantity`, `soldQuantity` và `availableQuantity` cùng với
 * `totalQuantity` và `initialQuantity` cũ; backend cũ chỉ gửi hai trường cũ. Mỗi hàm trả về `undefined` khi không thể biết số,
 * để màn hình hiển thị "không rõ" thay vì 0 hay con số 100 tự bịa.
 */
export interface TicketQuantityFields {
  initialQuantity?: number | null;
  totalQuantity?: number | null;
  remainingQuantity?: number | null;
  heldQuantity?: number | null;
  soldQuantity?: number | null;
  availableQuantity?: number | null;
  quantity?: number | null;
}

/** Trả về giá trị nếu là số hữu hạn, ngược lại `undefined`. */
const num = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

/** Số vé đã mở bán. */
export function getInitialQuantity(t: TicketQuantityFields): number | undefined {
  return num(t.initialQuantity);
}

/** Số vé còn trong kho, gồm cả vé đang giữ (backend cũ gửi `totalQuantity` với cùng ý nghĩa). */
export function getRemainingQuantity(t: TicketQuantityFields): number | undefined {
  return num(t.remainingQuantity) ?? num(t.totalQuantity) ?? num(t.quantity);
}

/** Số vé đang được các đơn chưa thanh toán giữ chỗ. Backend cũ không gửi nên là chưa biết (không phải 0). */
export function getHeldQuantity(t: TicketQuantityFields): number | undefined {
  return num(t.heldQuantity);
}

/** Số vé đã bán: lấy số của server, nếu không có thì bằng số mở bán trừ số còn lại; không bao giờ âm. */
export function getSoldQuantity(t: TicketQuantityFields): number | undefined {
  const sold = num(t.soldQuantity);
  if (sold !== undefined) return Math.max(0, sold);
  const initial = getInitialQuantity(t);
  const remaining = getRemainingQuantity(t);
  return initial !== undefined && remaining !== undefined ? Math.max(0, initial - remaining) : undefined;
}

/** Số vé khách còn mua được hiện tại: `availableQuantity` của server, nếu không có thì là số còn trong kho. */
export function getBuyableQuantity(t: TicketQuantityFields): number | undefined {
  const available = num(t.availableQuantity);
  if (available !== undefined) return Math.max(0, available);
  return getRemainingQuantity(t);
}

/** `true` trừ khi biết chắc loại vé đã hết (chưa biết số lượng thì vẫn coi là còn vé, như trước đây). */
export function isTicketInStock(t: TicketQuantityFields & { available?: boolean }): boolean {
  if (t.available === false) return false;
  const buyable = getBuyableQuantity(t);
  return buyable === undefined ? true : buyable > 0;
}

/**
 * Chuỗi hiển thị cho số lượng có thể chưa biết.
 *
 * @param value - Số lượng hoặc `undefined`.
 * @param unknown - Chữ hiển thị khi chưa biết.
 */
export function formatQuantity(value: number | undefined, unknown: string): string {
  return value === undefined ? unknown : value.toLocaleString("vi-VN");
}

/** Số lượng phát hành tối thiểu cho phép: đã bán cộng đang giữ (đang giữ chưa biết thì tính 0). `undefined` khi chưa biết số đã bán. */
export function getMinIssuedQuantity(t: TicketQuantityFields): number | undefined {
  const sold = getSoldQuantity(t);
  if (sold === undefined) return undefined;
  return sold + (getHeldQuantity(t) ?? 0);
}

/**
 * Số lượng nhà tổ chức nhìn thấy và gửi đi là số PHÁT HÀNH, không bao giờ là số còn trong kho. Vé từ server dùng `initialQuantity`
 * (nếu không có thì `totalQuantity` của backend cũ). Dữ liệu gửi đi giữ `totalQuantity` bằng `initialQuantity` để tương thích.
 *
 * @param tickets - Danh sách vé.
 * @returns Danh sách vé đã chuẩn hóa.
 */
export function normalizeTicketsForSave<T extends TicketQuantityFields>(tickets: T[]): T[] {
  return tickets.map((t) => {
    const issued = getInitialQuantity(t) ?? num(t.totalQuantity);
    return issued === undefined ? t : { ...t, initialQuantity: issued, totalQuantity: issued };
  });
}
