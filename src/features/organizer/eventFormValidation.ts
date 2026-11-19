import type { ShowtimeItem, Step2Errors, TicketItem } from "@/types/organizer";

/** Hàm dịch dùng để dựng thông báo (khóa là câu tiếng Việt). */
type Translate = (key: string, options?: Record<string, unknown>) => string;

/** Lỗi của bước 2 kèm lỗi chung về thời gian bán vé của các suất diễn. */
export type TimeAndTicketErrors = Step2Errors & { sales?: string };

/** Dữ liệu cần kiểm tra ở bước thời gian và vé. */
export interface TimeAndTicketInput {
  startDate: string;
  endDate: string;
  showtimes: ShowtimeItem[];
  tickets: TicketItem[];
  /** Thời điểm hiện tại, để kiểm thử. */
  now?: Date;
  /** Bắt buộc giờ bắt đầu ở tương lai: đúng khi tạo mới, sai khi sửa sự kiện đã duyệt (có thể đang diễn ra). */
  requireFutureStart?: boolean;
}

/** Đổi chuỗi ngày giờ của ô nhập (có thể thiếu giây) thành `Date`; rỗng hoặc sai định dạng trả `null`. */
function parse(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Kiểm tra một hạng vé: giá không âm (đồng, số nguyên), số lượng phát hành là số nguyên từ 1, mua tối thiểu từ 1,
 * tối đa không nhỏ hơn tối thiểu và không vượt số lượng phát hành.
 *
 * @param ticket - Hạng vé cần kiểm tra.
 * @param t - Hàm dịch.
 * @returns Thông báo lỗi đầu tiên, hoặc `null` nếu hợp lệ.
 */
export function validateTicketFields(
  ticket: Pick<TicketItem, "name" | "price" | "isFree" | "totalQuantity" | "minPerOrder" | "maxPerOrder">,
  t: Translate
): string | null {
  if (!ticket.name.trim()) return t("Vui lòng nhập tên loại vé!");
  const price = Number(ticket.price);
  if (!ticket.isFree) {
    if (!Number.isFinite(price) || price < 0) return t("Giá vé không được âm!");
    if (!Number.isInteger(price)) return t("Giá vé phải là số nguyên (đồng)!");
  }
  const quantity = Number(ticket.totalQuantity);
  if (!Number.isInteger(quantity) || quantity < 1) return t("Số lượng vé phát hành phải là số nguyên từ 1 trở lên!");
  const min = Number(ticket.minPerOrder);
  const max = Number(ticket.maxPerOrder);
  if (!Number.isInteger(min) || min < 1) return t("Số vé tối thiểu/đơn phải từ 1 trở lên!");
  if (!Number.isInteger(max) || max < min) return t("Số vé tối đa/đơn không được nhỏ hơn số vé tối thiểu/đơn!");
  if (max > quantity) return t("Số vé tối đa/đơn không được vượt quá số lượng vé phát hành!");
  return null;
}

/**
 * Kiểm tra bước thời gian và vé của form sự kiện: giờ bắt đầu và kết thúc, ít nhất một hạng vé hợp lệ, và với từng suất diễn
 * thì thời gian mở và đóng bán phải có, mở trước đóng, và đóng bán không muộn hơn giờ kết thúc của suất.
 *
 * @param input - Dữ liệu cần kiểm tra.
 * @param t - Hàm dịch.
 * @returns Các lỗi theo từng trường; đối tượng rỗng nghĩa là hợp lệ.
 */
export function validateTimeAndTickets(input: TimeAndTicketInput, t: Translate): TimeAndTicketErrors {
  const errors: TimeAndTicketErrors = {};
  const now = input.now ?? new Date();
  const start = parse(input.startDate);
  const end = parse(input.endDate);

  if (!input.startDate) errors.startDate = t("Vui lòng chọn thời gian bắt đầu sự kiện!");
  else if (!start) errors.startDate = t("Thời gian bắt đầu không hợp lệ!");
  else if (input.requireFutureStart && start <= now) errors.startDate = t("Thời gian bắt đầu phải ở tương lai!");

  if (!input.endDate) errors.endDate = t("Vui lòng chọn thời gian kết thúc sự kiện!");
  else if (!end) errors.endDate = t("Thời gian kết thúc không hợp lệ!");
  else if (start && start >= end) errors.endDate = t("Thời gian kết thúc sự kiện phải diễn ra sau thời gian bắt đầu!");

  if (input.tickets.length === 0) {
    errors.tickets = t("Vui lòng tạo ít nhất một hạng vé!");
  } else {
    for (const ticket of input.tickets) {
      const problem = validateTicketFields(ticket, t);
      if (problem) {
        errors.tickets = `${ticket.name || t("Loại vé")}: ${problem}`;
        break;
      }
    }
  }

  for (const showtime of input.showtimes) {
    const label = showtime.name || t("Suất diễn");
    const saleStart = parse(showtime.saleStartTime);
    const saleEnd = parse(showtime.saleEndTime);
    if (!showtime.saleStartTime || !showtime.saleEndTime) {
      errors.sales = t("{{name}}: vui lòng nhập đủ thời gian mở bán và đóng bán vé.", { name: label });
      break;
    }
    if (!saleStart || !saleEnd) {
      errors.sales = t("{{name}}: thời gian bán vé không hợp lệ.", { name: label });
      break;
    }
    if (saleStart >= saleEnd) {
      errors.sales = t("{{name}}: thời gian mở bán phải trước thời gian đóng bán.", { name: label });
      break;
    }
    const showEnd = parse(showtime.endTime);
    if (showEnd && saleEnd > showEnd) {
      errors.sales = t("{{name}}: thời gian đóng bán không được muộn hơn giờ kết thúc của suất diễn.", { name: label });
      break;
    }
  }
  return errors;
}

/** Có lỗi nào trong kết quả kiểm tra không. */
export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}
