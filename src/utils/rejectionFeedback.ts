import type { RiskReasonItem } from "@/types/ai";

/** Các mục quản trị viên có thể đánh dấu khi từ chối sự kiện; mã mục được lưu trong ghi chú từ chối. */
export const FLAG_FIELDS = [
  { id: "posterImage", label: "Poster & Banner" },
  { id: "title", label: "Tên & Mô tả sự kiện" },
  { id: "dates", label: "Thời gian diễn ra" },
  { id: "tickets", label: "Danh sách Hạng vé" },
  { id: "location", label: "Địa điểm sự kiện" },
  { id: "paymentInfo", label: "Thông tin thanh toán / MST" },
] as const;

/** Mã của một mục có thể bị đánh dấu. */
export type FlagFieldId = (typeof FLAG_FIELDS)[number]["id"];

const FLAG_IDS: ReadonlySet<string> = new Set(FLAG_FIELDS.map((field) => field.id));
const MAX_QUOTES = 10;
const MAX_QUOTE_CHARS = 200;

/** Đoạn trích dẫn quản trị viên gửi kèm: nằm trong tiêu đề hoặc mô tả sự kiện. */
export interface FlaggedQuote {
  field: "title" | "description";
  text: string;
}

/** Ghi chú từ chối đã giải mã: lời nhắn, các mục bị đánh dấu và các đoạn trích dẫn. */
export interface RejectionNotes {
  noteText: string;
  flaggedFields: string[];
  flaggedQuotes: FlaggedQuote[];
}

/** Nhãn hiển thị của một mục bị đánh dấu; mã lạ trả về chính mã đó. */
export function flagLabel(id: string): string {
  return FLAG_FIELDS.find((field) => field.id === id)?.label ?? id;
}

/** Các bước của trình hướng dẫn chỉnh sửa chứa mục bị đánh dấu (bước thanh toán là bước cuối: 5 nếu có bước câu hỏi tùy chỉnh, ngược lại 4). */
export function stepsOfField(field: string, enableCustomQuestions: boolean): number[] {
  if (field === "posterImage" || field === "title" || field === "location") return [1];
  if (field === "dates" || field === "tickets") return [2];
  if (field === "paymentInfo") return [enableCustomQuestions ? 5 : 4];
  return [];
}

/** Danh sách bước (không trùng, tăng dần) chứa các mục bị đánh dấu. */
export function flaggedStepsFor(fields: string[], enableCustomQuestions: boolean): number[] {
  const steps = new Set<number>();
  for (const field of fields) for (const step of stepsOfField(field, enableCustomQuestions)) steps.add(step);
  return [...steps].sort((a, b) => a - b);
}

/** Các mục bị đánh dấu nằm trên một bước, theo thứ tự hộp thoại quản trị liệt kê. */
export function fieldsOnStep(fields: string[], step: number, enableCustomQuestions: boolean): string[] {
  return FLAG_FIELDS.filter((field) => fields.includes(field.id) && stepsOfField(field.id, enableCustomQuestions).includes(step)).map((field) => field.id);
}

/** Làm sạch danh sách trích dẫn đọc từ JSON: bỏ phần tử sai định dạng, cắt khoảng trắng và độ dài, bỏ đoạn quá ngắn hoặc trùng, giữ tối đa 10 đoạn. */
function cleanQuotes(value: unknown): FlaggedQuote[] {
  if (!Array.isArray(value)) return [];
  const out: FlaggedQuote[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const { field, text } = item as { field?: unknown; text?: unknown };
    if ((field !== "title" && field !== "description") || typeof text !== "string") continue;
    const clean = text.trim().slice(0, MAX_QUOTE_CHARS);
    const key = `${field}|${clean.toLowerCase()}`;
    if (clean.length < 2 || seen.has(key)) continue;
    seen.add(key);
    out.push({ field, text: clean });
    if (out.length >= MAX_QUOTES) break;
  }
  return out;
}

/**
 * `rejectionNotes` là JSON do hộp thoại quản trị ghi; các lần từ chối cũ chỉ là văn bản thuần, và chính văn bản đó là lời nhắn.
 *
 * @param raw - Chuỗi ghi chú từ chối.
 * @returns Ghi chú đã giải mã.
 */
