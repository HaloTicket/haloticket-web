import { useTranslation } from "react-i18next";
import { t as translate } from "@/i18n";
import { useEffect } from "react";
import { getKeycloakSession } from "@/services/keycloakSession";

const messageType = "haloticket-google-auth";

/** Trang callback của cửa sổ popup đăng nhập Google: hoàn tất phiên Keycloak rồi báo kết quả về cửa sổ mở nó và tự đóng. */
export default function GoogleAuthPopupCallback() {
  useTranslation();
  useEffect(() => {
    /** Đọc kết quả đăng nhập, dựng thông điệp thành công hoặc hủy, gửi qua opener, BroadcastChannel và localStorage rồi đóng popup. */
    async function completeAuthentication() {
      const params = new URLSearchParams(window.location.search);
      const error = params.get("error");
      const session = getKeycloakSession();

      // Popup nhận mã ủy quyền chứ không phải access token. Để
      // keycloak-js xử lý mã đó trước khi báo cho cửa sổ mở popup.
      if (!error) {
        try {
          await session.init({ checkLoginIframe: false, pkceMethod: "S256" });
        } catch {
          // Callback không hợp lệ hoặc hết hạn được xem như popup bị hủy.
        }
      }

      const token =
        session.getCurrentToken() ||
        localStorage.getItem("access_token") ||
        undefined;
      const idToken = session.getCurrentIdToken() || undefined;
      const refreshToken = session.getCurrentRefreshToken() || undefined;
      const message = !error && token
        ? {
            type: messageType,
            status: "success" as const,
            token,
            ...(idToken ? { idToken } : {}),
            ...(refreshToken ? { refreshToken } : {}),
          }
        : { type: messageType, status: "cancelled" as const };

      // 1. Gửi qua window.opener nếu có
      const opener = window.opener;
      if (opener) {
        try {
          opener.postMessage(message, window.location.origin);
        } catch {
          // Cửa sổ mở popup bị trình duyệt chặn
        }
      }

      // 2. Phát qua BroadcastChannel (hoạt động ổn định xuyên ranh giới COOP trong cùng origin)
      try {
        if (typeof BroadcastChannel !== "undefined") {
          const channel = new BroadcastChannel(messageType);
          channel.postMessage(message);
          channel.close();
        }
      } catch {
        // BroadcastChannel không khả dụng
      }

      // 3. Dự phòng qua localStorage
      try {
        if (token) {
          localStorage.setItem("access_token", token);
          if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
          const raw = idToken || token;
          const base64Url = raw.split(".")[1];
          if (base64Url) {
            const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
            const jsonPayload = decodeURIComponent(
              atob(base64)
                .split("")
                .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join(""),
            );
            const payload = JSON.parse(jsonPayload);
            if (payload?.email) {
              const name =
                payload.name ||
                payload.given_name ||
                payload.preferred_username ||
                payload.email.split("@")[0];
              localStorage.setItem(
                "haloticket_last_google_account",
                JSON.stringify({
                  name,
                  email: payload.email,
                  picture: payload.picture,
                  provider: "google",
                }),
              );
            }
          }
        }
        localStorage.setItem(
          "haloticket_auth_event",
          JSON.stringify({ ...message, time: Date.now() }),
        );
      } catch {
        // Không dùng được localStorage
      }

      // Trang callback cùng origin và được mở bằng window.open nên
      // có thể tự đóng mà không cần cửa sổ mở động vào WindowProxy bị cô lập COOP.
      try {
        window.close();
      } catch {
        // Một số trình duyệt vẫn từ chối đóng tab do người dùng mở thủ công.
      }
    }

    void completeAuthentication();

  }, []);

  return <p>{translate("Đang hoàn tất xác thực Google…")}</p>;
}
