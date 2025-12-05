import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainLayout from "./components/pages/MainLayout";
import LandingPage from './components/pages/LandingPage';
import DashboardPage from "./components/pages/DashboardPage";
import './App.css';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />  
        <Route path="/mainlayout" element={<MainLayout />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </Router>
  );
}

export default App;
