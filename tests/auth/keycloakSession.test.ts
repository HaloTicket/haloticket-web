import { describe, expect, it, vi } from "vitest";

import { createKeycloakSession, type KeycloakLike } from "@/services/keycloakSession";

function makeKeycloak(overrides: Partial<KeycloakLike> = {}): KeycloakLike {
  return {
    authenticated: false,
    token: undefined,
    init: vi.fn().mockResolvedValue(false),
    login: vi.fn().mockResolvedValue(undefined),
    createLoginUrl: vi.fn().mockReturnValue("https://keycloak.test/google"),
    updateToken: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function makeWindow() {
  const listeners = new Map<string, Set<(event: unknown) => void>>();
  const popup = { closed: false, close: vi.fn() };
  return {
    popup,
    window: {
      open: vi.fn().mockReturnValue(popup),
      addEventListener: vi.fn((type: string, listener: (event: unknown) => void) => {
        const callbacks = listeners.get(type) ?? new Set();
        callbacks.add(listener);
        listeners.set(type, callbacks);
      }),
      removeEventListener: vi.fn(),
      dispatch(type: string, event: unknown) {
        listeners.get(type)?.forEach((listener) => listener(event));
      },
    },
  };
}

describe("createKeycloakSession", () => {
  it("creates the browser client for the HaloTicket realm by default", () => {
    const keycloak = makeKeycloak();
    const keycloakFactory = vi.fn().mockReturnValue(keycloak);

    createKeycloakSession({
      keycloakFactory,
      location: { origin: "http://localhost:5173" },
    });

    expect(keycloakFactory).toHaveBeenCalledWith({
      url: "http://localhost:9080",
      realm: "haloticket-realm",
      clientId: "haloticket-web",
    });
  });

  it("initializes with check-sso, PKCE S256, and silent check-sso URL", async () => {
    const keycloak = makeKeycloak();
    const session = createKeycloakSession({
      keycloak,
      location: { origin: "https://haloticket.test" },
    });

    await session.init();

    expect(keycloak.init).toHaveBeenCalledWith({
      checkLoginIframe: false,
      onLoad: "check-sso",
      pkceMethod: "S256",
      silentCheckSsoRedirectUri:
        "https://haloticket.test/silent-check-sso.html",
    });
  });

  it("opens Google login in a popup and resolves on the same-origin callback", async () => {
    const keycloak = makeKeycloak();
    const browser = makeWindow();
    const storage = { getItem: vi.fn(), setItem: vi.fn() };
    const session = createKeycloakSession({
      keycloak,
      location: { origin: "https://haloticket.test" },
      storage,
      window: browser.window as never,
      screen: { availWidth: 1920, availHeight: 1080, availLeft: 0, availTop: 0 },
    });

    const login = session.loginWithGoogle();

    expect(keycloak.createLoginUrl).toHaveBeenCalledWith({
      idpHint: "google",
      prompt: "login",
      redirectUri: "https://haloticket.test/auth/popup-callback",
    });
    expect(browser.window.open).toHaveBeenCalledWith(
      "https://keycloak.test/google",
      "haloticket-google-auth",
      expect.stringContaining("popup"),
    );
    expect(browser.window.open).toHaveBeenCalledWith(
      "https://keycloak.test/google",
      "haloticket-google-auth",
      expect.stringContaining("left=700"),
    );

    browser.window.dispatch("message", {
      origin: "https://haloticket.test",
      source: browser.popup,
      data: { type: "haloticket-google-auth", status: "success", token: "google-token" },
    });

    await expect(login).resolves.toBeUndefined();
    expect(storage.setItem).toHaveBeenCalledWith("access_token", "google-token");
  });

  it("rejects when Keycloak reports that Google access was denied", async () => {
    const browser = makeWindow();
    const session = createKeycloakSession({
      keycloak: makeKeycloak(),
      location: { origin: "https://haloticket.test" },
      window: browser.window as never,
      keycloakOrigin: "http://localhost:9080",
    });
    const login = session.loginWithGoogle();

    browser.window.dispatch("message", {
      origin: "http://localhost:9080",
      source: browser.popup,
      data: { type: "haloticket-google-auth", status: "cancelled" },
    });

    await expect(login).rejects.toThrow("Google login was cancelled");
    expect(browser.popup.close).not.toHaveBeenCalled();
  });

  it("rejects when focus returns after the popup is closed without a callback", async () => {
    vi.useFakeTimers();
    try {
      const browser = makeWindow();
      const session = createKeycloakSession({
        keycloak: makeKeycloak(),
        location: { origin: "https://haloticket.test" },
        window: browser.window as never,
      });
      const login = session.loginWithGoogle();

      browser.window.dispatch("focus", undefined);
      vi.advanceTimersByTime(400);

      await expect(login).rejects.toThrow("Google login was cancelled");
      expect(browser.popup.close).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("refreshes an in-memory Keycloak token before returning it", async () => {
    const keycloak = makeKeycloak({
      authenticated: true,
      token: "old-token",
      updateToken: vi.fn().mockImplementation(async () => {
        keycloak.token = "fresh-token";
        return true;
      }),
    });
    const session = createKeycloakSession({ keycloak });

    await expect(session.getAccessToken()).resolves.toBe("fresh-token");
    expect(keycloak.updateToken).toHaveBeenCalledWith(30);
  });

  it("falls back to the legacy localStorage access_token", async () => {
    const keycloak = makeKeycloak();
    const storage = {
      getItem: vi.fn().mockReturnValue("password-token"),
      removeItem: vi.fn(),
    };
    const session = createKeycloakSession({ keycloak, storage });

    await expect(session.getAccessToken()).resolves.toBe("password-token");
    expect(keycloak.updateToken).not.toHaveBeenCalled();
  });

  it("automatically purges expired JWT tokens in storage and returns null", async () => {
    const keycloak = makeKeycloak();
    // Create an expired JWT token (exp: 1000000000 -> year 2001)
    const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({ exp: 1000000000, sub: "user-123" }));
    const expiredJwt = `${header}.${payload}.signature`;

    const storage = {
      getItem: vi.fn().mockReturnValue(expiredJwt),
      removeItem: vi.fn(),
    };
    const session = createKeycloakSession({ keycloak, storage });

    const token = await session.getAccessToken();
    expect(token).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith("access_token");
    expect(storage.removeItem).toHaveBeenCalledWith("id_token");
  });

  it("uses the stored refresh token and persists its rotation before access expires", async () => {
    const header = btoa(JSON.stringify({ alg: "RS256" }));
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 10, azp: "user-service" }));
    const storageValues = new Map<string, string>([
      ["access_token", `${header}.${payload}.signature`],
      ["refresh_token", "old-refresh"],
    ]);
    const storage = {
      getItem: vi.fn((key: string) => storageValues.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => storageValues.set(key, value)),
      removeItem: vi.fn((key: string) => storageValues.delete(key)),
    };
    const refreshRequest = vi.fn().mockResolvedValue({
      accessToken: "fresh-access", refreshToken: "fresh-refresh", idToken: "fresh-id",
    });
    const session = createKeycloakSession({ keycloak: makeKeycloak(), storage, refreshRequest });

    await expect(session.getAccessToken()).resolves.toBe("fresh-access");
    expect(refreshRequest).toHaveBeenCalledWith("old-refresh", "user-service");
    expect(storage.setItem).toHaveBeenCalledWith("refresh_token", "fresh-refresh");
  });

  it("reports either a Keycloak or legacy session as authenticated", () => {
    const keycloak = makeKeycloak({ authenticated: false });
    const storage = { getItem: vi.fn().mockReturnValue("password-token") };
    const session = createKeycloakSession({ keycloak, storage });

    expect(session.isAuthenticated()).toBe(true);
    expect(session.getCurrentToken()).toBe("password-token");
  });

  it("logs out Keycloak and redirects to the application root", async () => {
    const keycloak = makeKeycloak({
      authenticated: true,
      token: "keycloak-token",
      logout: vi.fn().mockResolvedValue(undefined),
    });
    const storage = {
      getItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const session = createKeycloakSession({
      keycloak,
      location: { origin: "https://haloticket.test" },
      storage,
    });

    await session.logout();

    expect(keycloak.logout).toHaveBeenCalledWith({
      redirectUri: "https://haloticket.test/",
    });
    expect(storage.removeItem).toHaveBeenCalledWith("haloticket_user_profile");
  });

  it("can redirect to the login page after logging out an expired session", async () => {
    const keycloak = makeKeycloak({
      logout: vi.fn().mockResolvedValue(undefined),
    });
    const session = createKeycloakSession({
      keycloak,
      location: { origin: "https://haloticket.test" },
      storage: { getItem: vi.fn(), removeItem: vi.fn() },
    });

    await session.logout("https://haloticket.test/login");

    expect(keycloak.logout).toHaveBeenCalledWith({
      redirectUri: "https://haloticket.test/login",
    });
  });

  it("clears legacy auth keys when no Keycloak session exists", async () => {
    const keycloak = makeKeycloak({
      logout: vi.fn().mockResolvedValue(undefined),
    });
    const storage = {
      getItem: vi.fn((key: string) => key === "id_token" ? "id-token" : "password-token"),
      removeItem: vi.fn(),
    };
    const session = createKeycloakSession({ keycloak, storage });

    await session.logout();

    expect(storage.removeItem).toHaveBeenCalledWith("access_token");
    expect(storage.removeItem).toHaveBeenCalledWith("refresh_token");
    expect(storage.removeItem).toHaveBeenCalledWith("haloticket_user_profile");
    expect(keycloak.logout).toHaveBeenCalledWith({
      redirectUri: "http://localhost/",
    });
    expect(keycloak.idToken).toBe("id-token");
  });
});
