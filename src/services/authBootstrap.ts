interface BrowserAuthBootstrapOptions {
  init: () => Promise<boolean>;
  syncCurrentUser: () => Promise<unknown>;
  dispatchEvent?: (event: Event) => unknown;
}

export async function initializeBrowserAuth({
  init,
  syncCurrentUser,
  dispatchEvent,
}: BrowserAuthBootstrapOptions): Promise<boolean> {
  const authenticated = await init();
  if (!authenticated) {
    if (typeof window !== "undefined") {
      const hadSession = Boolean(
        localStorage.getItem("token") || localStorage.getItem("refresh_token")
      );
      const path = window.location.pathname;
      if (hadSession && !path.startsWith("/login") && !path.startsWith("/auth/")) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("session-expired"));
        }, 200);
      }
    }
    return false;
  }

  await syncCurrentUser();
  const notify =
    dispatchEvent ??
    ((event: Event) => {
      if (typeof window !== "undefined") window.dispatchEvent(event);
    });
  notify(new Event("auth-changed"));
  return true;
}
