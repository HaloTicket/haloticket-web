import { afterEach, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/services/axiosClient", () => ({ default: { get } }));
import { marketplaceApi } from "@/services/marketplaceApi";

afterEach(() => vi.resetAllMocks());

it("keeps empty resale events and listing pages empty", async () => {
  const events: [] = [];
  get.mockResolvedValueOnce(events);
  await expect(marketplaceApi.getResaleEvents()).resolves.toBe(events);
  expect(get).toHaveBeenLastCalledWith("/marketplace/events");
  const page = { content: [], totalElements: 0, totalPages: 0, number: 2, size: 10 };
  get.mockResolvedValueOnce(page);
  await expect(marketplaceApi.getEventListings("event/a", 2, 10)).resolves.toBe(page);
  expect(get).toHaveBeenLastCalledWith("/marketplace/events/event%2Fa/listings?page=2&size=10");
  expect(get).toHaveBeenCalledTimes(2);
});

it("propagates resale fetch errors instead of returning sample records", async () => {
  const error = new Error("Unavailable");
  get.mockRejectedValue(error);
  await expect(marketplaceApi.getResaleEvents()).rejects.toBe(error);
  await expect(marketplaceApi.getEventListings("EVT-123")).rejects.toBe(error);
  expect(get).toHaveBeenCalledTimes(2);
});
