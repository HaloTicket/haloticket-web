export type ScannerState = "off" | "starting" | "scanning" | "denied" | "no-camera" | "error";

/** The same code is not sent twice within this time: a camera reads the same QR many times a second. */
export const SCAN_REPEAT_WINDOW_MS = 4000;

/** Turns a camera error into what the person at the gate can do about it. */
export function cameraErrorState(err: unknown): ScannerState {
  const name = (err as { name?: string } | null)?.name ?? "";
  const message = String((err as { message?: string } | null)?.message ?? err ?? "").toLowerCase();
  if (name === "NotAllowedError" || name === "SecurityError" || message.includes("permission") || message.includes("denied")) return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError" || message.includes("no camera") || message.includes("not found")) return "no-camera";
  return "error";
}
