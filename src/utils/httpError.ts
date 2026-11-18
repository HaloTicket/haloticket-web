/**
 * Kiểm tra server có trả về HTTP 403, nghĩa là người dùng đang đăng nhập không được phép thao tác này với sự kiện.
 *
 * @param err - Lỗi bắt được từ lời gọi API.
 */
export function isForbiddenError(err: unknown): boolean {
  return (err as { response?: { status?: number } } | null)?.response?.status === 403;
}
