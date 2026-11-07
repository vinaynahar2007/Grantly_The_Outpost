import { AppRoutes as RoutedAppRoutes, type AppRoutePages } from "@/App";
import {
  ApplicationsPage,
  CalendarPage,
  DashboardPage,
  DocumentsPage,
  EligibilityPage,
  ExplorePage,
  ProfilePage,
  SavedPage,
  ScholarshipDetailPage,
} from "@/pages";

const eagerPages: AppRoutePages = {
  ApplicationsPage,
  CalendarPage,
  DashboardPage,
  DocumentsPage,
  EligibilityPage,
  ExplorePage,
  ProfilePage,
  SavedPage,
  ScholarshipDetailPage,
};

export function AppRoutes() {
  return <RoutedAppRoutes pages={eagerPages} />;
}
