import { useMemo, useState } from "react";
import {
  Search,
  Bookmark,
  GraduationCap,
  ArrowUpRight,
  Plus,
  Check,
  CircleCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useStudentData } from "@/context/StudentDataContext";
import { Button } from "@/components/ui";
import { Dialog } from "@/components/ui/Dialog";
import { findActiveApplication } from "@/utils/applicationLogic";
import { formatINR } from "@/utils/dashboardLogic";
import { cn } from "@/utils/cn";

export function AddApplicationDialog({ onClose }: { onClose: () => void }) {
  const { scholarships, savedIds, applications, startApplication } =
    useStudentData();
  const [source, setSource] = useState<"saved" | "all">("saved");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState<"saved" | "preparing">("preparing");
  const items = useMemo(
    () =>
      scholarships.filter(
        (item) =>
          (source === "all" || savedIds.includes(item.id)) &&
          `${item.title} ${item.provider}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      ),
    [scholarships, savedIds, source, query],
  );
  return (
    <Dialog
      open
      title="Add an application"
      description="A new opportunity. A new step toward your future."
      onClose={onClose}
    >
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          if (selected && startApplication(selected, status)) onClose();
        }}
      >
        <div className="overflow-y-auto px-5 py-5 sm:px-7">
          <div
            role="group"
            aria-label="Scholarship source"
            className="flex gap-1 rounded-xl bg-canvas p-1"
          >
            {[
              {
                value: "saved" as const,
                label: "Saved scholarships",
                icon: Bookmark,
              },
              {
                value: "all" as const,
                label: "All scholarships",
                icon: GraduationCap,
              },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setSource(tab.value);
                  setSelected("");
                }}
                aria-pressed={source === tab.value}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-xs font-medium",
                  source === tab.value
                    ? "bg-white text-violet-700 shadow-xs"
                    : "text-navy-600 hover:text-navy-900",
                )}
              >
                <tab.icon size={15} aria-hidden="true" />
                {tab.label}
              </button>
            ))}
          </div>
          <label htmlFor="add-scholarship-search" className="sr-only">
            Search scholarships to add
          </label>
          <div className="relative mt-4">
            <Search
              className="pointer-events-none absolute top-3 left-3 size-4 text-navy-600"
              aria-hidden="true"
            />
            <input
              id="add-scholarship-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              type="search"
              placeholder="Find a scholarship..."
              className="h-10 w-full rounded-lg border border-border pr-3 pl-9 text-sm text-navy-900 focus:border-violet-400 focus:outline-none"
            />
          </div>
          <fieldset className="mt-4">
            <legend className="mb-2 text-[11px] font-semibold tracking-wide text-navy-600 uppercase">
              Choose an opportunity{" "}
              <span className="font-normal">({items.length})</span>
            </legend>
            <div className="max-h-[285px] space-y-2 overflow-y-auto pr-1">
              {items.map((item) => {
                const tracked = !!findActiveApplication(applications, item.id);
                return (
                  <label
                    key={item.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors",
                      selected === item.id
                        ? "border-violet-400 bg-violet-50/60"
                        : "border-border hover:bg-canvas",
                      tracked && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <input
                      type="radio"
                      name="selected-scholarship"
                      value={item.id}
                      checked={selected === item.id}
                      disabled={tracked}
                      onChange={() => setSelected(item.id)}
                      className="mt-1 size-4 shrink-0 accent-violet-700"
                      aria-label={item.title}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold leading-relaxed text-navy-900">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-[10px] text-navy-600">
                        {item.provider}
                      </span>
                      <span className="mt-1.5 block text-[11px] font-semibold text-violet-700">
                        {formatINR(item.amount)}{" "}
                        <span className="font-normal text-navy-600">
                          potential award
                        </span>
                      </span>
                    </span>
                    {tracked ? (
                      <span className="flex items-center gap-1 whitespace-nowrap text-[10px] text-navy-600">
                        <CircleCheck size={12} aria-hidden="true" />
                        Tracked
                      </span>
                    ) : selected === item.id ? (
                      <Check
                        className="mt-1 size-4 shrink-0 text-violet-700"
                        aria-hidden="true"
                      />
                    ) : null}
                  </label>
                );
              })}
              {items.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-7 text-center">
                  <Bookmark
                    className="mx-auto mb-2 size-6 text-violet-400"
                    aria-hidden="true"
                  />
                  <p className="text-sm font-semibold text-navy-900">
                    {query
                      ? "No scholarships found"
                      : "Your shortlist is a fresh start"}
                  </p>
                  <p className="mt-1 text-xs text-navy-600">
                    {query
                      ? "Try a different name or provider."
                      : "Pick from the full catalogue to get going."}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setSource("all");
                    }}
                    className="mt-3 text-xs font-semibold text-violet-700"
                  >
                    Browse all scholarships{" "}
                    <ArrowUpRight
                      className="inline size-3.5"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              )}
            </div>
          </fieldset>
          <fieldset className="mt-5 border-t border-border-subtle pt-4">
            <legend className="float-left mb-2 text-xs font-semibold text-navy-800">
              Start with
            </legend>
            <div className="clear-both flex gap-3">
              {["saved", "preparing"].map((value) => (
                <label
                  key={value}
                  className={cn(
                    "flex flex-1 cursor-pointer items-center gap-2 rounded-lg border px-3 py-3 text-xs font-medium",
                    status === value
                      ? "border-violet-300 bg-violet-50 text-violet-800"
                      : "border-border text-navy-600",
                  )}
                >
                  <input
                    type="radio"
                    name="initial-status"
                    value={value}
                    checked={status === value}
                    onChange={() => setStatus(value as "saved" | "preparing")}
                    className="size-3.5 accent-violet-700"
                  />
                  {value === "saved" ? "Saved" : "Preparing"}
                </label>
              ))}
            </div>
          </fieldset>
          <p className="mt-4 text-[11px] leading-relaxed text-navy-600">
            All scholarships are demonstration records. Adding one to your
            tracker does not submit an application to a provider.
          </p>
        </div>
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border-subtle px-5 py-4 sm:px-7">
          <Link
            to="/explore"
            className="text-xs font-medium text-navy-600 hover:text-violet-700"
          >
            Explore scholarships
          </Link>
          <div className="flex gap-2">
            <Button variant="secondary" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selected}
              leftIcon={<Plus size={16} aria-hidden="true" />}
            >
              Add application
            </Button>
          </div>
        </footer>
      </form>
    </Dialog>
  );
}
