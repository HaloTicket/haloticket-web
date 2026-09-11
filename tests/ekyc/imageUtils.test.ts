// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { readImageMetadata, rotateImageFile } from "@/utils/imageUtils";

describe("imageUtils", () => {
  it("reads metadata and classifies dimensions gracefully", async () => {
    const file = new File(["fake-image-bytes"], "cccd.jpg", { type: "image/jpeg" });
    const meta = await readImageMetadata(file);
    expect(meta).toBeDefined();
    expect(meta.size).toBe(file.size);
    expect(typeof meta.isPortrait).toBe("boolean");
  });

  it("safely handles rotation requests", async () => {
    const file = new File(["fake-image-bytes"], "cccd.jpg", { type: "image/jpeg" });
    const result = await rotateImageFile(file, 90);
    expect(result).toBeDefined();
    expect(result.rotatedFile).toBeDefined();
  });
});
