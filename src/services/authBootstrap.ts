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
  if (!authenticated) return false;

  await syncCurrentUser();
  const notify =
    dispatchEvent ??
    ((event: Event) => {
      if (typeof window !== "undefined") window.dispatchEvent(event);
    });
  notify(new Event("auth-changed"));
  return true;
}
