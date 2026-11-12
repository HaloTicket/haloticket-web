import { describe, expect, it, vi } from "vitest";

import { initializeBrowserAuth } from "@/services/authBootstrap";

describe("initializeBrowserAuth", () => {
  it("synchronizes the local user after Keycloak restores a session", async () => {
    const syncCurrentUser = vi.fn().mockResolvedValue(undefined);
    const dispatchEvent = vi.fn();

    await expect(
      initializeBrowserAuth({
        init: vi.fn().mockResolvedValue(true),
        syncCurrentUser,
        dispatchEvent,
      }),
    ).resolves.toBe(true);

    expect(syncCurrentUser).toHaveBeenCalledOnce();
    expect(dispatchEvent.mock.calls[0]?.[0]).toMatchObject({ type: "auth-changed" });
  });

  it("does not synchronize a user when no Keycloak session exists", async () => {
    const syncCurrentUser = vi.fn();

    await expect(
      initializeBrowserAuth({
        init: vi.fn().mockResolvedValue(false),
        syncCurrentUser,
      }),
    ).resolves.toBe(false);

    expect(syncCurrentUser).not.toHaveBeenCalled();
  });

  it("stops waiting for Keycloak when silent SSO never completes", async () => {
    const syncCurrentUser = vi.fn();
    const neverCompletes = new Promise<boolean>(() => {});

    await expect(
      initializeBrowserAuth({
        init: () => neverCompletes,
        syncCurrentUser,
        timeoutMs: 10,
      }),
    ).rejects.toThrow("Authentication initialization timed out");

    expect(syncCurrentUser).not.toHaveBeenCalled();
  });

  it("also bounds a stalled user sync after Keycloak initialization", async () => {
    const dispatchEvent = vi.fn();

    await expect(
      initializeBrowserAuth({
        init: vi.fn().mockResolvedValue(true),
        syncCurrentUser: () => new Promise(() => {}),
        dispatchEvent,
        timeoutMs: 10,
      }),
    ).rejects.toThrow("User synchronization timed out");

    expect(dispatchEvent).not.toHaveBeenCalled();
  });
});
