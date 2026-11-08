import { t as translate } from "@/i18n";

export type AiErrorKey =
  | "ai.error.rateLimited"
  | "ai.error.rateLimitedNoWait"
  | "ai.error.budgetExhausted"
  | "ai.error.unavailable"
  | "ai.error.dbNotConfigured"
  | "ai.error.generationFailed"
  | "ai.error.refused"
  | "ai.error.invalidInput"
  | "ai.error.network"
  | "ai.error.forbidden"
  | "ai.error.unauthorized"
  | "ai.error.unknown";

export type AiErrorKind =
  | "rate_limited"
  | "budget_exhausted"
  | "unavailable"
  | "db_not_configured"
  | "generation_failed"
  | "refused"
  | "invalid_input"
  | "network"
  | "forbidden"
  | "unauthorized"
  | "unknown";

export interface AiErrorInfo {
  kind: AiErrorKind;
  key: AiErrorKey;
  status?: number;
  code?: string;
  retryAfterSeconds?: number;
  retryable: boolean;
}

const CODE_KIND: Record<string, AiErrorKind> = {
  AI_INPUT_INVALID: "invalid_input",
  AI_QUESTION_REFUSED: "refused",
  AI_RATE_LIMITED: "rate_limited",
  AI_BUDGET_EXHAUSTED: "budget_exhausted",
  AI_GENERATION_FAILED: "generation_failed",
  AI_UNAVAILABLE: "unavailable",
  AI_DB_NOT_CONFIGURED: "db_not_configured",
};

const STATUS_KIND: Record<number, AiErrorKind> = {
  401: "unauthorized",
  403: "forbidden",
  422: "invalid_input",
  429: "rate_limited",
  502: "generation_failed",
  503: "unavailable",
  504: "unavailable",
};

const KIND_KEY: Record<AiErrorKind, AiErrorKey> = {
  rate_limited: "ai.error.rateLimited",
  budget_exhausted: "ai.error.budgetExhausted",
  unavailable: "ai.error.unavailable",
  db_not_configured: "ai.error.dbNotConfigured",
  generation_failed: "ai.error.generationFailed",
  refused: "ai.error.refused",
  invalid_input: "ai.error.invalidInput",
  network: "ai.error.network",
  forbidden: "ai.error.forbidden",
  unauthorized: "ai.error.unauthorized",
  unknown: "ai.error.unknown",
};

const NON_RETRYABLE: AiErrorKind[] = ["refused", "invalid_input", "forbidden", "unauthorized"];

type Dict = Record<string, unknown>;
const isDict = (value: unknown): value is Dict => typeof value === "object" && value !== null;

function readHeader(headers: unknown, name: string): string | undefined {
  if (!isDict(headers)) return undefined;
  const getter = headers.get;
  if (typeof getter === "function") {
    const viaGet = (getter as (n: string) => unknown).call(headers, name);
    if (typeof viaGet === "string" || typeof viaGet === "number") return String(viaGet);
  }
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === name) {
      const value = headers[key];
      if (typeof value === "string" || typeof value === "number") return String(value);
    }
  }
  return undefined;
}

function toSeconds(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number.parseFloat(value) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.min(Math.ceil(parsed), 24 * 3600);
}

/** Reads status, AI error code (flat body or FastAPI detail), and Retry-After from an axios-style error. */
export function resolveAiError(err: unknown): AiErrorInfo {
  const e = isDict(err) ? err : {};
  const response = isDict(e.response) ? e.response : undefined;
  const status = response && typeof response.status === "number" ? response.status : undefined;
  const data = response && isDict(response.data) ? response.data : undefined;
  const detail = data && isDict(data.detail) ? data.detail : undefined;

  const code = [data?.code, detail?.code].find((c): c is string => typeof c === "string" && c.length > 0);

  let kind: AiErrorKind | undefined;
  if (code && Object.prototype.hasOwnProperty.call(CODE_KIND, code)) kind = CODE_KIND[code];
  if (!kind && status !== undefined && STATUS_KIND[status]) kind = STATUS_KIND[status];
  if (!kind && status !== undefined && status >= 500) kind = "unavailable";
  if (!kind && !response) kind = "network";
  if (!kind) kind = "unknown";

  const retryAfterSeconds =
    kind === "rate_limited" || kind === "budget_exhausted"
      ? toSeconds(readHeader(response?.headers, "retry-after")) ?? toSeconds(data?.retry_after_seconds) ?? toSeconds(detail?.retry_after_seconds)
      : undefined;

  return {
    kind,
    key: kind === "rate_limited" && retryAfterSeconds === undefined ? "ai.error.rateLimitedNoWait" : KIND_KEY[kind],
    status,
    code,
    retryAfterSeconds,
    retryable: !NON_RETRYABLE.includes(kind),
  };
}

/** Localised, user-facing text. Server messages and unknown codes are never shown raw. */
export function aiErrorMessage(info: AiErrorInfo): string {
  return translate(info.key, info.kind === "rate_limited" ? { seconds: info.retryAfterSeconds } : undefined);
}

export function getAiErrorMessage(err: unknown): string {
  return aiErrorMessage(resolveAiError(err));
}
