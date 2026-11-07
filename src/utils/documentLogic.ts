import type {
  DocumentCategory,
  DocumentStatus,
  Scholarship,
  VaultDocument,
} from "@/types";

export const DOCUMENT_CATEGORIES: Array<{
  id: DocumentCategory;
  label: string;
  description: string;
}> = [
  {
    id: "transcript",
    label: "Academic transcripts",
    description: "Transcripts, marksheets, and academic records.",
  },
  {
    id: "identity",
    label: "Identity proof",
    description: "Government-issued identity documents.",
  },
  {
    id: "income",
    label: "Income certificates",
    description: "Household income and financial eligibility records.",
  },
  {
    id: "category-certificate",
    label: "Category certificates",
    description: "Caste, category, or community certificates.",
  },
  {
    id: "recommendation",
    label: "Recommendation letters",
    description: "Faculty references and mentor endorsements.",
  },
  {
    id: "personal-statement",
    label: "Personal statements",
    description: "Essays, statements of purpose, and research proposals.",
  },
  {
    id: "other",
    label: "Other supporting documents",
    description: "Resumes and additional application materials.",
  },
];

export const DOCUMENT_STATUSES: Array<{
  id: DocumentStatus;
  label: string;
}> = [
  { id: "uploaded", label: "Uploaded" },
  { id: "pending-verification", label: "Pending Verification" },
  { id: "verified", label: "Verified" },
  { id: "expired", label: "Expired" },
];

export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Map([
  ["pdf", "application/pdf"],
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
]);

export function validateDocumentFile(file: File): string | null {
  const extension = file.name.split(".").at(-1)?.toLowerCase();
  const expectedType = extension ? ACCEPTED_TYPES.get(extension) : undefined;
  if (
    !expectedType ||
    (file.type !== "" && file.type !== expectedType)
  ) {
    return "Choose a PDF, JPG, JPEG, or PNG file.";
  }
  if (file.size === 0) return "The selected file is empty.";
  if (file.size > MAX_DOCUMENT_SIZE) {
    return "Files must be 10 MB or smaller.";
  }
  return null;
}

export async function validateDocumentFileContent(file: File): Promise<string | null> {
  const validationError = validateDocumentFile(file);
  if (validationError) return validationError;

  try {
    const bytes = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
    const extension = file.name.split(".").at(-1)?.toLowerCase();
    const isPdf =
      extension === "pdf" &&
      Array.from(bytes).some(
        (_, index) =>
          index <= bytes.length - 5 &&
          bytes[index] === 0x25 &&
          bytes[index + 1] === 0x50 &&
          bytes[index + 2] === 0x44 &&
          bytes[index + 3] === 0x46 &&
          bytes[index + 4] === 0x2d,
      );
    const isJpeg =
      (extension === "jpg" || extension === "jpeg") &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff;
    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const isPng =
      extension === "png" &&
      pngSignature.every((byte, index) => bytes[index] === byte);

    return isPdf || isJpeg || isPng
      ? null
      : "The file content does not match its filename. Choose a valid PDF, JPG, JPEG, or PNG file.";
  } catch {
    return "The selected file could not be read. Choose another PDF or image.";
  }
}

export function getDocumentMimeType(file: File): string {
  const extension = file.name.split(".").at(-1)?.toLowerCase();
  return extension ? ACCEPTED_TYPES.get(extension) ?? "" : "";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function effectiveDocumentStatus(
  document: VaultDocument,
  now = new Date(),
): DocumentStatus {
  if (
    document.status !== "expired" &&
    document.expiresAt &&
    document.expiresAt < now.toISOString().slice(0, 10)
  ) {
    return "expired";
  }
  return document.status;
}

function categoryMatchesRequired(
  category: DocumentCategory,
  requiredName: string,
): boolean {
  const name = requiredName.toLowerCase();
  if (/transcript|marksheet|academic record/.test(name))
    return category === "transcript";
  if (/recommendation|reference letter/.test(name))
    return category === "recommendation";
  if (/statement|essay|sop|personal impact/.test(name))
    return category === "personal-statement";
  if (/income|financial|household/.test(name)) return category === "income";
  if (/identity|photo id|government id/.test(name))
    return category === "identity";
  if (/category|caste|community/.test(name))
    return category === "category-certificate";
  return false;
}

export function documentMatchesRequirement(
  document: VaultDocument,
  requiredName: string,
): boolean {
  if (categoryMatchesRequired(document.category, requiredName)) return true;
  const normalizedDocument = document.name
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\.[^.]+$/, "");
  const words = requiredName
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);
  return words.length > 0 && words.every((word) => normalizedDocument.includes(word));
}

export function getApplicationDocumentReadiness(
  scholarship: Scholarship,
  documents: VaultDocument[],
  applicationId: string,
  now = new Date(),
) {
  const attached = documents.filter(
    (document) =>
      document.associatedApplicationIds.includes(applicationId) &&
      effectiveDocumentStatus(document, now) !== "expired",
  );
  const ready = scholarship.requiredDocuments.filter((requiredName) =>
    attached.some((document) =>
      documentMatchesRequirement(document, requiredName),
    ),
  );
  return {
    attached,
    ready,
    missing: scholarship.requiredDocuments.filter(
      (requiredName) => !ready.includes(requiredName),
    ),
  };
}

export function calculateDocumentMetrics(
  documents: VaultDocument[],
  now = new Date(),
) {
  const availableCategories = new Set(
    documents
      .filter(
        (document) => effectiveDocumentStatus(document, now) !== "expired",
      )
      .map((document) => document.category),
  );
  const pendingVerification = documents.filter(
    (document) =>
      effectiveDocumentStatus(document, now) === "pending-verification",
  ).length;
  const missing = DOCUMENT_CATEGORIES.length - availableCategories.size;
  return {
    total: documents.length,
    uploaded: documents.filter(
      (document) => effectiveDocumentStatus(document, now) !== "expired",
    ).length,
    missing,
    pendingVerification,
    completion: Math.round(
      (availableCategories.size / DOCUMENT_CATEGORIES.length) * 100,
    ),
  };
}
