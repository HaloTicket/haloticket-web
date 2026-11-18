/**
 * Tên ngắn gọn dễ đọc của trình duyệt và hệ điều hành, gửi kèm lượt check-in để nhật ký quét phân biệt được thiết bị.
 *
 * @param userAgent - Chuỗi user agent; mặc định lấy từ `navigator` (rỗng nếu chạy ngoài trình duyệt).
 * @returns Chuỗi dạng `Web Chrome / Windows`, tối đa 80 ký tự.
 */
export function describeDevice(userAgent: string = typeof navigator === "undefined" ? "" : navigator.userAgent): string {
  const ua = userAgent || "";
  const browser =
    /Edg\//.test(ua) ? "Edge"
      : /OPR\/|Opera/.test(ua) ? "Opera"
        : /Firefox\//.test(ua) ? "Firefox"
          : /Chrome\/|CriOS\//.test(ua) ? "Chrome"
            : /Safari\//.test(ua) ? "Safari"
              : "Trình duyệt";
  const system =
    /Windows/.test(ua) ? "Windows"
      : /Android/.test(ua) ? "Android"
        : /iPhone|iPad|iPod/.test(ua) ? "iOS"
          : /Mac OS X|Macintosh/.test(ua) ? "macOS"
            : /Linux/.test(ua) ? "Linux"
              : "";
  return `Web ${browser}${system ? ` / ${system}` : ""}`.slice(0, 80);
}
