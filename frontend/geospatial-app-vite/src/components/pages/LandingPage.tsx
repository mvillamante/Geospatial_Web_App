import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUser, FaChartBar, FaUniversity } from "react-icons/fa";
import "./LandingPage.css";
import { useAuth } from "../../utils/AuthContext";
import AuthModal from "../ui/AuthModal";
import LeafletMap from "../ui/LeafletMap";

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // Get current user from context
  const userRole = user?.role || "Guest";

  // For debugging
    console.log("Navigation Role (Landing):", userRole);

  const [modalType, setModalType] = useState<"login" | "signup" | null>(null);
  const [activeSection, setActiveSection] = useState("home");

  const closeModal = () => setModalType(null);
  const switchModal = (type: "login" | "signup") => setModalType(type);

  // Track scrolling for active nav links
  useEffect(() => {
    const handleScroll = () => {
      const sections = ["home", "about", "howitworks"];
      let current = "home";

      for (let id of sections) {
        const section = document.getElementById(id);
        if (section) {
          const rect = section.getBoundingClientRect();
          if (rect.top <= window.innerHeight / 2) {
            current = id;
          }
        }
      }

      setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div id="home" className={`landing-page ${modalType ? "modal-open" : ""}`}>
      {/* Auth Modal */}
      {modalType && (
        <AuthModal type={modalType} onClose={closeModal} switchModal={switchModal} />
      )}

      {/* Navigation */}
      <div className="content">
        <nav className="nav">
          <div className="logo">
            <div className="logo-icon"></div>
            <span>HazSpot</span>
          </div>

          <div className="nav-links">
            <a href="#home" className={activeSection === "home" ? "active" : ""}>Home</a>
            <a href="#about" className={activeSection === "about" ? "active" : ""}>About</a>
            <a href="#howitworks" className={activeSection === "howitworks" ? "active" : ""}>How It Works</a>
          </div>

          {/* Buttons: Login/Signup for guests, Dashboard for logged-in users */}
          <div className="nav-buttons">
            {user ? (
              <button
                className="btn btn-primary"
                onClick={() => navigate(`/main/${userRole.toLowerCase()}`, { replace: true })}
              >
                Dashboard
              </button>
            ) : (
              <>
                <button className="btn btn-outline blue" onClick={() => setModalType("login")}>Login</button>
                <button className="btn btn-outline" onClick={() => setModalType("signup")}>Sign Up</button>
              </>
            )}
          </div>
        </nav>

        {/* Hero Section */}
        <section className="hero">
          <h1>
            Mapping Community <span className="highlight-red">Resilience</span><br />
            for a <span className="highlight-blue">Safer</span> Future
          </h1>
          <p>
            A community-centered platform for understanding hazard risk, strengthening disaster preparedness, and supporting local sustainability initiatives.
          </p>
          <div className="cta-group">
            {!user && <button className="btn btn-primary" onClick={() => setModalType("login")}>Get Started</button>}
            <button className="btn btn-secondary" onClick={() => navigate("/main/guest/alerts-map", { replace: true })}>Explore the Map</button>
          </div>

          {/* Map Preview */}
          <div className="dashboard-preview">
            <div className="dashboard-header">
              <div className="dashboard-title">Live Hazard Map</div>
            </div>
            <div className="dashboard-map-container">
              <LeafletMap height="600px" />
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about">
          <div className="section-header">
            <h2>About <span className="highlight-blue">HazSpot</span></h2>
          </div>
          <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
            <p style={{ fontSize: "1.1rem", lineHeight: "1.8", color: "#64748b" }}>
              HazSpot is a comprehensive disaster management platform that delivers real-time risk insights by combining citizen reporting, advanced analytics, and predictive modeling. It empowers local government units to enhance disaster mitigation strategies. Our mission is to transform how communities prepare for, respond to, and recover from disasters through technology-driven collaboration and data-informed decision-making.
            </p>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="howitworks" style={{ background: "linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(239, 68, 68, 0.03))" }}>
          <div className="section-header">
            <h2>How <span className="highlight-red">It Works</span></h2>
            <p>See how each community member contributes to safety and preparedness</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon"><FaUser size={28} /></div>
              <h3>As a Citizen</h3>
              <p>Submit hazard reports, receive real-time alerts, locate evacuation centers, and track your reports.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><FaChartBar size={28} /></div>
              <h3>As a Researcher/Analyst</h3>
              <p>Access analytics dashboards, download datasets, view predictions, and analyze trends.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><FaUniversity size={28} /></div>
              <h3>As an LGU/Decision Maker</h3>
              <p>Monitor hazards, validate reports, manage evacuation data, and make informed decisions.</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer">
          <div className="footer-bottom">
            © Copyright 2024. All Rights Reserved by HazSpot
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;