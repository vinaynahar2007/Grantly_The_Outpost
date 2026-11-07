import {
  lazy,
  Suspense,
  type ComponentType,
  type LazyExoticComponent,
} from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { ToastProvider } from "@/context/ToastContext";
import { StudentDataProvider } from "@/context/StudentDataContext";
import { DocumentVaultProvider } from "@/context/DocumentVaultContext";
type PageComponent = ComponentType | LazyExoticComponent<ComponentType>;

export interface AppRoutePages {
  ApplicationsPage: PageComponent;
  CalendarPage: PageComponent;
  DashboardPage: PageComponent;
  DocumentsPage: PageComponent;
  EligibilityPage: PageComponent;
  ExplorePage: PageComponent;
  ProfilePage: PageComponent;
  SavedPage: PageComponent;
  ScholarshipDetailPage: PageComponent;
}

const lazyRoutePages: AppRoutePages = {
  DashboardPage: lazy(() =>
    import("@/pages/DashboardPage").then((module) => ({
      default: module.DashboardPage,
    })),
  ),
  ExplorePage: lazy(() =>
    import("@/pages/ExplorePage").then((module) => ({
      default: module.ExplorePage,
    })),
  ),
  EligibilityPage: lazy(() =>
    import("@/pages/EligibilityPage").then((module) => ({
      default: module.EligibilityPage,
    })),
  ),
  SavedPage: lazy(() =>
    import("@/pages/SavedPage").then((module) => ({
      default: module.SavedPage,
    })),
  ),
  ApplicationsPage: lazy(() =>
    import("@/pages/ApplicationsPage").then((module) => ({
      default: module.ApplicationsPage,
    })),
  ),
  DocumentsPage: lazy(() =>
    import("@/pages/DocumentsPage").then((module) => ({
      default: module.DocumentsPage,
    })),
  ),
  CalendarPage: lazy(() =>
    import("@/pages/CalendarPage").then((module) => ({
      default: module.CalendarPage,
    })),
  ),
  ProfilePage: lazy(() =>
    import("@/pages/ProfilePage").then((module) => ({
      default: module.ProfilePage,
    })),
  ),
  ScholarshipDetailPage: lazy(() =>
    import("@/pages/ScholarshipDetailPage").then((module) => ({
      default: module.ScholarshipDetailPage,
    })),
  ),
};

function RouteLoadingFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-[40vh] animate-pulse rounded-2xl border border-[#E2E8F0] bg-white p-6"
    >
      <span className="sr-only">Loading page</span>
      <div className="h-7 w-48 rounded-lg bg-[#F1F4F9]" />
      <div className="mt-4 h-4 max-w-xl rounded bg-[#F1F4F9]" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="h-36 rounded-xl bg-[#F8F9FC]" />
        <div className="h-36 rounded-xl bg-[#F8F9FC]" />
      </div>
    </div>
  );
}

export function AppRoutes({
  pages = lazyRoutePages,
}: {
  pages?: AppRoutePages;
} = {}) {
  return (
    <ToastProvider>
      <StudentDataProvider>
        <DocumentVaultProvider>
          <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<pages.DashboardPage />} />
                <Route path="/explore" element={<pages.ExplorePage />} />
                <Route path="/eligibility" element={<pages.EligibilityPage />} />
                <Route path="/saved" element={<pages.SavedPage />} />
                <Route path="/applications" element={<pages.ApplicationsPage />} />
                <Route path="/documents" element={<pages.DocumentsPage />} />
                <Route path="/calendar" element={<pages.CalendarPage />} />
                <Route path="/profile" element={<pages.ProfilePage />} />
                <Route
                  path="/scholarships/:scholarshipId"
                  element={<pages.ScholarshipDetailPage />}
                />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </DocumentVaultProvider>
      </StudentDataProvider>
    </ToastProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
