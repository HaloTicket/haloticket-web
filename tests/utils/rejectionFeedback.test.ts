import { describe, expect, it } from "vitest";
import {
  buildRejectionNotes, fieldsFromQuotes, fieldsOnStep, flagLabel, flaggedStepsFor, parseRejectionNotes, plainTextOf, quoteStatus, quotesFromRisk, stepsOfField,
} from "@/utils/rejectionFeedback";
import { eventTargetOfNotification } from "@/utils/notificationLinks";
import type { RiskReasonItem } from "@/types/ai";

describe("eventTargetOfNotification", () => {
  it("goes to the edit page of the event the notification names", () => {
    expect(eventTargetOfNotification({ variablesJson: JSON.stringify({ eventId: "ev-12_AB", link: "/elsewhere" }) })).toBe("/organizer/events/ev-12_AB/manage/edit");
  });
  it("falls back to the list when there is nothing usable", () => {
    for (const variablesJson of [undefined, null, "", "not json", "{broken", "[]", "{}", JSON.stringify({ eventId: "" }), JSON.stringify({ eventId: 5 }), JSON.stringify({ link: "/organizer/events/x/manage/edit" })]) {
      expect(eventTargetOfNotification({ variablesJson })).toBe("/organizer/my-events");
    }
  });
  it("never follows a hostile id or the payload link", () => {
    for (const eventId of ["../x", "a/b", "javascript:alert(1)", "//evil.example", "a b", "x?y=1", "x#y", "%2e%2e", "a".repeat(101)]) {
      expect(eventTargetOfNotification({ variablesJson: JSON.stringify({ eventId, link: "https://evil.example" }) })).toBe("/organizer/my-events");
    }
  });
});

describe("steps of the flagged sections", () => {
  it("maps each section to the wizard step that holds it", () => {
    expect(stepsOfField("posterImage", false)).toEqual([1]);
    expect(stepsOfField("title", true)).toEqual([1]);
    expect(stepsOfField("location", true)).toEqual([1]);
    expect(stepsOfField("dates", false)).toEqual([2]);
    expect(stepsOfField("tickets", true)).toEqual([2]);
    expect(stepsOfField("paymentInfo", false)).toEqual([4]);
    expect(stepsOfField("paymentInfo", true)).toEqual([5]); // the questions step pushes payment to step 5
    expect(stepsOfField("unknown", true)).toEqual([]);
  });
  it("lists the flagged steps once, in order", () => {
    expect(flaggedStepsFor(["paymentInfo", "title", "location", "tickets"], false)).toEqual([1, 2, 4]);
    expect(flaggedStepsFor([], false)).toEqual([]);
  });
  it("lists the sections of one step in the admin dialog's order", () => {
    expect(fieldsOnStep(["location", "posterImage", "tickets"], 1, false)).toEqual(["posterImage", "location"]);
    expect(fieldsOnStep(["tickets"], 1, false)).toEqual([]);
  });
  it("has a label for every section", () => {
    expect(flagLabel("dates")).toBe("Thời gian diễn ra");
    expect(flagLabel("???")).toBe("???");
  });
});

