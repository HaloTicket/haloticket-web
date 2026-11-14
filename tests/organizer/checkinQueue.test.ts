import { describe, expect, it, vi } from "vitest";
import {
  CHECKIN_QUEUE_KEY,
  CHECKIN_QUEUE_LIMIT,
  createCheckinQueue,
  flushCheckinQueue,
  isRetryableError,
} from "../../src/features/organizer/event-manage/checkinQueue";

function memoryStorage(initial?: string) {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(CHECKIN_QUEUE_KEY, initial);
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { data.set(k, v); },
  };
}

const ids = () => { let n = 0; return () => `id${++n}`; };
const at = () => new Date("2026-11-14T08:00:00Z");

describe("offline check-in queue", () => {
  it("stores a scan with its time and lists it for the event", () => {
    const q = createCheckinQueue(memoryStorage(), at, ids());
    expect(q.add("e1", "hashA", "s1")).toBe("added");
    expect(q.list("e1")).toEqual([{ id: "id1", eventId: "e1", qrCodeHash: "hashA", showtimeId: "s1", queuedAt: "2026-11-14T08:00:00.000Z" }]);
    expect(q.size("e1")).toBe(1);
    expect(q.size("e2")).toBe(0);
  });

  it("does not store the same code twice for one event", () => {
    const q = createCheckinQueue(memoryStorage(), at, ids());
    expect(q.add("e1", "hashA")).toBe("added");
    expect(q.add("e1", "hashA")).toBe("duplicate");
    expect(q.add("e2", "hashA")).toBe("added");
    expect(q.size()).toBe(2);
  });

  it("refuses new scans when the queue is full", () => {
    const q = createCheckinQueue(memoryStorage(), at, ids());
    for (let i = 0; i < CHECKIN_QUEUE_LIMIT; i++) expect(q.add("e1", `h${i}`)).toBe("added");
    expect(q.add("e1", "one-more")).toBe("full");
  });

  it("survives a reload: a new queue on the same storage sees the scans", () => {
    const storage = memoryStorage();
    createCheckinQueue(storage, at, ids()).add("e1", "hashA");
    expect(createCheckinQueue(storage, at, ids()).size("e1")).toBe(1);
  });

  it("ignores broken or foreign storage content", () => {
    expect(createCheckinQueue(memoryStorage("not json"), at, ids()).size()).toBe(0);
    expect(createCheckinQueue(memoryStorage('{"a":1}'), at, ids()).size()).toBe(0);
    expect(createCheckinQueue(memoryStorage('[{"x":1},{"id":"i","eventId":"e","qrCodeHash":"h"}]'), at, ids()).size()).toBe(1);
  });

  it("works in memory when storage is blocked", () => {
    const q = createCheckinQueue(null, at, ids());
    expect(q.add("e1", "hashA")).toBe("added");
    expect(q.size("e1")).toBe(1);
  });
});

describe("retryable errors", () => {
  it("retries only when there was no answer or the gateway could not reach the service", () => {
    expect(isRetryableError({ isAxiosError: true, code: "ERR_NETWORK" })).toBe(true);
    expect(isRetryableError({ request: {} })).toBe(true);
    expect(isRetryableError({ response: { status: 503 } })).toBe(true);
    expect(isRetryableError({ response: { status: 502 } })).toBe(true);
    expect(isRetryableError({ response: { status: 400 } })).toBe(false);
    expect(isRetryableError({ response: { status: 403 } })).toBe(false);
    expect(isRetryableError(null)).toBe(false);
  });
});

describe("flushing the queue", () => {
  const fill = () => {
    const q = createCheckinQueue(memoryStorage(), at, ids());
    q.add("e1", "a"); q.add("e1", "b"); q.add("e1", "c"); q.add("e2", "z");
    return q;
  };

  it("sends the scans of the event in order and empties them", async () => {
    const q = fill();
    const send = vi.fn(async (item: { qrCodeHash: string }) => ({ code: "SUCCESS", hash: item.qrCodeHash }));
    const result = await flushCheckinQueue(q, "e1", send);
    expect(send.mock.calls.map((c) => c[0].qrCodeHash)).toEqual(["a", "b", "c"]);
    expect(result.results).toHaveLength(3);
    expect(result.remaining).toBe(0);
    expect(result.stoppedByNetwork).toBe(false);
    expect(q.size("e2")).toBe(1);
  });

  it("stops at the first network failure and keeps that scan and the rest", async () => {
    const q = fill();
    const send = vi.fn()
      .mockResolvedValueOnce({ code: "SUCCESS" })
      .mockRejectedValueOnce({ isAxiosError: true, code: "ERR_NETWORK" });
    const result = await flushCheckinQueue(q, "e1", send);
    expect(result.results).toHaveLength(1);
    expect(result.stoppedByNetwork).toBe(true);
    expect(q.list("e1").map((i) => i.qrCodeHash)).toEqual(["b", "c"]);
  });

  it("treats a refusal from the server as final: it leaves the queue with its error", async () => {
    const q = fill();
    const refusal = { response: { status: 400, data: { code: "WRONG_EVENT" } } };
    const send = vi.fn().mockRejectedValueOnce(refusal).mockResolvedValue({ code: "SUCCESS" });
    const result = await flushCheckinQueue(q, "e1", send);
    expect(result.results[0].error).toBe(refusal);
    expect(result.remaining).toBe(0);
    expect(send).toHaveBeenCalledTimes(3);
  });
});
