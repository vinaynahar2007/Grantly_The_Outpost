import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { ToastProvider } from "@/context/ToastContext";
import { StudentDataProvider } from "@/context/StudentDataContext";
import { DocumentVaultProvider } from "@/context/DocumentVaultContext";
import {
  DashboardPage,
  ExplorePage,
  EligibilityPage,
  SavedPage,
  ApplicationsPage,
  DocumentsPage,
  CalendarPage,
  ProfilePage,
  ScholarshipDetailPage,
} from "@/pages";

export function AppRoutes() {
  return (
    <ToastProvider>
      <StudentDataProvider>
        <DocumentVaultProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/eligibility" element={<EligibilityPage />} />
              <Route path="/saved" element={<SavedPage />} />
              <Route path="/applications" element={<ApplicationsPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/scholarships/:scholarshipId" element={<ScholarshipDetailPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
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
