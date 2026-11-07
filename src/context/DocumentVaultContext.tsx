import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { storageService } from "@/services/storageService";
import { documentStorage } from "@/services/documentStorage";
import type {
  DocumentCategory,
  DocumentStatus,
  VaultDocument,
} from "@/types";
import {
  DOCUMENT_CATEGORIES,
  getDocumentMimeType,
  MAX_DOCUMENT_SIZE,
  validateDocumentFileContent,
} from "@/utils/documentLogic";

const DOCUMENTS_KEY = "vault_documents";

interface DocumentVaultContextValue {
  documents: VaultDocument[];
  addDocument: (
    file: File,
    category: DocumentCategory,
  ) => Promise<VaultDocument>;
  replaceDocument: (documentId: string, file: File) => Promise<VaultDocument>;
  deleteDocument: (documentId: string) => Promise<void>;
  updateDocument: (
    documentId: string,
    updates: { status?: DocumentStatus; expiresAt?: string | null },
  ) => void;
  setApplicationAssociation: (
    documentId: string,
    applicationId: string,
    associated: boolean,
  ) => void;
}

const DocumentVaultContext =
  createContext<DocumentVaultContextValue | null>(null);

function isVaultDocument(value: unknown): value is VaultDocument {
  if (!value || typeof value !== "object") return false;
  const document = value as Partial<VaultDocument>;
  const validMimeTypes = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
  ]);
  const validExpiry =
    document.expiresAt === null ||
    (typeof document.expiresAt === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(document.expiresAt) &&
      Number.isFinite(Date.parse(`${document.expiresAt}T00:00:00Z`)) &&
      new Date(`${document.expiresAt}T00:00:00Z`)
        .toISOString()
        .startsWith(document.expiresAt));
  return (
    typeof document.id === "string" &&
    document.id.length > 0 &&
    typeof document.name === "string" &&
    document.name.trim().length > 0 &&
    document.name.length <= 255 &&
    DOCUMENT_CATEGORIES.some((category) => category.id === document.category) &&
    typeof document.mimeType === "string" &&
    validMimeTypes.has(document.mimeType) &&
    typeof document.size === "number" &&
    Number.isSafeInteger(document.size) &&
    document.size > 0 &&
    document.size <= MAX_DOCUMENT_SIZE &&
    typeof document.updatedAt === "string" &&
    Number.isFinite(Date.parse(document.updatedAt)) &&
    ["uploaded", "pending-verification", "verified", "expired"].includes(
      document.status ?? "",
    ) &&
    validExpiry &&
    Array.isArray(document.associatedApplicationIds) &&
    document.associatedApplicationIds.every(
      (applicationId) => typeof applicationId === "string",
    )
  );
}

function loadDocuments(): VaultDocument[] {
  const stored = storageService.get<unknown>(DOCUMENTS_KEY, []);
  return Array.isArray(stored) ? stored.filter(isVaultDocument) : [];
}

