// Lượt quét không tới được máy chủ (mất mạng, hoặc cổng không tới được dịch vụ vé) được giữ ở đây và gửi lại
// sau, lần lượt từng lượt, qua lời gọi check-in thông thường. Chỉ lỗi mạng mới được thử lại: câu trả lời từ máy chủ (bị từ chối như
// ALREADY_USED, hoặc lỗi như 403) là kết quả cuối và lượt quét rời khỏi hàng chờ.
// Máy chủ ghi giờ check-in là lúc nhận được, nên lượt quét trong hàng chờ vào cổng theo giờ đồng bộ, không phải giờ quét.

/** Một lượt quét đang chờ gửi: sự kiện, mã băm QR, suất diễn (nếu có) và thời điểm đưa vào hàng chờ. */
export interface QueuedScan {
  id: string;
  eventId: string;
  qrCodeHash: string;
  showtimeId?: string | null;
  queuedAt: string;
}

/** Phần của {@code Storage} mà hàng chờ cần dùng, để dễ thay bằng bản giả khi kiểm thử. */
type StorageLike = Pick<Storage, "getItem" | "setItem">;

export const CHECKIN_QUEUE_KEY = "haloticket_checkin_queue_v1";
export const CHECKIN_QUEUE_LIMIT = 500;

/** Kết quả khi thêm vào hàng chờ: đã thêm, trùng với lượt đã có, hoặc hàng chờ đầy. */
export type AddResult = "added" | "duplicate" | "full";

/** Hàng chờ các lượt quét ngoại tuyến: liệt kê, đếm, thêm và xóa, có thể lọc theo sự kiện. */
export interface CheckinQueue {
  list(eventId?: string): QueuedScan[];
  size(eventId?: string): number;
  add(eventId: string, qrCodeHash: string, showtimeId?: string | null): AddResult;
  remove(id: string): void;
}

/** Lấy {@code localStorage} nếu dùng được; trả {@code null} khi không có hoặc trình duyệt chặn truy cập. */
function browserStorage(): StorageLike | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null; // trình duyệt chặn storage: khi đó hàng chờ chỉ nằm trong bộ nhớ
  }
}

/** Kiểm tra giá trị đọc từ bộ nhớ có đủ các trường bắt buộc của một lượt quét hay không. */
function isQueuedScan(value: unknown): value is QueuedScan {
  const v = value as Partial<QueuedScan> | null;
  return !!v && typeof v.id === "string" && typeof v.eventId === "string" && typeof v.qrCodeHash === "string";
}

/**
 * Tạo hàng chờ check-in lưu trong storage (mặc định {@code localStorage}), có bản sao trong bộ nhớ khi storage lỗi.
 * Mỗi sự kiện không có hai lượt quét trùng mã và tổng số lượt bị giới hạn bởi {@code CHECKIN_QUEUE_LIMIT}.
 *
 * @param storage nơi lưu, hoặc {@code null} để chỉ giữ trong bộ nhớ
 * @param now hàm lấy thời điểm hiện tại, dùng để ghi giờ vào hàng chờ
 * @param makeId hàm sinh mã định danh cho mỗi lượt quét
 * @returns hàng chờ vừa tạo
 */
