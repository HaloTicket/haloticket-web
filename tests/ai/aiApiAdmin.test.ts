// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();
const get = vi.fn();
const del = vi.fn();
vi.mock("@/services/axiosClient", () => ({ default: { post: (...a: unknown[]) => post(...a), get: (...a: unknown[]) => get(...a), delete: (...a: unknown[]) => del(...a) } }));

import { aiApi } from "@/services/aiApi";

beforeEach(() => { post.mockReset(); get.mockReset(); del.mockReset(); });

describe("admin intelligence calls", () => {
  it("analyzeRiskScore keeps its body and sends refresh only when asked", async () => {
    post.mockResolvedValue({ risk_score: 1, risk_level: "LOW" });
    await aiApi.analyzeRiskScore("e1", "t", "d", "o");
    expect(post).toHaveBeenLastCalledWith("/admin/risk-scoring", { event_id: "e1", title: "t", description: "d", organizer_name: "o" });
    await aiApi.analyzeRiskScore("e1", "t", "d", "o", { refresh: true });
    expect(post).toHaveBeenLastCalledWith("/admin/risk-scoring", { event_id: "e1", title: "t", description: "d", organizer_name: "o", refresh: true });
  });

  it("getRiskBatch posts the ids and rejects a body without assessments", async () => {
    post.mockResolvedValueOnce({ assessments: { a: { risk_score: 1, risk_level: "LOW" } }, missing: ["b"] });
    expect(await aiApi.getRiskBatch(["a", "b"])).toEqual({ assessments: { a: { risk_score: 1, risk_level: "LOW" } }, missing: ["b"] });
    expect(post).toHaveBeenLastCalledWith("/admin/risk/batch", { event_ids: ["a", "b"] });
    post.mockResolvedValueOnce({ nope: true });
    await expect(aiApi.getRiskBatch(["a"])).rejects.toThrow();
  });

  it("recordRiskDecision retries once and never throws", async () => {
    post.mockRejectedValueOnce(new Error("x")).mockResolvedValueOnce({ recorded: true });
    expect(await aiApi.recordRiskDecision("e1", "APPROVED")).toBe(true);
    expect(post).toHaveBeenCalledTimes(2);
    expect(post).toHaveBeenLastCalledWith("/admin/risk/decisions", { event_id: "e1", decision: "APPROVED", reason: "" });

    post.mockReset();
    post.mockRejectedValue(new Error("x"));
    expect(await aiApi.recordRiskDecision("e1", "REJECTED", "vì sao")).toBe(false);
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("dashboard, attention and pins use the new endpoints", async () => {
    get.mockResolvedValue({ generated_at: "", items: [], pins: [], max: 12 });
    post.mockResolvedValue({ summary: null, reason: "UNVERIFIED", cached: false, created_at: "" });
    await aiApi.getDashboardKpis();
    expect(get).toHaveBeenLastCalledWith("/admin/dashboard/kpis");
    await aiApi.getAttention();
    expect(get).toHaveBeenLastCalledWith("/admin/attention");
    await aiApi.getDashboardSummary("en");
    expect(post).toHaveBeenLastCalledWith("/admin/dashboard/summary", { lang: "en" });
    await aiApi.getDashboardSummary("vi", true);
    expect(post).toHaveBeenLastCalledWith("/admin/dashboard/summary", { lang: "vi", refresh: true });
    await aiApi.getPins();
    expect(get).toHaveBeenLastCalledWith("/admin/pins");
    await aiApi.getPinData("a/b");
    expect(get).toHaveBeenLastCalledWith("/admin/pins/a%2Fb/data");
    await aiApi.deletePin("p 1");
    expect(del).toHaveBeenLastCalledWith("/admin/pins/p%201");
    await aiApi.getRiskAgreement();
    expect(get).toHaveBeenLastCalledWith("/admin/risk/agreement", { params: { days: 30 } });
  });

  it("rejects malformed attention and pins bodies instead of inventing empty lists", async () => {
    get.mockResolvedValueOnce({ unexpected: true });
    await expect(aiApi.getAttention()).rejects.toThrow();
    get.mockResolvedValueOnce(null);
    await expect(aiApi.getPins()).rejects.toThrow();
  });
});
