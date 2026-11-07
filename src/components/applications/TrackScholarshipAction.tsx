import { Link } from "react-router-dom";
import { ArrowUpRight, FolderPlus } from "lucide-react";
import { useStudentData } from "@/context/StudentDataContext";
import { findActiveApplication } from "@/utils/applicationLogic";
import type { Scholarship } from "@/types";

export function TrackScholarshipAction({
  scholarship,
}: {
  scholarship: Scholarship;
}) {
  const { applications, startApplication } = useStudentData();
  const tracked =
    findActiveApplication(applications, scholarship.id) ??
    applications.find((app) => app.scholarshipId === scholarship.id);
  return (
    <div className="mt-3 border-t border-border-subtle pt-3">
      {tracked ? (
        <Link
          to={`/applications?application=${encodeURIComponent(tracked.id)}`}
          aria-label={`View tracked application for ${scholarship.title}`}
          className="inline-flex min-h-8 items-center gap-1.5 text-[11px] font-medium text-violet-700 hover:underline"
        >
          <ArrowUpRight size={13} aria-hidden="true" />
          View in your tracker
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => startApplication(scholarship.id)}
          aria-label={`Track application for ${scholarship.title}`}
          className="inline-flex min-h-8 items-center gap-1.5 text-[11px] font-medium text-violet-700 hover:underline"
        >
          <FolderPlus size={13} aria-hidden="true" />
          Add to application tracker
        </button>
      )}
    </div>
  );
}
