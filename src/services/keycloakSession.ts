import Keycloak, {
  type KeycloakConfig,
  type KeycloakInitOptions,
  type KeycloakInstance,
} from "keycloak-js";
import { clearMemberInvitationToken } from "./memberInvitationToken";

/** Phần tối thiểu của đối tượng Keycloak mà phiên cần, giúp thay bằng đối tượng giả khi kiểm thử. */
export type KeycloakLike = Pick<
  KeycloakInstance,
  "init" | "login" | "createLoginUrl" | "updateToken"
> & {
  authenticated?: boolean;
  token?: string;
  idToken?: string;
  refreshToken?: string;
  logout?: KeycloakInstance["logout"];
};

/** Giao diện kho lưu trữ khóa-giá trị tối thiểu (tương thích `localStorage`). */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem?(key: string, value: string): void;
  removeItem?(key: string): void;
}

/** Cửa sổ popup đăng nhập Google, chỉ cần biết đóng. */
interface PopupLike {
  close(): void;
}

/** Sự kiện `message` do trang callback gửi về, mang kết quả đăng nhập Google (token hoặc bị hủy). */
interface GoogleAuthMessageEvent {
  origin: string;
  source: unknown;
  data?: {
    type?: string;
    status?: "success" | "cancelled";
    token?: string;
    idToken?: string;
    refreshToken?: string;
  };
}

/** Phần của đối tượng `window` mà phiên dùng: mở popup và đăng ký, hủy đăng ký sự kiện. */
interface BrowserWindowLike {
  open(url: string, target?: string, features?: string): PopupLike | null;
  addEventListener(
    type: string,
    listener: (event?: GoogleAuthMessageEvent) => void,
  ): void;
  removeEventListener(
    type: string,
    listener: (event?: GoogleAuthMessageEvent) => void,
  ): void;
}

/** Thông tin kích thước màn hình dùng để căn popup đăng nhập ra giữa. */
interface ScreenLike {
  availWidth: number;
  availHeight: number;
  availLeft?: number;
  availTop?: number;
}

/** Tùy chọn tạo phiên Keycloak; mọi trường đều có thể thay thế để kiểm thử (đối tượng Keycloak, kho lưu trữ, cửa sổ, hàm làm mới token, thời gian chờ làm mới). */
export interface KeycloakSessionOptions {
  keycloak?: KeycloakLike;
  config?: KeycloakConfig;
  keycloakFactory?: (config: KeycloakConfig) => KeycloakLike;
  storage?: StorageLike;
  window?: BrowserWindowLike;
  screen?: ScreenLike;
  keycloakOrigin?: string;
  location?: Pick<Location, "origin">;
  silentCheckSsoRedirectUri?: string;
  tokenRefreshLeewaySeconds?: number;
  refreshRequest?: (
    refreshToken: string,
    clientId: string,
  ) => Promise<RefreshedTokens>;
}

/** Bộ token mới nhận được sau khi làm mới phiên. */
export interface RefreshedTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
}

/** Giao diện phiên đăng nhập: khởi tạo, đăng nhập Google, lấy và làm mới token, kiểm tra trạng thái xác thực và đăng xuất. */
export interface KeycloakSession {
  init(options?: Partial<KeycloakInitOptions>): Promise<boolean>;
  loginWithGoogle(): Promise<void>;
  getAccessToken(): Promise<string | null>;
  forceRefreshAccessToken(): Promise<string | null>;
  getCurrentToken(): string | null;
  getCurrentIdToken(): string | null;
  getCurrentRefreshToken(): string | null;
  isAuthenticated(): boolean;
  logout(redirectUri?: string): Promise<void>;
  hasKeycloakSession(): boolean;
}

const legacyTokenKey = "access_token";

/** Trả về `localStorage` của trình duyệt, hoặc `undefined` khi không có `window`. */
function browserStorage(): StorageLike | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

/** Trả về `window.location`, hoặc một vị trí giả `http://localhost` khi không có `window`. */
function browserLocation(): Pick<Location, "origin"> {
  return typeof window === "undefined"
    ? { origin: "http://localhost" }
    : window.location;
}

/** Kiểm tra token JWT đã hết hạn chưa (chừa 5 giây dự phòng). Token sai định dạng hoặc không đọc được thì coi là chưa hết hạn; token rỗng thì coi là hết hạn. */
export function isTokenExpired(token: string): boolean {
  if (!token || typeof token !== "string") return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return false;
    }
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = JSON.parse(atob(base64));
    if (jsonPayload && typeof jsonPayload.exp === "number") {
      return Date.now() >= jsonPayload.exp * 1000 - 5000;
    }
  } catch {
    return false;
  }
  return false;
}

