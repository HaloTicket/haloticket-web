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

async function handleLoginAgain() {
  const loginUrl = `${window.location.origin}${PATHS.LOGIN}`;
  try {
    await getKeycloakSession().logout(loginUrl);
  } catch {
    // local routing remains available if Keycloak cannot end its remote session.
  } finally {
    await router.navigate(PATHS.LOGIN, { replace: true });
  }
}

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

function App() {
  // proactively check token expiry in the background
  useEffect(() => {
    const checkExpiry = () => {
      // don't check on public auth pages
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

