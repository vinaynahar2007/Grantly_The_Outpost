import { describe, expect, it } from "vitest";
import { getSafeExternalUrl } from "@/utils/externalUrl";

describe("external URL validation", () => {
  it("allows credential-free HTTPS URLs and rejects unsafe or malformed values", () => {
    expect(getSafeExternalUrl("https://scholarships.example/apply")).toBe(
      "https://scholarships.example/apply",
    );
    expect(getSafeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(getSafeExternalUrl("http://scholarships.example/apply")).toBeNull();
    expect(getSafeExternalUrl("https://user:pass@example.com")).toBeNull();
    expect(getSafeExternalUrl("//example.com")).toBeNull();
    expect(getSafeExternalUrl(null)).toBeNull();
  });
});
