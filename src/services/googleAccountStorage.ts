/** Thông tin tài khoản Google đã đăng nhập gần nhất, dùng để gợi ý đăng nhập nhanh. */
export interface GoogleAccountSuggestion {
  name: string;
  email: string;
  picture?: string;
  avatarUrl?: string;
  provider?: "google";
}

export const LAST_GOOGLE_ACCOUNT_KEY = "haloticket_last_google_account";

/** Làm sạch tên hiển thị: bỏ hậu tố do nền tảng thêm vào như " HaloTicket"; nếu tên rỗng thì dùng phần trước `@` của email. */
export function cleanDisplayName(rawName?: string, email?: string): string {
  if (!rawName) return email ? email.split("@")[0] : "";
  let name = rawName.trim();
  name = name.replace(/\s+HaloTicket$/i, "").trim();
  if (!name && email) {
    name = email.split("@")[0];
  }
  return name;
}

let cachedSnapshot: GoogleAccountSuggestion | null = null;
let lastGoogleRaw: string | null = null;
let initialized = false;

/** Lấy ảnh đại diện hợp lệ của tài khoản: chấp nhận khi tài khoản là Google hoặc ảnh nằm trên miền `googleusercontent.com`, ngược lại trả về `undefined`. */
function getStoredGooglePicture(account: GoogleAccountSuggestion): string | undefined {
  const picture = account.picture || account.avatarUrl;
  if (!picture) return undefined;
  if (account.provider === "google") return picture;

  try {
    const hostname = new URL(picture).hostname.toLowerCase();
    return hostname === "googleusercontent.com" || hostname.endsWith(".googleusercontent.com")
      ? picture
      : undefined;
  } catch {
    return undefined;
  }
}

/** Đọc tài khoản Google đã lưu trong `localStorage`, có lưu đệm theo chuỗi thô để không phân tích lại khi dữ liệu không đổi; JSON hỏng thì trả về `null`. */
function computeSnapshot(): GoogleAccountSuggestion | null {
  if (typeof window === "undefined") return null;

  try {
    const googleRaw = localStorage.getItem(LAST_GOOGLE_ACCOUNT_KEY);

    if (initialized && googleRaw === lastGoogleRaw) {
      return cachedSnapshot;
    }

    initialized = true;
    lastGoogleRaw = googleRaw;

    if (googleRaw) {
      try {
        const parsed = JSON.parse(googleRaw) as GoogleAccountSuggestion;
        if (parsed && typeof parsed.email === "string") {
          const picture = getStoredGooglePicture(parsed);
          cachedSnapshot = {
            ...parsed,
            name: cleanDisplayName(parsed.name, parsed.email),
            picture,
            avatarUrl: picture,
          };
          return cachedSnapshot;
        }
      } catch {
        // invalid JSON
      }
    }

    cachedSnapshot = null;
    return null;
  } catch {
    return cachedSnapshot;
  }
}

/** Lấy tài khoản Google đã lưu gần nhất, hoặc `null` nếu chưa có. */
export function getSavedGoogleAccount(): GoogleAccountSuggestion | null {
  return computeSnapshot();
}

/** Lưu tài khoản Google đăng nhập gần nhất (đã làm sạch tên) vào `localStorage` và phát sự kiện `google-account-updated`; lỗi lưu trữ bị bỏ qua. */
export function saveLastGoogleAccount(account: GoogleAccountSuggestion): void {
  try {
    const cleaned: GoogleAccountSuggestion = {
      ...account,
      name: cleanDisplayName(account.name, account.email),
      picture: account.picture || account.avatarUrl,
      avatarUrl: account.picture || account.avatarUrl,
      provider: "google",
    };
    const serialized = JSON.stringify(cleaned);
    lastGoogleRaw = serialized;
    cachedSnapshot = cleaned;
    localStorage.setItem(LAST_GOOGLE_ACCOUNT_KEY, serialized);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("google-account-updated", { detail: cleaned }));
    }
  } catch {
    // ignore
  }
}

/** Đăng ký lắng nghe thay đổi tài khoản Google (sự kiện cập nhật, `storage`, `auth-changed`); trả về hàm hủy đăng ký. */
export function subscribeGoogleAccount(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
    /** Gọi lại `callback` mỗi khi có sự kiện thay đổi. */
  const handler = () => {
    callback();
  };
  window.addEventListener("google-account-updated", handler);
  window.addEventListener("storage", handler);
  window.addEventListener("auth-changed", handler);

  return () => {
    window.removeEventListener("google-account-updated", handler);
    window.removeEventListener("storage", handler);
    window.removeEventListener("auth-changed", handler);
  };
}

