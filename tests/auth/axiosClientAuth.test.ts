// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const getAccessToken = vi.fn();

vi.mock("@/services/keycloakSession", () => ({
  getKeycloakSession: () => ({ getAccessToken }),
}));

describe("axiosClient authentication", () => {
  beforeEach(() => {
    getAccessToken.mockReset();
    window.localStorage.clear();
  });

  it("attaches the refreshed token supplied by the shared auth session", async () => {
    getAccessToken.mockResolvedValue("google-access-token");
    const { default: axiosClient } = await import("@/services/axiosClient");
    let authorization: unknown;
    axiosClient.defaults.adapter = async (config) => {
      authorization = config.headers.Authorization;
      return {
        config,
        data: { ok: true },
        headers: {},
        status: 200,
        statusText: "OK",
      };
    };

    await axiosClient.get("/users/me");

    expect(getAccessToken).toHaveBeenCalledOnce();
    expect(authorization).toBe("Bearer google-access-token");
  });

  it("shows an immediate duplicate-account message", async () => {
    const { getAuthErrorMessage } = await import("@/services/authApi");
    expect(getAuthErrorMessage({ code: "USER_ALREADY_EXISTS" }, "fallback"))
      .toEqual({ key: "Email này đã được đăng ký. Vui lòng đăng nhập." });
  });
});
