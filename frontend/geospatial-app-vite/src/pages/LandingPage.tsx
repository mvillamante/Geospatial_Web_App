import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUser, FaChartBar, FaUniversity } from "react-icons/fa";
import "./LandingPage.css";
import { useAuth } from "../context/AuthContext";
// import { getUserRoleAndDisplayName } from "../libr/auth";
import AuthModal from "../components/ui/Modals/AuthModal";
import LeafletMap from "../components/ui/LeafletMap";
import ResearcherRequestModal from "../components/ui/Modals/ResearcherRequestModal";

const API_URL = import.meta.env.VITE_API_URL;

type AuthModalType = "login" | "signup" | "forgotPassword" | "verifyOtp";
type ModalType = AuthModalType | "researcherRequest" | null;

type LandingStats = {
  activeHazards: number;
  criticalAlerts: number;
  reportsToday: number;
  avgResponseTimeMinutes: number;
};

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth(); // Get current user from context

  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [activeSection, setActiveSection] = useState("home");

  const closeModal = () => setModalType(null);
  const switchModal = (type: "login" | "signup" | "forgotPassword" | "verifyOtp") => setModalType(type);

  const [stats, setStats] = useState<LandingStats | null>(null);


  // Fetch user info on mount
  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

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

  useEffect(() => {
    const fetchLandingStats = async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/public/landing-page/`
        );

        if (!res.ok) throw new Error("Failed to fetch landing stats");

        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error("Landing stats error:", err);
      }
    };

    fetchLandingStats();
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p className="loading-text">Loading...</p>
      </div>
    );
  }

  // ===== Get user role and display name from localStorage =====
  // const { userRole, userRole2 } = getUserRoleAndDisplayName();

  return (
    <div
      id="home"
      className={`landing-page ${modalType ? "modal-open" : ""}`}
    >
      {modalType &&
        modalType !== "researcherRequest" && (
          <AuthModal
            type={modalType}
            onClose={closeModal}
            switchModal={switchModal}
          />
        )}

      {modalType === "researcherRequest" && (
        <ResearcherRequestModal onClose={closeModal} />
      )}

      {/* Navigation */}
      <div className="content">
        <nav className="nav">
          <div className="logo">
            <div className="logo-icon">
              <img src="./hazspot-logo(2).png" alt="HazSpot logo" className="landing-logo-img" />
            </div>
            {/* <span>HazSpot</span> */}
          </div>
          <div className="nav-links">
            <a
              href="#home"
              className={activeSection === "home" ? "active" : ""}
            >
              Home
            </a>
            <a
              href="#about"
              className={activeSection === "about" ? "active" : ""}
            >
              About
            </a>
            <a
              href="#howitworks"
              className={activeSection === "howitworks" ? "active" : ""}
            >
              How It Works
            </a>
          </div>
          <div className="nav-buttons">
            <button className="btn btn-outline blue" onClick={() => setModalType("login")}>Login</button>
            <button className="btn btn-outline" onClick={() => setModalType("signup")}>Sign Up</button>
          </div>
        </nav>

        {/* Hero */}
        <section className="hero">
          <h1>Mapping Community <span className="highlight-red">Resilience</span><br />for a <span className="highlight-blue">Safer</span> Future</h1>
          <p>
            A community-centered platform for understanding hazard risk, strengthening disaster preparedness, and supporting local sustainability initiatives.
          </p>
          <div className="cta-group">
            <button className="btn btn-primary" onClick={() => setModalType("login")}>Get Started</button>
            <button className="btn btn-secondary" onClick={() => navigate("/main/guest/community-feed", { replace: true })}>Explore the Map</button>
          </div>

          <div className="dashboard-preview">
            <div className="dashboard-header">
              <div className="dashboard-title">Live Hazard Map</div>
            </div>

            <div className="dashboard-map-container">
              <LeafletMap />
            </div>

            {/* Stats Section */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Active Hazards</div>
                <div className="stat-value">
                  {stats ? stats.activeHazards : "—"}
                </div>
              </div>

              <div className="stat-card red">
                <div className="stat-label">Critical Alerts</div>
                <div className="stat-value">
                  {stats ? stats.criticalAlerts : "—"}
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-label">Reports Today</div>
                <div className="stat-value">
                  {stats ? stats.reportsToday : "—"}
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-label">Response Time</div>
                <div className="stat-value">
                  {stats ? `${stats.avgResponseTimeMinutes}m` : "—"}
                </div>
              </div>
            </div>
          </div>

          {/* About */}
        </section>
        <section id="about">
          <div className="section-header">
            <h2>About <span className="highlight-blue">HazSpot</span></h2>
          </div>
          <div
            style={{
              maxWidth: "900px",
              margin: "0 auto",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: "1.1rem",
                lineHeight: "1.8",
                color: "#64748b",
              }}
            >
              HazSpot is a comprehensive disaster management platform that delivers real-time risk insights by combining citizen reporting, advanced analytics, and predictive modeling. It empowers local government units to enhance disaster mitigation strategies. Our mission is to transform how communities prepare for, respond to, and recover from disasters through technology-driven collaboration and data-informed decision-making.
            </p>
          </div>
        </section>

        {/* how it works */}
        <section id="howitworks">
          <div className="section-header">
            <h2>
              How <span className="highlight-red">It Works</span>
            </h2>
            <p>See how each community member contributes to safety and preparedness</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <FaUser size={28} />
              </div>
              <h3>As a Citizen</h3>
              <p>
                Report incidents anytime and help your community informed. Receive
                real-time hazard alerts based on your area. Find the closest evacuation center and
                check Community Feed for official LGU updates. Track the status of your reports and stay informed about
                community safety.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <FaChartBar size={28} />
              </div>
              <h3>As a Researcher/Analyst</h3>
              <p>
                Access comprehensive analytics dashboards with exploratory data analysis tools.
                Monitor predictive model performance, download datasets for research, and view
                time-series predictions. Analyze trends, patterns, and correlations to improve
                disaster response strategies.
              </p>

              <button
                className="btn btn-outline researcher-btn"
                onClick={() => setModalType("researcherRequest")}
              >
                Request Researcher Access
              </button>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <FaUniversity size={28} />
              </div>
              <h3>As an LGU/Decision Maker</h3>
              <p>
                Monitor real-time hazard conditions through interactive maps, oversee the validation of community reports, and maintain evacuation center data. With built-in analytics tools, LGU administrators can make informed decisions that enhance public safety and strengthen coordinated disaster response efforts.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer">
          <div className="footer-bottom">
            © Copyright 2026. All Rights Reserved by HazSpot
          </div>
        </footer>
      </div>
    </div >
  );
};

export default LandingPage;