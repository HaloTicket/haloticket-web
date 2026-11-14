// A camera reads the same QR code many times a second. The guard lets a code through once, then ignores it for a few seconds
// (long enough for the person to take the ticket away), so one ticket is not sent over and over.

export interface ScanGuard {
  /** true when this code should be sent now; false for an empty code or one seen within the window */
  accept(code: string): boolean;
  reset(): void;
}

export function createScanGuard(windowMs = 4000, now: () => number = () => Date.now()): ScanGuard {
  const seen = new Map<string, number>();
  return {
    accept(code) {
      const value = code.trim();
      if (!value) return false;
      const at = now();
      for (const [key, time] of seen) {
        if (at - time >= windowMs) seen.delete(key);
      }
      if (seen.has(value)) return false;
      seen.set(value, at);
      return true;
    },
    reset() {
      seen.clear();
    },
  };
}