function createDocumentId(): string {
  return `doc-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

export function DocumentVaultProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [documents, setDocuments] = useState(loadDocuments);
  const documentsRef = useRef(documents);
  documentsRef.current = documents;

  const commitDocuments = useCallback((next: VaultDocument[]) => {
    if (!storageService.set(DOCUMENTS_KEY, next)) {
      throw new Error(
        "Document details could not be saved in browser storage. Check available storage space and try again.",
      );
    }
    documentsRef.current = next;
    setDocuments(next);
  }, []);

  const addDocument = useCallback(
    async (file: File, category: DocumentCategory) => {
      const validationError = await validateDocumentFileContent(file);
      if (validationError) throw new Error(validationError);
      const document: VaultDocument = {
        id: createDocumentId(),
        name: file.name,
        category,
        mimeType: getDocumentMimeType(file),
        size: file.size,
        updatedAt: new Date().toISOString(),
        status: "uploaded",
        expiresAt: null,
        associatedApplicationIds: [],
      };
      await documentStorage.put(document.id, file);
      try {
        commitDocuments([document, ...documentsRef.current]);
      } catch (error) {
        try {
          await documentStorage.delete(document.id);
        } catch {
          throw new Error(
            "Document details could not be saved, and temporary file cleanup failed. The file may remain in browser-local storage.",
          );
        }
        throw error;
      }
      return document;
    },
    [commitDocuments],
  );

  const replaceDocument = useCallback(
    async (documentId: string, file: File) => {
      const validationError = await validateDocumentFileContent(file);
      if (validationError) throw new Error(validationError);
      const current = documentsRef.current.find(
        (document) => document.id === documentId,
      );
      if (!current) throw new Error("This document is no longer available.");

      const previousFile = await documentStorage.get(documentId);
      await documentStorage.put(documentId, file);
      const updated: VaultDocument = {
        ...current,
        name: file.name,
        mimeType: getDocumentMimeType(file),
        size: file.size,
        updatedAt: new Date().toISOString(),
        status: "uploaded",
        expiresAt: null,
      };
      try {
        commitDocuments(
          documentsRef.current.map((document) =>
            document.id === documentId ? updated : document,
          ),
        );
      } catch (error) {
        try {
          if (previousFile) await documentStorage.put(documentId, previousFile);
          else await documentStorage.delete(documentId);
        } catch {
          throw new Error(
            "Document details could not be saved, and the previous file could not be restored. Please check the document before continuing.",
          );
        }
        throw error;
      }
      return updated;
    },
    [commitDocuments],
  );

  const deleteDocument = useCallback(
    async (documentId: string) => {
      const current = documentsRef.current.find(
        (document) => document.id === documentId,
      );
      if (!current) throw new Error("This document is no longer available.");
      const previousFile = await documentStorage.get(documentId);
      await documentStorage.delete(documentId);
      try {
        commitDocuments(
          documentsRef.current.filter((document) => document.id !== documentId),
        );
      } catch (error) {
        if (previousFile) {
          try {
            await documentStorage.put(documentId, previousFile);
          } catch {
            throw new Error(
              "Document details could not be saved, and the deleted file could not be restored.",
            );
          }
        }
        throw error;
      }
    },
    [commitDocuments],
  );

  const updateDocument = useCallback(
    (
      documentId: string,
      updates: { status?: DocumentStatus; expiresAt?: string | null },
    ) => {
      const next = documentsRef.current.map((document) =>
        document.id === documentId
          ? { ...document, ...updates, updatedAt: new Date().toISOString() }
          : document,
      );
      commitDocuments(next);
    },
    [commitDocuments],
  );

  const setApplicationAssociation = useCallback(
    (documentId: string, applicationId: string, associated: boolean) => {
      const next = documentsRef.current.map((document) => {
        if (document.id !== documentId) return document;
        const associations = new Set(document.associatedApplicationIds);
        if (associated) associations.add(applicationId);
        else associations.delete(applicationId);
        return {
          ...document,
          associatedApplicationIds: [...associations],
          updatedAt: new Date().toISOString(),
        };
      });
      commitDocuments(next);
    },
    [commitDocuments],
  );

  const value = useMemo(
    () => ({
      documents,
      addDocument,
      replaceDocument,
      deleteDocument,
      updateDocument,
      setApplicationAssociation,
    }),
    [
      documents,
      addDocument,
      replaceDocument,
      deleteDocument,
      updateDocument,
      setApplicationAssociation,
    ],
  );

  return (
    <DocumentVaultContext.Provider value={value}>
      {children}
    </DocumentVaultContext.Provider>
  );
}

export function useDocumentVault(): DocumentVaultContextValue {
  const context = useContext(DocumentVaultContext);
  if (!context) {
    throw new Error("useDocumentVault must be used within a DocumentVaultProvider");
  }
  return context;
}