export function createCheckinQueue(
  storage: StorageLike | null = browserStorage(),
  now: () => Date = () => new Date(),
  makeId: () => string = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
): CheckinQueue {
  let memory: QueuedScan[] = [];

  /** Đọc danh sách từ storage; dữ liệu hỏng hoặc không đọc được thì coi như rỗng, bỏ qua phần tử sai dạng. */
  const load = (): QueuedScan[] => {
    if (!storage) return memory;
    try {
      const parsed = JSON.parse(storage.getItem(CHECKIN_QUEUE_KEY) ?? "[]");
      return Array.isArray(parsed) ? parsed.filter(isQueuedScan) : [];
    } catch {
      return [];
    }
  };

  /** Ghi danh sách vào bộ nhớ và storage; lỗi ghi storage được bỏ qua vì đã có bản sao trong bộ nhớ. */
  const save = (items: QueuedScan[]) => {
    memory = items;
    if (!storage) return;
    try {
      storage.setItem(CHECKIN_QUEUE_KEY, JSON.stringify(items));
    } catch {
      // storage đầy hoặc bị chặn: bản sao trong bộ nhớ vẫn cho phép phiên trang này gửi chúng đi
    }
  };

  return {
    /** Liệt kê các lượt quét đang chờ, của một sự kiện nếu có truyền {@code eventId}. */
    list: (eventId) => load().filter((item) => !eventId || item.eventId === eventId),
    /** Đếm các lượt quét đang chờ, của một sự kiện nếu có truyền {@code eventId}. */
    size: (eventId) => load().filter((item) => !eventId || item.eventId === eventId).length,
    /** Thêm một lượt quét; trả {@code "duplicate"} nếu mã đã chờ trong cùng sự kiện, {@code "full"} nếu hàng chờ đã đầy. */
    add(eventId, qrCodeHash, showtimeId) {
      const items = load();
      if (items.some((item) => item.eventId === eventId && item.qrCodeHash === qrCodeHash)) return "duplicate";
      if (items.length >= CHECKIN_QUEUE_LIMIT) return "full";
      save([...items, { id: makeId(), eventId, qrCodeHash, showtimeId: showtimeId ?? null, queuedAt: now().toISOString() }]);
      return "added";
    },
    /** Xóa một lượt quét khỏi hàng chờ theo mã định danh. */
    remove(id) {
      save(load().filter((item) => item.id !== id));
    },
  };
}

/** Cho biết gửi lại sau này có thể thành công: yêu cầu không nhận được trả lời, hoặc cổng không tới được dịch vụ vé (502, 503, 504). */
export function isRetryableError(err: unknown): boolean {
  const e = err as { response?: { status?: number } | null; isAxiosError?: boolean; code?: string; request?: unknown } | null;
  if (!e || typeof e !== "object") return false;
  if (e.response) return [502, 503, 504].includes(e.response.status ?? 0);
  return e.isAxiosError === true || e.code === "ERR_NETWORK" || e.code === "ECONNABORTED" || e.request !== undefined;
}

/** Kết quả gửi một lượt quét trong hàng chờ: câu trả lời hoặc lỗi cuối cùng. */
export interface FlushEntry<T> {
  item: QueuedScan;
  /** câu trả lời của máy chủ, nếu có */
  body?: T;
  /** lỗi cuối cùng (không phải lỗi mạng), nếu có */
  error?: unknown;
}

/** Kết quả của một đợt gửi hàng chờ: từng lượt đã xử lý xong và số lượt còn lại. */
export interface FlushResult<T> {
  results: FlushEntry<T>[];
  remaining: number;
  /** {@code true} khi mạng hỏng giữa chừng: phần còn lại ở trong hàng chờ cho lần thử sau */
  stoppedByNetwork: boolean;
}

/** Gửi lần lượt các lượt quét đang chờ của một sự kiện. Dừng ở lỗi mạng đầu tiên và giữ lượt đó cùng phần còn lại trong hàng chờ. */
export async function flushCheckinQueue<T>(
  queue: CheckinQueue,
  eventId: string,
  send: (item: QueuedScan) => Promise<T>,
): Promise<FlushResult<T>> {
  const results: FlushEntry<T>[] = [];
  let stoppedByNetwork = false;
  for (const item of queue.list(eventId)) {
    try {
      const body = await send(item);
      queue.remove(item.id);
      results.push({ item, body });
    } catch (error) {
      if (isRetryableError(error)) {
        stoppedByNetwork = true;
        break;
      }
      queue.remove(item.id);
      results.push({ item, error });
    }
  }
  return { results, remaining: queue.size(eventId), stoppedByNetwork };
}
