import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import {
  MainLayout, LandingPage,
  EvacCenterPage, CommunityFeedPage,
  CmsPage, DashboardPage, ReportsMgmtPage, SysMonitoringPage, UserMgmtPage,
  AlertsMapPage, ProfilePage, NotificationPage,
  DashboardMapPage, ReportVerifyPage,
  PwaAuthPage,
  HomePage, SettingsPage
} from "./pages";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { Toaster } from "sonner";
import { syncOfflineReports } from "./services/syncFallback";

const App: React.FC = () => {
  useEffect(() => {
    const handleOnline = () => {
      syncOfflineReports();
    };
    
    window.addEventListener("online", handleOnline);

    return () => window.removeEventListener("online", handleOnline);
  }, []);

  // useEffect(() => {
  //   const handleOnline = () => {
  //     const token = localStorage.getItem("access_token");
  //     if (!token) return;

  //     syncOfflineReports(import.meta.env.VITE_API_URL, token);
  //   };

  //   window.addEventListener("online", handleOnline);

  //   return () => window.removeEventListener("online", handleOnline);
  // }, []);

  return (
    <Router>
      <Toaster richColors position="top-right" toastOptions={{
        duration: 2000
      }} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        {/* PWA Routes  */}
        {/* <Route path="/" element={<PwaLandingPage />} /> */}

        {/* Main Layout */}
        <Route path="/main" element={<MainLayout />}>
          <Route path="/main/:role/profile" element={<ProfilePage />} />

          {/* Admin Routes - Protected */}
          <Route path="admin" element={<Navigate to="admin/dashboard" replace />} />
          <Route
            path="admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={["Admin"]}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/manage-user"
            element={
              <ProtectedRoute allowedRoles={["Admin"]}>
                <UserMgmtPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/manage-reports"
            element={
              <ProtectedRoute allowedRoles={["Admin"]}>
                <ReportsMgmtPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/system-monitoring"
            element={
              <ProtectedRoute allowedRoles={["Admin"]}>
                <SysMonitoringPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/cms"
            element={
              <ProtectedRoute allowedRoles={["Admin"]}>
                <CmsPage />
              </ProtectedRoute>
            }
          />
          <Route path="admin/settings" element={<SettingsPage />} />

          {/* LGU Officer Routes - Protected */}
          <Route path="officer" element={<Navigate to="officer/home" replace />} />

          <Route
            path="officer/home"
            element={
              <ProtectedRoute allowedRoles={["Officer"]}>
                <HomePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="officer/dashboard-map"
            element={
              <ProtectedRoute allowedRoles={["Officer"]}>
                <DashboardMapPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="officer/report-verify"
            element={
              <ProtectedRoute allowedRoles={["Officer"]}>
                <ReportVerifyPage />
              </ProtectedRoute>
            }
          />
          <Route 
            path="officer/notifications" 
            element={
              <ProtectedRoute allowedRoles={["Officer"]}>
                 <NotificationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="officer/evac-center"
            element={
              <ProtectedRoute allowedRoles={["Officer"]}>
                <EvacCenterPage />
              </ProtectedRoute>
            }
          />
          <Route path="officer/profile" element={<ProfilePage />} />
          <Route path="officer/settings" element={<SettingsPage />} />

          {/* Researcher Routes - Protected */}
          <Route path="researcher" element={<Navigate to="researcher/home" replace />} />

          <Route
            path="researcher/home"
            element={
              <ProtectedRoute allowedRoles={["Researcher"]}>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="researcher/dashboard-map"
            element={
              <ProtectedRoute allowedRoles={["Researcher"]}>
                <DashboardMapPage />
              </ProtectedRoute>
            }
          />
          <Route path="researcher/profile" element={<ProfilePage />} />
          <Route path="researcher/settings" element={<SettingsPage />} />

          {/* Citizen Routes */}
          <Route path="citizen" element={<Navigate to="citizen/community-feed" replace />} />
          <Route path="citizen/alerts-map" element={<AlertsMapPage />} />
          <Route path="citizen/evac-center" element={<EvacCenterPage />} />
          <Route path="citizen/community-feed" element={<CommunityFeedPage />} />
          <Route path="citizen/profile" element={<ProfilePage />} />
          <Route path="citizen/notifications" element={<NotificationPage />} />
          <Route path="citizen/settings" element={<SettingsPage />} />

          <Route path="citizen-pwa/login" element={<PwaAuthPage />} />

          {/* Guest Routes */}
          <Route path="guest" element={<Navigate to="guest/community-feed" replace />} />
          <Route path="guest/alerts-map" element={<AlertsMapPage />} />
          <Route path="guest/evac-center" element={<EvacCenterPage />} />
          <Route path="guest/community-feed" element={<CommunityFeedPage />} />

          <Route
            path="guest/profile"
            element={<Navigate to="/main/citizen-pwa/login" replace />}
          />

          <Route
            path="guest/notifications"
            element={<Navigate to="/main/citizen-pwa/login" replace />}
          />

        </Route>

      </Routes>
    </Router>
  );
}

export default App;
