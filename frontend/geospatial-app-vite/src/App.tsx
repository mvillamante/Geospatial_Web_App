import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { 
  MainLayout, LandingPage,
  EvacCenterPage, PrepGuidePage,
  CmsPage, DashboardPage, ReportsMgmtPage, SysMonitoringPage, UserMgmtPage,
  AlertsMapPage, ProfilePage, 
  DashboardMapPage, ReportVerifyPage,
  PwaLandingPage, PwaAuthPage
 } from "./components";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} /> 
        {/* PWA Routes  */}
        {/* <Route path="/" element={<PwaLandingPage />} /> */}

        {/* Main Layout */}
        <Route path="/main" element={<MainLayout />}>
        <Route path="/main/:role/profile" element={<ProfilePage />} />

          {/* Admin Route */}
          <Route path="admin" element={<Navigate to="admin/dashboard" replace />} />
          <Route path="admin/dashboard" element={<DashboardPage />} />
          <Route path="admin/manage-user" element={<UserMgmtPage />} />
          <Route path="admin/manage-reports" element={<ReportsMgmtPage />} />
          <Route path="admin/system-monitoring" element={<SysMonitoringPage />} />
          <Route path="admin/cms" element={<CmsPage />} />

          {/* LGU Officer Route */}
          <Route path="officer" element={<Navigate to="officer/dashboard-map" replace />} />
          <Route path="officer/dashboard-map" element={<DashboardMapPage />} />
          <Route path="officer/report-verify" element={<ReportVerifyPage />} />
          <Route path="officer/evac-center" element={<EvacCenterPage />} />
          <Route path="officer/profile" element={<ProfilePage />} />

          {/* Researcher Route */}
          <Route path="researcher" element={<Navigate to="researcher/dashboard-map" replace />} />
          <Route path="researcher/dashboard-map" element={<DashboardMapPage />} />
          <Route path="researcher/profile" element={<ProfilePage />} />

          {/* Citizen Route */}
          <Route path="citizen" element={<Navigate to="citizen/alerts-map" replace />} />
          <Route path="citizen/alerts-map" element={<AlertsMapPage />} />
          <Route path="citizen/evac-center" element={<EvacCenterPage />} />
          <Route path="citizen/prep-guide" element={<PrepGuidePage />} />
          <Route path="citizen/profile" element={<ProfilePage />} />

          <Route path="citizen-pwa/login" element={<PwaAuthPage />} />

          {/* Guest Route */}
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
