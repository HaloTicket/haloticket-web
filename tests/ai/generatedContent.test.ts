import { describe, expect, it } from "vitest";
import { buildGeneratedDescription } from "@/features/organizer/components/create-event/generatedContent";

describe("buildGeneratedDescription", () => {
  it("returns null (an error, nothing written) when the response has no usable description", () => {
    expect(buildGeneratedDescription(undefined, "T")).toBeNull();
    expect(buildGeneratedDescription(null, "T")).toBeNull();
    expect(buildGeneratedDescription({}, "T")).toBeNull();
    expect(buildGeneratedDescription({ description: "   " }, "T")).toBeNull();
    expect(buildGeneratedDescription({ description: 42 }, "T")).toBeNull();
    expect(buildGeneratedDescription({ terms_and_conditions: "only terms" }, "T")).toBeNull();
  });

  it("joins description and terms and strips markdown", () => {
    const text = buildGeneratedDescription({ description: "## Title\n***Bold*** text", terms_and_conditions: "No refunds" }, "Terms:");
    expect(text).toBe("Title\nBold text\n\nTerms:\nNo refunds");
  });

  it("omits the terms block when there are none", () => {
    expect(buildGeneratedDescription({ description: "Hello" }, "Terms:")).toBe("Hello");
  });
});