/** Số giây còn lại tới khi token hết hạn, hoặc `null` nếu không đọc được `exp`. */
function secondsUntilExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    return typeof payload.exp === "number"
      ? payload.exp - Date.now() / 1000
      : null;
  } catch {
    return null;
  }
}

/** Lấy client id (`azp`) từ token, mặc định `user-service` nếu không đọc được. */
function tokenClientId(token: string): string {
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    return typeof payload.azp === "string" ? payload.azp : "user-service";
  } catch {
    return "user-service";
  }
}

/** Tạo phiên đăng nhập kết hợp Keycloak (SSO) và token lưu trong `localStorage` do API mật khẩu cấp; mọi phụ thuộc có thể thay thế khi kiểm thử. */
export function createKeycloakSession(
  options: KeycloakSessionOptions = {},
): KeycloakSession {
  const location = options.location ?? browserLocation();
  const keycloak =
    options.keycloak ??
    (options.keycloakFactory ?? ((config) => new Keycloak(config)))(
      options.config ?? {
        url: import.meta.env.VITE_KEYCLOAK_URL ?? "http://localhost:9080",
        realm: import.meta.env.VITE_KEYCLOAK_REALM ?? "haloticket-realm",
        clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "haloticket-web",
      },
    );
  const storage = options.storage ?? browserStorage();
  const refreshLeeway = options.tokenRefreshLeewaySeconds ?? 30;
  const browserWindow =
    options.window ??
    (typeof window === "undefined"
      ? undefined
      : (window as unknown as BrowserWindowLike));
  const keycloakOrigin =
    options.keycloakOrigin ??
    new URL(
      options.config?.url ??
        import.meta.env.VITE_KEYCLOAK_URL ??
        "http://localhost:9080",
    ).origin;
  let refreshPromise: Promise<string | null> | undefined;
  const requestRefresh =
    options.refreshRequest ??
    (async (refreshToken: string, clientId: string) => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8888/api"}/auth/refresh`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken, clientId }),
        },
      );
      if (!response.ok) throw new Error("Session refresh failed");
      return response.json() as Promise<RefreshedTokens>;
    });
    /** Làm mới token từ `refresh_token` đã lưu qua API của hệ thống, dùng chung một lời gọi đang chạy; lỗi thì trả về `null`. */
  const refreshStoredToken = async (): Promise<string | null> => {
    const refreshToken = storage?.getItem("refresh_token");
    const accessToken = storage?.getItem(legacyTokenKey);
    if (!refreshToken || !accessToken) return null;
    refreshPromise ??= requestRefresh(refreshToken, tokenClientId(accessToken))
      .then((tokens) => {
        storage?.setItem?.(legacyTokenKey, tokens.accessToken);
        storage?.setItem?.(
          "refresh_token",
          tokens.refreshToken || refreshToken,
        );
        if (tokens.idToken) storage?.setItem?.("id_token", tokens.idToken);
        return tokens.accessToken;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = undefined;
      });
    return refreshPromise;
  };

  return {
        /** Khởi tạo Keycloak (check-sso, PKCE); nếu chưa có phiên thì thử làm mới từ token đã lưu. Trả về `true` khi đã xác thực. */
    init: async (initOverrides) => {
      const initOptions: KeycloakInitOptions = initOverrides ?? {
        checkLoginIframe: false,
        onLoad: "check-sso",
        pkceMethod: "S256",
        silentCheckSsoRedirectUri:
          options.silentCheckSsoRedirectUri ??
          `${location.origin}/silent-check-sso.html`,
      };
      const authenticated = await keycloak.init(initOptions);
      if (authenticated) return true;
      return Boolean(await refreshStoredToken());
    },

        /** Đăng nhập Google qua popup Keycloak và chờ kết quả (từ `postMessage` hoặc `BroadcastChannel`); lưu token và tài khoản Google gần nhất. Ném lỗi nếu popup bị chặn hoặc người dùng hủy. Không có `window` thì chuyển hướng cả trang. */
    loginWithGoogle: async () => {
      const googleLoginOptions = {
        idpHint: "google",
        prompt: "login",
        redirectUri: `${location.origin}/auth/popup-callback`,
      } as const;

      if (!browserWindow) {
        await keycloak.login({
          ...googleLoginOptions,
          redirectUri: `${location.origin}/`,
        } as unknown as Parameters<KeycloakLike["login"]>[0]);
        return;
      }

      const authUrl = keycloak.createLoginUrl(
        googleLoginOptions as unknown as Parameters<
          KeycloakLike["createLoginUrl"]
        >[0],
      );
      const screenInfo: ScreenLike =
        options.screen ??
        (typeof screen === "undefined"
          ? { availWidth: 1280, availHeight: 800, availLeft: 0, availTop: 0 }
          : {
              availWidth: screen.availWidth,
              availHeight: screen.availHeight,
              availLeft: 0,
              availTop: 0,
            });
      const popupWidth = 520;
      const popupHeight = 700;
      const popupLeft = Math.max(
        screenInfo.availLeft ?? 0,
        (screenInfo.availWidth - popupWidth) / 2 + (screenInfo.availLeft ?? 0),
      );
      const popupTop = Math.max(
        screenInfo.availTop ?? 0,
        (screenInfo.availHeight - popupHeight) / 2 + (screenInfo.availTop ?? 0),
      );
      const popup = browserWindow.open(
        authUrl,
        "haloticket-google-auth",
        `popup,width=${popupWidth},height=${popupHeight},left=${Math.round(popupLeft)},top=${Math.round(popupTop)},resizable=yes,scrollbars=yes`,
      );
      if (!popup) throw new Error("Google login popup was blocked");

      await new Promise<void>((resolve, reject) => {
        let settled = false;
        let broadcastChannel: BroadcastChannel | undefined;
        let focusResetTimer: ReturnType<typeof setTimeout> | undefined;

                /** Gỡ các trình lắng nghe, bộ đếm và kênh phát. */
        const cleanup = () => {
          browserWindow.removeEventListener("message", handleMessage);
          browserWindow.removeEventListener("focus", handleFocus);
          if (focusResetTimer !== undefined) clearTimeout(focusResetTimer);
          try {
            broadcastChannel?.close();
          } catch {
                        // BroadcastChannel có thể đã đóng.
          }
        };
                /** Kết thúc lời hứa đúng một lần: dọn dẹp rồi chạy `callback`. */
        const settle = (callback: () => void) => {
          if (settled) return;
          settled = true;
          cleanup();
          callback();
        };
                /** Xử lý kết quả đăng nhập Google: thành công thì lưu token và thông tin tài khoản, còn lại thì từ chối vì bị hủy. */
        const handleAuthResult = (data?: GoogleAuthMessageEvent["data"]) => {
          if (data?.type !== "haloticket-google-auth") return;
          if (data.status === "success" && data.token) {
            storage?.setItem?.(legacyTokenKey, data.token);
            if (data.idToken) storage?.setItem?.("id_token", data.idToken);
            if (data.refreshToken)
              storage?.setItem?.("refresh_token", data.refreshToken);
            try {
              const raw = data.idToken || data.token;
              const base64Url = raw.split(".")[1];
              if (base64Url) {
                const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
                const jsonPayload = decodeURIComponent(
                  atob(base64)
                    .split("")
                    .map(
                      (c) =>
                        "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2),
                    )
                    .join(""),
                );
                const payload = JSON.parse(jsonPayload);
                if (payload?.email && typeof payload.email === "string") {
                  let rawName =
                    (typeof payload.name === "string" && payload.name) ||
                    (typeof payload.given_name === "string" &&
                      payload.given_name) ||
                    (typeof payload.preferred_username === "string" &&
                      payload.preferred_username) ||
                    payload.email.split("@")[0];
                  if (typeof rawName === "string") {
                    rawName = rawName.replace(/\s+HaloTicket$/i, "").trim();
                  }
                  const picture =
                    typeof payload.picture === "string"
                      ? payload.picture
                      : undefined;
                  const accountToSave = {
                    name: rawName || payload.email.split("@")[0],
                    email: payload.email,
                    picture,
                    avatarUrl: picture,
                    provider: "google",
                  };
                  storage?.setItem?.(
                    "haloticket_last_google_account",
                    JSON.stringify(accountToSave),
                  );
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(
                      new CustomEvent("google-account-updated", {
                        detail: accountToSave,
                      }),
                    );
                  }
                }
              }
            } catch {
              // ignore
            }
            settle(resolve);
            return;
          }
          settle(() => reject(new Error("Google login was cancelled")));
        };
                /** Nhận `message` từ popup, chỉ chấp nhận từ origin của ứng dụng hoặc Keycloak và từ đúng popup đã mở. */
        const handleMessage = (event?: GoogleAuthMessageEvent) => {
          if (
            !event ||
            ![location.origin, keycloakOrigin].includes(event.origin)
          )
            return;
          if (event.source && event.source !== popup) return;
          handleAuthResult(event.data);
        };
                /** Khi cửa sổ chính lấy lại tiêu điểm, đợi 300ms rồi coi như người dùng đã hủy nếu chưa có kết quả. */
        const handleFocus = () => {
          focusResetTimer = setTimeout(() => {
            settle(() => reject(new Error("Google login was cancelled")));
          }, 300);
        };

        browserWindow.addEventListener("message", handleMessage);
        browserWindow.addEventListener("focus", handleFocus);
        try {
          if (typeof BroadcastChannel !== "undefined") {
            broadcastChannel = new BroadcastChannel("haloticket-google-auth");
            broadcastChannel.onmessage = (event) =>
              handleAuthResult(event.data);
          }
        } catch {
                    // BroadcastChannel không có ở mọi chế độ trình duyệt.
        }
      });
    },

        /** Ép làm mới token ngay (kể cả chưa hết hạn); không được thì xóa token đã lưu. Trả về token mới hoặc `null`. */
    forceRefreshAccessToken: async () => {
      if (keycloak.authenticated && keycloak.token) {
        try {
          await keycloak.updateToken(-1);
          if (keycloak.token && !isTokenExpired(keycloak.token)) {
            return keycloak.token;
          }
        } catch {
                    // Làm mới token thất bại
        }
      }
      const raw = storage?.getItem(legacyTokenKey);
      if (raw) {
        const refreshed = await refreshStoredToken();
        if (refreshed) return refreshed;
        storage?.removeItem?.(legacyTokenKey);
        storage?.removeItem?.("id_token");
        storage?.removeItem?.("refresh_token");
      }
      return null;
    },

        /** Lấy access token còn hiệu lực, tự làm mới khi sắp hết hạn trong khoảng dự phòng; token hết hạn bị xóa khỏi kho lưu. */
    getAccessToken: async () => {
      if (keycloak.authenticated && keycloak.token) {
        try {
          await keycloak.updateToken(refreshLeeway);
          if (keycloak.token && !isTokenExpired(keycloak.token)) {
            return keycloak.token;
          }
        } catch {
                    // Làm mới token thất bại
        }
      }
      const raw = storage?.getItem(legacyTokenKey);
      if (raw) {
        const secondsLeft = secondsUntilExpiry(raw);
        if (secondsLeft !== null && secondsLeft <= refreshLeeway) {
          const refreshed = await refreshStoredToken();
          if (refreshed) return refreshed;
        }
        if (!isTokenExpired(raw)) {
          return raw;
        } else {
          storage?.removeItem?.(legacyTokenKey);
          storage?.removeItem?.("id_token");
          storage?.removeItem?.("refresh_token");
        }
      }
      return null;
    },

        /** Lấy token hiện tại còn hạn mà không làm mới, hoặc `null`. */
    getCurrentToken: () => {
      if (keycloak.token && !isTokenExpired(keycloak.token))
        return keycloak.token;
      const legacy = storage?.getItem(legacyTokenKey);
      if (legacy && !isTokenExpired(legacy)) return legacy;
      return null;
    },

        /** Lấy ID token hiện tại. */
    getCurrentIdToken: () =>
      keycloak.idToken ?? storage?.getItem("id_token") ?? null,

        /** Lấy refresh token hiện tại. */
    getCurrentRefreshToken: () =>
      keycloak.refreshToken ?? storage?.getItem("refresh_token") ?? null,

        /** Có phiên hợp lệ khi token còn hạn hoặc còn refresh token. */
    isAuthenticated: () => {
      if (
        keycloak.authenticated &&
        keycloak.token &&
        !isTokenExpired(keycloak.token)
      )
        return true;
      const legacy = storage?.getItem(legacyTokenKey);
      return Boolean(
        (legacy && !isTokenExpired(legacy)) ||
        storage?.getItem("refresh_token"),
      );
    },

        /** Xóa token đã lưu và kết thúc phiên Keycloak, rồi chuyển hướng tới `redirectUri`. */
    logout: async (redirectUri = `${location.origin}/`) => {
      clearMemberInvitationToken();
      const idToken = keycloak.idToken ?? storage?.getItem("id_token");
      for (const key of [
        "access_token",
        "refresh_token",
        "id_token",
        "haloticket_user_profile",
      ]) {
        storage?.removeItem?.(key);
      }
            // Kết thúc phiên SSO của trình duyệt kể cả khi token hiện tại của ứng dụng đến từ
            // API mật khẩu và đối tượng Keycloak này không có token trong bộ nhớ.
            // Nếu không, Keycloak giữ người dùng cũ và từ chối tài khoản Google khác
            // với lỗi `different_user_authenticated`.
      if (keycloak.logout) {
        if (idToken) keycloak.idToken = idToken;
        await keycloak.logout({ redirectUri });
      }
    },

        /** Cho biết Keycloak đang có phiên xác thực với token trong bộ nhớ. */
    hasKeycloakSession: () => Boolean(keycloak.authenticated && keycloak.token),
  };
}

let browserSession: KeycloakSession | undefined;

/** Lấy phiên đăng nhập dùng chung của trình duyệt, tạo lần đầu khi cần. */
export function getKeycloakSession(): KeycloakSession {
  browserSession ??= createKeycloakSession();
  return browserSession;
}
