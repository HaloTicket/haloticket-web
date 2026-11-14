// A scan that cannot reach the server (no network, or the gateway cannot reach the ticket service) is kept here and sent again
// later, one by one, through the normal check-in call. Only the network is retried: an answer from the server (a refusal such as
// ALREADY_USED, or an error such as 403) is final and leaves the queue.
// The server stamps a check-in with the time it receives it, so a queued scan enters at the time of the sync, not of the scan.

export interface QueuedScan {
  id: string;
  eventId: string;
  qrCodeHash: string;
  showtimeId?: string | null;
  queuedAt: string;
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export const CHECKIN_QUEUE_KEY = "haloticket_checkin_queue_v1";
export const CHECKIN_QUEUE_LIMIT = 500;

export type AddResult = "added" | "duplicate" | "full";

export interface CheckinQueue {
  list(eventId?: string): QueuedScan[];
  size(eventId?: string): number;
  add(eventId: string, qrCodeHash: string, showtimeId?: string | null): AddResult;
  remove(id: string): void;
}

function browserStorage(): StorageLike | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null; // a browser that blocks storage: the queue then lives in memory only
  }
}

function isQueuedScan(value: unknown): value is QueuedScan {
  const v = value as Partial<QueuedScan> | null;
  return !!v && typeof v.id === "string" && typeof v.eventId === "string" && typeof v.qrCodeHash === "string";
}

export function createCheckinQueue(
  storage: StorageLike | null = browserStorage(),
  now: () => Date = () => new Date(),
  makeId: () => string = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
): CheckinQueue {
  let memory: QueuedScan[] = [];

  const load = (): QueuedScan[] => {
    if (!storage) return memory;
    try {
      const parsed = JSON.parse(storage.getItem(CHECKIN_QUEUE_KEY) ?? "[]");
      return Array.isArray(parsed) ? parsed.filter(isQueuedScan) : [];
    } catch {
      return [];
    }
  };

  const save = (items: QueuedScan[]) => {
    memory = items;
    if (!storage) return;
    try {
      storage.setItem(CHECKIN_QUEUE_KEY, JSON.stringify(items));
    } catch {
      // storage full or blocked: the memory copy still lets this page session send them
    }
  };

  return {
    list: (eventId) => load().filter((item) => !eventId || item.eventId === eventId),
    size: (eventId) => load().filter((item) => !eventId || item.eventId === eventId).length,
    add(eventId, qrCodeHash, showtimeId) {
      const items = load();
      if (items.some((item) => item.eventId === eventId && item.qrCodeHash === qrCodeHash)) return "duplicate";
      if (items.length >= CHECKIN_QUEUE_LIMIT) return "full";
      save([...items, { id: makeId(), eventId, qrCodeHash, showtimeId: showtimeId ?? null, queuedAt: now().toISOString() }]);
      return "added";
    },
    remove(id) {
      save(load().filter((item) => item.id !== id));
    },
  };
}

/** True when sending again later can work: the request got no answer, or the gateway could not reach the ticket service. */
export function isRetryableError(err: unknown): boolean {
  const e = err as { response?: { status?: number } | null; isAxiosError?: boolean; code?: string; request?: unknown } | null;
  if (!e || typeof e !== "object") return false;
  if (e.response) return [502, 503, 504].includes(e.response.status ?? 0);
  return e.isAxiosError === true || e.code === "ERR_NETWORK" || e.code === "ECONNABORTED" || e.request !== undefined;
}

export interface FlushEntry<T> {
  item: QueuedScan;
  /** the server's answer, when there was one */
  body?: T;
  /** the final error (not a network error), when there was one */
  error?: unknown;
}

export interface FlushResult<T> {
  results: FlushEntry<T>[];
  remaining: number;
  /** true when the network failed part-way: the rest stays queued for the next try */
  stoppedByNetwork: boolean;
}

/** Sends the queued scans of one event in order. Stops at the first network failure and keeps that scan and the rest queued. */
export async function flushCheckinQueue<T>(
  queue: CheckinQueue,
  eventId: string,
  send: (item: QueuedScan) => Promise<T>,
): Promise<FlushResult<T>> {
  const results: FlushEntry<T>[] = [];
  let stoppedByNetwork = false;
  for (const item of queue.list(eventId)) {
    try {
      const body = await send(item);
      queue.remove(item.id);
      results.push({ item, body });
    } catch (error) {
      if (isRetryableError(error)) {
        stoppedByNetwork = true;
        break;
      }
      queue.remove(item.id);
      results.push({ item, error });
    }
  }
  return { results, remaining: queue.size(eventId), stoppedByNetwork };
}