export function parseRejectionNotes(raw: string | null | undefined): RejectionNotes {
  const text = typeof raw === "string" ? raw : "";
  if (text.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(text) as { noteText?: unknown; flaggedFields?: unknown; flaggedQuotes?: unknown };
      return {
        noteText: typeof parsed.noteText === "string" ? parsed.noteText : "",
        flaggedFields: Array.isArray(parsed.flaggedFields) ? parsed.flaggedFields.filter((id): id is string => typeof id === "string" && FLAG_IDS.has(id)) : [],
        flaggedQuotes: cleanQuotes(parsed.flaggedQuotes),
      };
    } catch {
      // hóa ra không phải JSON: giữ nguyên làm lời nhắn
    }
  }
  return { noteText: text, flaggedFields: [], flaggedQuotes: [] };
}

/**
 * Đóng gói ghi chú từ chối thành chuỗi JSON để lưu; chỉ thêm `flaggedQuotes` khi có trích dẫn.
 *
 * @param flaggedFields - Mã các mục bị đánh dấu.
 * @param noteText - Lời nhắn của quản trị viên.
 * @param flaggedQuotes - Các đoạn trích dẫn.
 */
export function buildRejectionNotes(flaggedFields: string[], noteText: string, flaggedQuotes: FlaggedQuote[]): string {
  const body: { flaggedFields: string[]; noteText: string; flaggedQuotes?: FlaggedQuote[] } = { flaggedFields, noteText };
  if (flaggedQuotes.length > 0) body.flaggedQuotes = flaggedQuotes;
  return JSON.stringify(body);
}

/**
 * Các đoạn trích dẫn quản trị viên có thể gửi kèm: do quy tắc hoặc mô hình phát hiện (trọng số lớn hơn 0), nằm trong tiêu đề hoặc mô tả.
 *
 * @param items - Danh sách lý do rủi ro.
 * @returns Tối đa 10 đoạn không trùng.
 */
export function quotesFromRisk(items: RiskReasonItem[] | undefined): FlaggedQuote[] {
  const out: FlaggedQuote[] = [];
  const seen = new Set<string>();
  for (const item of items ?? []) {
    if (item.status === "not_assessed" || !(item.weight > 0) || (item.layer !== "RULE" && item.layer !== "AI")) continue;
    for (const piece of item.evidence ?? []) {
      if ((piece.field !== "title" && piece.field !== "description") || typeof piece.text !== "string") continue;
      const text = piece.text.trim().slice(0, MAX_QUOTE_CHARS);
      const key = `${piece.field}|${text.toLowerCase()}`;
      if (text.length < 2 || seen.has(key)) continue;
      seen.add(key);
      out.push({ field: piece.field, text });
      if (out.length >= MAX_QUOTES) return out;
    }
  }
  return out;
}

/** Các mục nên chọn sẵn: mục tiêu đề/mô tả nếu có đoạn trích dẫn nào; `null` khi dữ liệu rủi ro không gợi ý gì. */
export function fieldsFromQuotes(quotes: FlaggedQuote[]): string[] | null {
  return quotes.length > 0 ? ["title"] : null;
}

const ENTITIES: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };

/** Văn bản thuần của giá trị trình soạn thảo (HTML hoặc văn bản): bỏ thẻ, giải mã một vài ký tự đặc biệt, gộp khoảng trắng. */
export function plainTextOf(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * `still`: đoạn trích dẫn vẫn còn trong nội dung nhà tổ chức đang sửa; `fixed`: đã bị xóa. Không phân biệt hoa thường.
 *
 * @param quote - Đoạn trích dẫn.
 * @param current - Tiêu đề và mô tả hiện tại.
 */
export function quoteStatus(quote: FlaggedQuote, current: { title: string; description: string }): "still" | "fixed" {
  const haystack = plainTextOf(quote.field === "title" ? current.title : current.description).toLowerCase();
  const needle = plainTextOf(quote.text).toLowerCase();
  return needle.length > 0 && haystack.includes(needle) ? "still" : "fixed";
}
