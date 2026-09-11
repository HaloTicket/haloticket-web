import { useTranslation } from "react-i18next";
import { t as translate } from "@/i18n";
import { useEffect } from "react";
import { getKeycloakSession } from "@/services/keycloakSession";

const messageType = "haloticket-google-auth";

export default function GoogleAuthPopupCallback() {
  useTranslation();
  useEffect(() => {
    async function completeAuthentication() {
      const params = new URLSearchParams(window.location.search);
      const error = params.get("error");
      const session = getKeycloakSession();

      // The popup receives an authorization code, not an access token. Let
      // keycloak-js process that code before notifying the opener.
      if (!error) {
        try {
          await session.init({ checkLoginIframe: false, pkceMethod: "S256" });
        } catch {
          // Treat an invalid/expired callback like a cancelled popup.
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

      // 1. Send via window.opener if available
      const opener = window.opener;
      if (opener) {
        try {
          opener.postMessage(message, window.location.origin);
        } catch {
          // Opener blocked by browser policy
        }
      }

      // 2. Broadcast via BroadcastChannel (works reliably across COOP boundaries on same origin)
      try {
        if (typeof BroadcastChannel !== "undefined") {
          const channel = new BroadcastChannel(messageType);
          channel.postMessage(message);
          channel.close();
        }
      } catch {
        // BroadcastChannel unavailable
      }

      // 3. Fallback via localStorage
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
        // Storage unavailable
      }

      // The callback page is same-origin and was opened by window.open, so it
      // can close itself without the opener touching a COOP-isolated WindowProxy.
      try {
        window.close();
      } catch {
        // Some browsers may still refuse to close a tab opened manually.
      }
    }

    void completeAuthentication();

  }, []);

  return <p>{translate("Đang hoàn tất xác thực Google…")}</p>;
}
