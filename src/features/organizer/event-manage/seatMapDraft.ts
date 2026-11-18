// Bản nháp cục bộ của sơ đồ ghế và các phép so sánh mà studio cần. Thuần túy, chỉ phụ thuộc vào storage được truyền vào.
import type { SeatMapDocument } from '@/types/seating';

/**
 * Khóa localStorage của bản nháp, mỗi sự kiện một khóa theo id. Trước đây còn ghi thêm khóa dựng từ TÊN sự kiện:
 * hai sự kiện trùng tên ghi đè bản nháp của nhau nên khóa đó đã bị bỏ.
 */
export const draftStorageKey = (eventId: string): string => `haloticket_seatmap_draft_${eventId}`;

/** Giao diện tối thiểu của nơi lưu bản nháp (tương thích {@code localStorage}), để dễ thay thế khi kiểm thử. */
export interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Bản nháp đọc từ trình duyệt: tài liệu sơ đồ và thời điểm lưu. */
export interface LocalDraft {
  doc: SeatMapDocument;
  savedAt: number | null; // epoch ms của doc.timestamp, null khi tài liệu không có
}

/** Đổi {@code timestamp} của tài liệu sang epoch ms; trả về {@code null} nếu thiếu hoặc không phân tích được. */
export const documentTimestamp = (doc: Pick<SeatMapDocument, 'timestamp'> | null | undefined): number | null => {
  if (!doc?.timestamp) return null;
  const value = Date.parse(doc.timestamp);
  return Number.isNaN(value) ? null : value;
};

/** Cho biết tài liệu có nội dung bố cục nào không (ghế, sân khấu, cấu trúc hoặc khu). */
export const hasLayoutContent = (doc: Partial<SeatMapDocument> | null | undefined): boolean =>
  Boolean(
    doc &&
      ((doc.seats?.length ?? 0) > 0 ||
        (doc.stages?.length ?? 0) > 0 ||
        (doc.structures?.length ?? 0) > 0 ||
        Object.keys(doc.zones ?? {}).length > 0)
  );

/** Đọc bản nháp của sự kiện từ storage; trả về {@code null} nếu chưa có, storage bị chặn hoặc dữ liệu hỏng. */
export const readLocalDraft = (storage: DraftStorage, eventId: string): LocalDraft | null => {
  try {
    const raw = storage.getItem(draftStorageKey(eventId));
    if (!raw) return null;
    const doc = JSON.parse(raw) as SeatMapDocument;
    return { doc, savedAt: documentTimestamp(doc) };
  } catch {
    return null; // storage bị chặn hoặc giá trị hỏng: coi như không có bản nháp
  }
};

/** Kết quả ghi bản nháp: thành công, hoặc thất bại kèm thông báo lỗi. */
export type DraftWriteResult = { ok: true } | { ok: false; message: string };

/** Ghi bản nháp vào storage. Lỗi được trả về chứ không nuốt: studio sẽ hiển thị (vượt dung lượng và storage bị chặn là các lỗi thường gặp). */
export const writeLocalDraft = (storage: DraftStorage, eventId: string, doc: SeatMapDocument): DraftWriteResult => {
  try {
    storage.setItem(draftStorageKey(eventId), JSON.stringify(doc));
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
};

/**
 * Chọn bản nháp nên đề xuất khi trình duyệt và máy chủ đều có (hoặc không có) bản nháp. Bản nháp cục bộ chỉ đáng
 * đề xuất khi mới hơn bản của máy chủ rõ rệt (quá {@code graceMs}): hai bản được ghi cùng lúc nên thời gian bằng nhau nghĩa là "như nhau".
 * @param localSavedAt - thời điểm lưu bản cục bộ (epoch ms) hoặc {@code null}
 * @param serverSavedAt - thời điểm lưu bản trên máy chủ (epoch ms) hoặc {@code null}
 * @param graceMs - độ lệch cho phép, mặc định 2000 ms
 * @returns {@code 'local'} hoặc {@code 'server'}
 */
export const chooseNewerDraft = (
  localSavedAt: number | null,
  serverSavedAt: number | null,
  graceMs = 2000
): 'local' | 'server' => {
  if (localSavedAt === null) return 'server';
  if (serverSavedAt === null) return 'local';
  return localSavedAt > serverSavedAt + graceMs ? 'local' : 'server';
};

/**
 * So sánh bằng về cấu trúc, thoát sớm. Dùng thay cho {@code JSON.stringify} cả hai bản chụp ở mỗi lần ghi lịch sử:
 * không phải dựng chuỗi và dừng ngay ở điểm khác biệt đầu tiên. Bỏ qua thuộc tính {@code undefined}; hai {@code NaN} coi là bằng nhau.
 */
export const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b);
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const leftKeys = Object.keys(left).filter((key) => left[key] !== undefined);
  const rightKeys = Object.keys(right).filter((key) => right[key] !== undefined);
  if (leftKeys.length !== rightKeys.length) return false;
  for (const key of leftKeys) {
    if (!(key in right) || !deepEqual(left[key], right[key])) return false;
  }
  return true;
};
