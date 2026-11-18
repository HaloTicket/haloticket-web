import { useEffect } from "react";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router-dom";
import { store } from "@/store";
import { router } from "@/routes";
import { ThemeProvider } from "@/context/ThemeContext";
import SessionExpiredModalHost from "@/features/auth/components/SessionExpiredModalHost";
import { AppToaster } from "@/components/common/AppToaster";
import { PATHS } from "@/routes/paths";
import { getKeycloakSession } from "@/services/keycloakSession";

/** Đăng xuất khỏi Keycloak rồi chuyển về trang đăng nhập; dùng khi phiên hết hạn và người dùng muốn đăng nhập lại. */
async function handleLoginAgain() {
  const loginUrl = `${window.location.origin}${PATHS.LOGIN}`;
  try {
    await getKeycloakSession().logout(loginUrl);
  } catch {
    // vẫn chuyển trang nội bộ được nếu Keycloak không kết thúc được phiên từ xa.
  } finally {
    await router.navigate(PATHS.LOGIN, { replace: true });
  }
}

/** Đăng xuất khỏi Keycloak rồi đưa người dùng về trang chủ. */
async function handleLogout() {
  const homeUrl = `${window.location.origin}/`;
  try {
    await getKeycloakSession().logout(homeUrl);
  } catch {
    // ignore
  } finally {
    await router.navigate("/", { replace: true });
  }
}

/** Thành phần gốc: bọc Redux, giao diện sáng/tối, router, toaster và hộp thoại phiên hết hạn. */
function App() {
  // chủ động kiểm tra token hết hạn ở nền
  useEffect(() => {
    /** Phát sự kiện `session-expired` khi đã đăng nhập nhưng không còn token lẫn refresh token. */
    const checkExpiry = () => {
      // không kiểm tra ở các trang đăng nhập công khai
      const path = window.location.pathname;
      if (path.startsWith("/login") || path.startsWith("/auth/")) return;

      const session = getKeycloakSession();
      if (session.isAuthenticated()) {
        const token = session.getCurrentToken();
        const refreshToken = session.getCurrentRefreshToken();
        if (!token && !refreshToken) {
          window.dispatchEvent(new CustomEvent("session-expired"));
        }
      }
    };
    const timer = setInterval(checkExpiry, 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Provider store={store}>
      <ThemeProvider>
        <RouterProvider router={router} />
        <AppToaster />
        <SessionExpiredModalHost
          onLoginAgain={handleLoginAgain}
          onLogout={handleLogout}
        />
      </ThemeProvider>
    </Provider>
  );
}

export default App;

