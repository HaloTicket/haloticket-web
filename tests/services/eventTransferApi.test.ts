import { afterEach, expect, it, vi } from "vitest";

const { post, put } = vi.hoisted(() => ({ post: vi.fn(), put: vi.fn() }));
vi.mock("@/services/axiosClient", () => ({ default: { post, put } }));
import { eventTransferApi } from "@/services/eventTransferApi";

afterEach(() => vi.resetAllMocks());

it("sends organizer mutations under the event scope with encoded identifiers", async () => {
  await eventTransferApi.moderateListing("event/a", "listing/b", "REJECT", "Sai điều kiện");
  expect(post).toHaveBeenLastCalledWith("/marketplace/organizer/events/event%2Fa/listings/listing%2Fb/moderate", { action: "REJECT", reason: "Sai điều kiện" });
  await eventTransferApi.moderateListing("event/a", "listing/b", "APPROVE");
  expect(post).toHaveBeenLastCalledWith("/marketplace/organizer/events/event%2Fa/listings/listing%2Fb/moderate", { action: "APPROVE" });
  await eventTransferApi.cancelListing("event/a", "listing/b");
  expect(post).toHaveBeenLastCalledWith("/marketplace/organizer/events/event%2Fa/listings/listing%2Fb/cancel", {});
  await eventTransferApi.cancelGift("event/a", "gift/b", "Theo yêu cầu");
  expect(post).toHaveBeenLastCalledWith("/marketplace/organizer/events/event%2Fa/gifts/gift%2Fb/cancel", { reason: "Theo yêu cầu" });
});

it("passes persisted policy controls alongside the configured ticket scope", async () => {
  const scope = { ticketTypeScope: "SELECTED", allowedTicketTypeIds: ["vip"], opensAt: null, closesAt: null, expectedVersion: 4 };
  const resale = { ...scope, enabled: true, minPricePercent: 80, maxPricePercent: 130, serviceFeePercent: 5, requireApproval: true, termsVersion: "v1" };
  await eventTransferApi.updateResalePolicy("event-1", resale);
  expect(put).toHaveBeenLastCalledWith("/events/event-1/resale-policy", resale);
  const gift = { ...scope, enabled: true, invitationTtlHours: 24, requireEkyc: false, maxGiftCount: 0 };
  await eventTransferApi.updateGiftPolicy("event-1", gift);
  expect(put).toHaveBeenLastCalledWith("/events/event-1/gift-policy", gift);
});
