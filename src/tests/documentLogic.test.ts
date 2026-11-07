import { describe, expect, it } from "vitest";
import {
  calculateDocumentMetrics,
  documentMatchesRequirement,
  getApplicationDocumentReadiness,
  MAX_DOCUMENT_SIZE,
  validateDocumentFile,
  validateDocumentFileContent,
} from "@/utils/documentLogic";
import type { VaultDocument } from "@/types";
import { createDemoScholarships } from "@/data/scholarships";

const createDocument = (
  updates: Partial<VaultDocument> = {},
): VaultDocument => ({
  id: "doc-1",
  name: "semester-record.pdf",
  category: "transcript",
  mimeType: "application/pdf",
  size: 1200,
  updatedAt: "2026-10-01T00:00:00.000Z",
  status: "uploaded",
  expiresAt: null,
  associatedApplicationIds: [],
  ...updates,
});

describe("Document vault logic", () => {
  it("accepts supported document formats and rejects unsupported, empty, and oversized files", () => {
    expect(
      validateDocumentFile(
        new File(["pdf"], "statement.pdf", { type: "application/pdf" }),
      ),
    ).toBeNull();
    expect(
      validateDocumentFile(
        new File(["image"], "photo.jpg", { type: "image/jpeg" }),
      ),
    ).toBeNull();
    expect(
      validateDocumentFile(
        new File(["text"], "notes.txt", { type: "text/plain" }),
      ),
    ).toContain("PDF, JPG");
    expect(
      validateDocumentFile(
        new File(["pdf"], "wrong-type.pdf", { type: "image/png" }),
      ),
    ).toContain("PDF, JPG");
    expect(validateDocumentFile(new File([], "empty.pdf"))).toContain("empty");
    expect(
      validateDocumentFile(
        new File([new Uint8Array(MAX_DOCUMENT_SIZE + 1)], "large.pdf", {
          type: "application/pdf",
        }),
      ),
    ).toContain("10 MB");
  });

  it("checks file signatures instead of trusting an allowed extension and MIME type", async () => {
    expect(
      await validateDocumentFileContent(
        new File(["%PDF-1.7\nbody"], "valid.pdf", { type: "application/pdf" }),
      ),
    ).toBeNull();
    expect(
      await validateDocumentFileContent(
        new File([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], "valid.jpg", {
          type: "image/jpeg",
        }),
      ),
    ).toBeNull();
    expect(
      await validateDocumentFileContent(
        new File(
          [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
          "valid.png",
          { type: "image/png" },
        ),
      ),
    ).toBeNull();
    await expect(
      validateDocumentFileContent(
        new File(["not a PDF"], "spoofed.pdf", { type: "application/pdf" }),
      ),
    ).resolves.toContain("content does not match");
  });

  it("calculates category completion and verification counts from current records", () => {
    const metrics = calculateDocumentMetrics([
      createDocument({ status: "pending-verification" }),
      createDocument({ id: "doc-2", category: "identity", status: "verified" }),
      createDocument({ id: "doc-3", category: "income", status: "expired" }),
    ]);
    expect(metrics).toEqual({
      total: 3,
      uploaded: 2,
      missing: 5,
      pendingVerification: 1,
      completion: 29,
    });
  });

  it("matches associated vault documents against scholarship requirements", () => {
    const scholarship = createDemoScholarships().find(
      (item) => item.id === "demo-sch-01",
    )!;
    const attached = createDocument({
      associatedApplicationIds: ["demo-app-01"],
    });
    expect(
      documentMatchesRequirement(attached, "Official Semester Transcripts"),
    ).toBe(true);
    const readiness = getApplicationDocumentReadiness(
      scholarship,
      [attached],
      "demo-app-01",
    );
    expect(readiness.ready).toEqual(["Official Semester Transcripts"]);
    expect(readiness.missing).toHaveLength(2);
  });

  it("does not count an expired file as satisfying an application requirement", () => {
    const scholarship = createDemoScholarships().find(
      (item) => item.id === "demo-sch-01",
    )!;
    const readiness = getApplicationDocumentReadiness(
      scholarship,
      [
        createDocument({
          status: "expired",
          associatedApplicationIds: ["demo-app-01"],
        }),
      ],
      "demo-app-01",
    );
    expect(readiness.ready).toEqual([]);
    expect(readiness.missing).toHaveLength(3);
  });
});
