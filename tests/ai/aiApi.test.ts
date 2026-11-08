// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();
const get = vi.fn();
vi.mock("@/services/axiosClient", () => ({ default: { post: (...a: unknown[]) => post(...a), get: (...a: unknown[]) => get(...a) } }));

import { aiApi } from "@/services/aiApi";

beforeEach(() => { post.mockReset(); get.mockReset(); });

describe("aiApi no longer swallows errors", () => {
  it("lets chat-search, system-health, system-logs and ssl-status errors reach the caller", async () => {
    const err = { response: { status: 429, data: { code: "AI_RATE_LIMITED" } } };
    post.mockRejectedValueOnce(err);
    await expect(aiApi.searchEventsByNaturalLanguage("q")).rejects.toBe(err);
    get.mockRejectedValueOnce(err);
    await expect(aiApi.getSystemHealth()).rejects.toBe(err);
    get.mockRejectedValueOnce(err);
    await expect(aiApi.getSystemLogs()).rejects.toBe(err);
    get.mockRejectedValueOnce(err);
    await expect(aiApi.getSslStatus("x.com")).rejects.toBe(err);
  });

  it("rejects malformed bodies instead of turning them into empty data", async () => {
    get.mockResolvedValueOnce({ unexpected: true });
    await expect(aiApi.getSystemHealth()).rejects.toThrow();
    get.mockResolvedValueOnce({ unexpected: true });
    await expect(aiApi.getSystemLogs()).rejects.toThrow();
    get.mockResolvedValueOnce(null);
    await expect(aiApi.getSslStatus()).rejects.toThrow();
    get.mockResolvedValueOnce({});
    await expect(aiApi.getAiHealth()).rejects.toThrow();
  });
});

describe("aiApi response shapes", () => {
  it("returns the {entries, source} logs body and tolerates the legacy array", async () => {
    get.mockResolvedValueOnce({ entries: [], source: { status: "unavailable" } });
    expect(await aiApi.getSystemLogs()).toEqual({ entries: [], source: { status: "unavailable" } });
    get.mockResolvedValueOnce([{ id: "1" }]);
    expect((await aiApi.getSystemLogs()).source.status).toBe("ok");
  });

  it("getAiHealth sends probe=1 only when asked", async () => {
    get.mockResolvedValue({ providers: [], probe: null });
    await aiApi.getAiHealth();
    expect(get).toHaveBeenLastCalledWith("/admin/ai/health", { params: {} });
    await aiApi.getAiHealth(true);
    expect(get).toHaveBeenLastCalledWith("/admin/ai/health", { params: { probe: 1 } });
  });
});