describe("rejection notes", () => {
  it("reads the JSON the admin dialog writes, with quotes", () => {
    const notes = parseRejectionNotes(JSON.stringify({ flaggedFields: ["title", "bogus", 3], noteText: "Sửa mô tả", flaggedQuotes: [{ field: "description", text: " bán vũ khí " }, { field: "price", text: "x" }, { field: "title", text: "a" }, "junk"] }));
    expect(notes).toEqual({ noteText: "Sửa mô tả", flaggedFields: ["title"], flaggedQuotes: [{ field: "description", text: "bán vũ khí" }] });
  });
  it("keeps old plain-text and broken notes as the note itself", () => {
    expect(parseRejectionNotes("Vui lòng bổ sung")).toEqual({ noteText: "Vui lòng bổ sung", flaggedFields: [], flaggedQuotes: [] });
    expect(parseRejectionNotes("{oops")).toEqual({ noteText: "{oops", flaggedFields: [], flaggedQuotes: [] });
    expect(parseRejectionNotes(undefined)).toEqual({ noteText: "", flaggedFields: [], flaggedQuotes: [] });
  });
  it("caps and de-duplicates the quotes", () => {
    const many = Array.from({ length: 15 }, (_, i) => ({ field: "description", text: `đoạn số ${i}` }));
    expect(parseRejectionNotes(JSON.stringify({ flaggedQuotes: [...many, ...many] })).flaggedQuotes).toHaveLength(10);
  });
  it("writes the same shape back, quotes only when there are some", () => {
    expect(buildRejectionNotes(["posterImage"], "ghi chú", [])).toBe('{"flaggedFields":["posterImage"],"noteText":"ghi chú"}');
    expect(JSON.parse(buildRejectionNotes(["title"], "", [{ field: "title", text: "x y" }])).flaggedQuotes).toEqual([{ field: "title", text: "x y" }]);
  });
});

describe("quotes from the risk assessment", () => {
  const items: RiskReasonItem[] = [
    { layer: "RULE", code: "prohibited_goods", weight: 60, message: "m", evidence: [{ field: "description", text: "vũ khí" }, { field: "description", text: "Vũ khí" }, { field: "title", text: "Bán vũ khí" }] },
    { layer: "SIGNAL", code: "organizer_ekyc", weight: 15, message: "m", evidence: [{ field: "organizer", text: "eKYC: PENDING" }] },
    { layer: "SIGNAL", code: "UNAVAILABLE:x", weight: 0, status: "not_assessed", message: "m", evidence: [{ field: "description", text: "không được gửi" }] },
    { layer: "RULE", code: "mentioned_in_prohibition", weight: 0, message: "m", evidence: [{ field: "description", text: "thuốc lá" }] },
    { layer: "AI", code: "SCAM_PATTERN", weight: 20, message: "m", evidence: [{ field: "description", text: "đặt cọc trước" }] },
  ];
  it("takes only found, scored evidence of the title or description from rules and the model", () => {
    expect(quotesFromRisk(items)).toEqual([
      { field: "description", text: "vũ khí" }, { field: "title", text: "Bán vũ khí" }, { field: "description", text: "đặt cọc trước" },
    ]);
  });
  it("is empty without data and caps at ten", () => {
    expect(quotesFromRisk(undefined)).toEqual([]);
    const lots: RiskReasonItem[] = [{ layer: "RULE", code: "c", weight: 5, message: "m", evidence: Array.from({ length: 30 }, (_, i) => ({ field: "description", text: `cụm số ${i}` })) }];
    expect(quotesFromRisk(lots)).toHaveLength(10);
  });
  it("suggests the title and description section only when there are quotes", () => {
    expect(fieldsFromQuotes([{ field: "description", text: "ab" }])).toEqual(["title"]);
    expect(fieldsFromQuotes([])).toBeNull();
  });
});

describe("quote status in the editor", () => {
  const quote = { field: "description" as const, text: "bán vũ khí" };
  it("is still while the words are in the text, whatever the case, tags or spacing", () => {
    expect(quoteStatus(quote, { title: "", description: "<p>Chúng tôi  BÁN Vũ khí giá rẻ</p>" })).toBe("still");
  });
  it("is fixed once they are gone, and a title quote only looks at the title", () => {
    expect(quoteStatus(quote, { title: "bán vũ khí", description: "Đêm nhạc" })).toBe("fixed");
    expect(quoteStatus({ field: "title", text: "bán vũ khí" }, { title: "Bán vũ khí", description: "" })).toBe("still");
  });
  it("turns editor HTML into plain text", () => {
    expect(plainTextOf("<p>A&nbsp;&amp;&nbsp;B</p>\n<ul><li>c</li></ul>")).toBe("A & B c");
  });
});
