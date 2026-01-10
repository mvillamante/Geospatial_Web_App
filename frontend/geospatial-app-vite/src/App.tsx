import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { 
  MainLayout, LandingPage,
  EvacCenterPage, PrepGuidePage,
  CmsPage, DashboardPage, ReportsMgmtPage, SysMonitoringPage, UserMgmtPage,
  AlertsMapPage, ProfilePage, 
  DashboardMapPage, ReportVerifyPage
} from "./components";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />  

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

          {/* LGU Officer Routes - Protected */}
          <Route path="officer" element={<Navigate to="officer/dashboard-map" replace />} />
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
            path="officer/evac-center" 
            element={
              <ProtectedRoute allowedRoles={["Officer"]}>
                <EvacCenterPage />
              </ProtectedRoute>
            } 
          />
          <Route path="officer/profile" element={<ProfilePage />} />

          {/* Researcher Routes - Protected */}
          <Route path="researcher" element={<Navigate to="researcher/dashboard-map" replace />} />
          <Route 
            path="researcher/dashboard-map" 
            element={
              <ProtectedRoute allowedRoles={["Researcher"]}>
                <DashboardMapPage />
              </ProtectedRoute>
            } 
          />
          <Route path="researcher/profile" element={<ProfilePage />} />

          {/* Citizen Routes */}
          <Route path="citizen" element={<Navigate to="citizen/alerts-map" replace />} />
          <Route path="citizen/alerts-map" element={<AlertsMapPage />} />
          <Route path="citizen/evac-center" element={<EvacCenterPage />} />
          <Route path="citizen/prep-guide" element={<PrepGuidePage />} />
          <Route path="citizen/profile" element={<ProfilePage />} />

          {/* Guest Routes */}
          <Route path="guest" element={<Navigate to="guest/alerts-map" replace />} />
          <Route path="guest/alerts-map" element={<AlertsMapPage />} />
          <Route path="guest/evac-center" element={<EvacCenterPage />} />
          <Route path="guest/prep-guide" element={<PrepGuidePage />} />
        </Route>

      </Routes>
    </Router>
  );
}

export default App;
