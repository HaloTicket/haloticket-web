interface BrowserAuthBootstrapOptions {
  init: () => Promise<boolean>;
  syncCurrentUser: () => Promise<unknown>;
  dispatchEvent?: (event: Event) => unknown;
  timeoutMs?: number;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
}

export async function initializeBrowserAuth({
  init,
  syncCurrentUser,
  dispatchEvent,
  timeoutMs = 8_000,
}: BrowserAuthBootstrapOptions): Promise<boolean> {
  const authenticated = await withTimeout(
    init(),
    timeoutMs,
    "Authentication initialization timed out",
  );
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

  await withTimeout(
    syncCurrentUser(),
    timeoutMs,
    "User synchronization timed out",
  );
  const notify =
    dispatchEvent ??
    ((event: Event) => {
      if (typeof window !== "undefined") window.dispatchEvent(event);
    });
  notify(new Event("auth-changed"));
  return true;
}
