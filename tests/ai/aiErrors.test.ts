// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { i18n, setLanguage } from "@/i18n";
import { aiErrorMessage, getAiErrorMessage, resolveAiError } from "@/utils/aiErrors";
import aiVi from "@/i18n/locales/ai.vi.json";
import aiEn from "@/i18n/locales/ai.en.json";

afterEach(async () => { await setLanguage("vi"); });

const flat = (status: number, code: string, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) => ({
  response: { status, data: { code, message: "server text that must not be shown", ...extra }, headers },
});
const nested = (status: number, code: string) => ({ response: { status, data: { detail: { code, message: "x" } } } });

describe("resolveAiError", () => {
  it("reads the flat body shape and the FastAPI detail shape", () => {
    expect(resolveAiError(flat(422, "AI_QUESTION_REFUSED")).kind).toBe("refused");
    expect(resolveAiError(nested(422, "AI_QUESTION_REFUSED")).kind).toBe("refused");
    expect(resolveAiError(nested(503, "AI_DB_NOT_CONFIGURED")).kind).toBe("db_not_configured");
    expect(resolveAiError(flat(502, "AI_GENERATION_FAILED")).code).toBe("AI_GENERATION_FAILED");
  });

  it("maps every documented code to a meaning key", () => {
    const expected: Record<string, string> = {
      AI_INPUT_INVALID: "ai.error.invalidInput",
      AI_QUESTION_REFUSED: "ai.error.refused",
      AI_BUDGET_EXHAUSTED: "ai.error.budgetExhausted",
      AI_GENERATION_FAILED: "ai.error.generationFailed",
      AI_UNAVAILABLE: "ai.error.unavailable",
      AI_DB_NOT_CONFIGURED: "ai.error.dbNotConfigured",
    };
    for (const [code, key] of Object.entries(expected)) {
      expect(resolveAiError(flat(400, code)).key).toBe(key);
    }
  });

  it("reads Retry-After for 429 and shows the seconds", () => {
    const info = resolveAiError(flat(429, "AI_RATE_LIMITED", {}, { "retry-after": "17" }));
    expect(info.kind).toBe("rate_limited");
    expect(info.retryAfterSeconds).toBe(17);
    expect(aiErrorMessage(info)).toContain("17");
  });

  it("supports AxiosHeaders-like objects and falls back to the body seconds", () => {
    const headers = { get: (name: string) => (name === "retry-after" ? "9" : undefined) };
    expect(resolveAiError({ response: { status: 429, data: { code: "AI_RATE_LIMITED" }, headers } }).retryAfterSeconds).toBe(9);
    expect(resolveAiError(flat(429, "AI_RATE_LIMITED", { retry_after_seconds: 30 })).retryAfterSeconds).toBe(30);
  });

  it("falls back to the status when there is no code, and to a wait-free 429 message", () => {
    expect(resolveAiError({ response: { status: 503, data: {} } }).kind).toBe("unavailable");
    expect(resolveAiError({ response: { status: 502, data: {} } }).kind).toBe("generation_failed");
    expect(resolveAiError({ response: { status: 500, data: "boom" } }).kind).toBe("unavailable");
    const noWait = resolveAiError({ response: { status: 429, data: {} } });
    expect(noWait.key).toBe("ai.error.rateLimitedNoWait");
    expect(aiErrorMessage(noWait)).not.toContain("{{");
  });

  it("never shows an unknown code or the server message raw", () => {
    const text = getAiErrorMessage(flat(418, "SOMETHING_ELSE"));
    expect(text).toBe(aiVi["ai.error.unknown"]);
    expect(text).not.toContain("SOMETHING_ELSE");
    expect(text).not.toContain("server text");
  });

  it("reports a network error when there is no response, and marks non-retryable kinds", () => {
    expect(resolveAiError(new Error("Network Error")).kind).toBe("network");
    expect(resolveAiError(null).kind).toBe("network");
    expect(resolveAiError(flat(422, "AI_QUESTION_REFUSED")).retryable).toBe(false);
    expect(resolveAiError(flat(503, "AI_UNAVAILABLE")).retryable).toBe(true);
  });

  it("translates the message when the language changes", async () => {
    await setLanguage("en");
    expect(getAiErrorMessage(flat(503, "AI_UNAVAILABLE"))).toBe(aiEn["ai.error.unavailable"]);
  });
});

describe("ai locale files", () => {
  it("define the same keys in Vietnamese and English and register them with i18n", () => {
    expect(Object.keys(aiVi).sort()).toEqual(Object.keys(aiEn).sort());
    for (const key of Object.keys(aiVi)) {
      expect(i18n.exists(key, { lng: "en", fallbackLng: false })).toBe(true);
      expect(i18n.exists(key, { lng: "vi", fallbackLng: false })).toBe(true);
    }
  });
});
