import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "@/tests/testAppRoutes";
import { documentStorage } from "@/services/documentStorage";

const METADATA_KEY = "grantly_v1_vault_documents";

afterEach(() => {
  vi.restoreAllMocks();
});

function renderDocuments() {
  return render(
    <MemoryRouter initialEntries={["/documents"]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

function pdfFile(name = "semester-transcript.pdf", bytes = "document") {
  return new File([`%PDF-1.7\n${bytes}`], name, { type: "application/pdf" });
}

describe("Document Vault", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(documentStorage, "put").mockResolvedValue("doc-key");
    vi.spyOn(documentStorage, "get").mockResolvedValue(undefined);
    vi.spyOn(documentStorage, "delete").mockResolvedValue(undefined);
  });

  it("validates and stores uploads in IndexedDB with metadata in localStorage", async () => {
    const user = userEvent.setup();
    const page = renderDocuments();
    await user.click(screen.getByRole("button", { name: "Add document" }));
    const fileInput = screen.getByLabelText(
      "Choose a PDF, JPG, JPEG, or PNG document",
    );
    fireEvent.change(fileInput, {
      target: {
        files: [new File(["bad"], "notes.txt", { type: "text/plain" })],
      },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("PDF, JPG");

    fireEvent.change(fileInput, { target: { files: [pdfFile()] } });
    await user.click(
      screen.getByRole("button", { name: "Upload document" }),
    );
    await screen.findByText("semester-transcript.pdf");

    const metadata = JSON.parse(localStorage.getItem(METADATA_KEY) ?? "[]");
    expect(metadata).toHaveLength(1);
    expect(metadata[0]).toMatchObject({
      name: "semester-transcript.pdf",
      category: "transcript",
      mimeType: "application/pdf",
      size: pdfFile().size,
      status: "uploaded",
      associatedApplicationIds: [],
    });
    expect(documentStorage.put).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Document uploaded")).toBeInTheDocument();
    page.unmount();
    renderDocuments();
    expect(await screen.findByText("semester-transcript.pdf")).toBeInTheDocument();
  });

  it("replaces a file and removes its IndexedDB bytes and persisted metadata on delete", async () => {
    const user = userEvent.setup();
    renderDocuments();
    await user.click(screen.getByRole("button", { name: "Add document" }));
    fireEvent.change(
      screen.getByLabelText("Choose a PDF, JPG, JPEG, or PNG document"),
      { target: { files: [pdfFile()] } },
    );
    await user.click(
      screen.getByRole("button", { name: "Upload document" }),
    );
    await screen.findByText("semester-transcript.pdf");

    fireEvent.change(
      screen.getByLabelText("Choose replacement file for semester-transcript.pdf"),
      { target: { files: [pdfFile("new-transcript.pdf", "replacement")] } },
    );
    await screen.findByText("new-transcript.pdf");
    expect(
      JSON.parse(localStorage.getItem(METADATA_KEY) ?? "[]")[0].name,
    ).toBe("new-transcript.pdf");

    const deleteButton = screen.getAllByRole("button", { name: "Delete" })[0];
    await user.click(deleteButton);
    await user.click(screen.getByRole("button", { name: "Confirm delete" }));
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(METADATA_KEY) ?? "[]")).toEqual([]);
    });
    expect(documentStorage.put).toHaveBeenCalledTimes(2);
    expect(documentStorage.delete).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Document deleted")).toBeInTheDocument();
  });

  it("associates documents to tracked applications and reports real missing requirements", async () => {
    const user = userEvent.setup();
    renderDocuments();
    await user.click(screen.getByRole("button", { name: "Add document" }));
    fireEvent.change(
      screen.getByLabelText("Choose a PDF, JPG, JPEG, or PNG document"),
      { target: { files: [pdfFile()] } },
    );
    await user.click(
      screen.getByRole("button", { name: "Upload document" }),
    );
    await screen.findByText("semester-transcript.pdf");

    const association = screen.getByLabelText("Associate with application");
    const scholarshipOption = within(association).getByRole("option", {
      name: /Aarohan STEM Excellence Fellowship/,
    }) as HTMLOptionElement;
    await user.selectOptions(association, scholarshipOption.value);

    await waitFor(() => {
      expect(
        JSON.parse(localStorage.getItem(METADATA_KEY) ?? "[]")[0]
          .associatedApplicationIds,
      ).toContain(scholarshipOption.value);
    });
    const requirements = screen
      .getByRole("heading", { name: "Aarohan STEM Excellence Fellowship" })
      .closest(".rounded-2xl");
    expect(requirements).toHaveTextContent("1 of 3 required documents linked");
    expect(requirements).toHaveTextContent("Missing documents:");
    expect(requirements).toHaveTextContent("Official Semester Transcripts");
    expect(
      screen
        .getAllByRole("link", { name: "View tracker" })
        .find(
          (link) =>
            link.getAttribute("href") ===
            `/applications?application=${scholarshipOption.value}`,
        ),
    ).toBeInTheDocument();
  });

  it("shows a clear failure when browser file persistence fails", async () => {
    const user = userEvent.setup();
    vi.mocked(documentStorage.put).mockRejectedValueOnce(
      new Error("IndexedDB is unavailable in this browser."),
    );
    renderDocuments();
    await user.click(screen.getByRole("button", { name: "Add document" }));
    fireEvent.change(
      screen.getByLabelText("Choose a PDF, JPG, JPEG, or PNG document"),
      { target: { files: [pdfFile()] } },
    );
    await user.click(
      screen.getByRole("button", { name: "Upload document" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "IndexedDB is unavailable",
    );
    expect(localStorage.getItem(METADATA_KEY)).toBeNull();
    expect(screen.queryByText("Document uploaded")).not.toBeInTheDocument();
  });

  it("rejects content that only claims an allowed extension and MIME type", async () => {
    const user = userEvent.setup();
    renderDocuments();
    await user.click(screen.getByRole("button", { name: "Add document" }));
    fireEvent.change(
      screen.getByLabelText("Choose a PDF, JPG, JPEG, or PNG document"),
      {
        target: {
          files: [new File(["not a PDF"], "spoofed.pdf", { type: "application/pdf" })],
        },
      },
    );

    await user.click(screen.getByRole("button", { name: "Upload document" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "content does not match",
    );
    expect(documentStorage.put).not.toHaveBeenCalled();
    expect(localStorage.getItem(METADATA_KEY)).toBeNull();
    expect(screen.queryByText("Document uploaded")).not.toBeInTheDocument();
  });

  it("ignores malformed persisted document metadata without breaking the vault", () => {
    localStorage.setItem(
      METADATA_KEY,
      JSON.stringify([
        {
          id: "invalid",
          name: "spoofed.pdf",
          category: "transcript",
          mimeType: "application/pdf",
          size: Number.POSITIVE_INFINITY,
          updatedAt: "not-a-date",
          status: "uploaded",
          expiresAt: null,
          associatedApplicationIds: [],
        },
      ]),
    );

    renderDocuments();

    expect(screen.getByRole("heading", { name: "Document Vault" })).toBeInTheDocument();
    expect(screen.queryByText("spoofed.pdf")).not.toBeInTheDocument();
  });
});
