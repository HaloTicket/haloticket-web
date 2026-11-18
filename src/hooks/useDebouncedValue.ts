import { useEffect, useState } from "react";

/** Trả về giá trị chỉ sau khi nó ngừng thay đổi đủ `delayMs` mili giây (ô tìm kiếm gửi một yêu cầu mỗi lần dừng gõ, không gửi mỗi phím). */
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
