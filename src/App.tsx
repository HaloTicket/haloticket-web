import { Provider } from "react-redux";
import { RouterProvider } from "react-router-dom";
import { store } from "@/store";
import { router } from "@/routes";
import { ThemeProvider } from "@/context/ThemeContext";
import SessionExpiredModalHost from "@/features/auth/components/SessionExpiredModalHost";
import { PATHS } from "@/routes/paths";
import { getKeycloakSession } from "@/services/keycloakSession";

async function handleLoginAgain() {
  const loginUrl = `${window.location.origin}${PATHS.LOGIN}`;
  try {
    await getKeycloakSession().logout(loginUrl);
  } catch {
    // Local routing remains available if Keycloak cannot end its remote session.
  } finally {
    await router.navigate(PATHS.LOGIN, { replace: true });
  }
}

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <RouterProvider router={router} />
        <SessionExpiredModalHost onLoginAgain={handleLoginAgain} />
      </ThemeProvider>
    </Provider>
  );
}

export default App;

