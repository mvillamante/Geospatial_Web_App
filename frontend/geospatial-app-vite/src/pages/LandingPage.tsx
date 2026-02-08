import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUser, FaChartBar, FaUniversity } from "react-icons/fa";
import "./LandingPage.css";
import { useAuth } from "../context/AuthContext";
import { getUserRoleAndDisplayName } from "../libr/auth";
import AuthModal from "../components/ui/Modals/AuthModal";
import LeafletMap from "../components/ui/LeafletMap";

type LandingStats = {
  activeHazards: number;
  criticalAlerts: number;
  reportsToday: number;
  avgResponseTimeMinutes: number;
};

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth(); // Get current user from context

  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState<"login" | "signup" | "forgotPassword" | "verifyOtp" | null>(null);
  const [activeSection, setActiveSection] = useState("home");

  const closeModal = () => setModalType(null);
  const switchModal = (type: "login" | "signup" | "forgotPassword" | "verifyOtp") => setModalType(type);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  useEffect(() => {
    const sections = ["home", "about", "howitworks"];

    const handleScroll = () => {
      const navHeight = 64; // your fixed navbar height

      let bestId = "home";
      let bestDistance = Number.POSITIVE_INFINITY;

      for (const id of sections) {
        const el = document.getElementById(id);
        if (!el) continue;

        // distance of section top from under the navbar
        const distance = Math.abs(el.getBoundingClientRect().top - navHeight);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestId = id;
        }
      }

      setActiveSection(bestId);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const fetchLandingStats = async () => {
      try {
        const res = await fetch(
          `/api/public/landing-page/`
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

  // Show loading until auth is fetched
  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  const { userRole, userRole2 } = getUserRoleAndDisplayName();

  return (
    <div
      id="home"
      className={`landing-page ${modalType ? "modal-open" : ""}`}
    >
      {modalType && (
        <AuthModal
          type={modalType}
          onClose={closeModal}
          switchModal={switchModal}
        />
      )}


      {/* Navigation */}
      <div className="content">
        <nav className="nav">
          <div className="logo">
            <img
              src="/hazspot-logo.png"
              alt="HazSpot Logo"
              className="logo-img"
            />
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
              <LeafletMap height="600px" />
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
            <p className="about-text"
              style={{
                fontSize: "1rem",
                lineHeight: "1.8",
                color: "#64748b",
              }}
            >
              HazSpot is a comprehensive disaster management platform that delivers real-time risk insights by combining citizen reporting, advanced analytics, and predictive modeling. It empowers local government units to enhance disaster mitigation strategies. Our mission is to transform how communities prepare for, respond to, and recover from disasters through technology-driven collaboration and data-informed decision-making.
            </p>
          </div>
        </section>

        {/* how it works */}
        <section id="howitworks"
        >
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
                Submit hazard reports with photos and GPS location directly from your phone. Receive
                real-time alerts about dangers in your area, locate nearby evacuation centers, and
                access safety checklists. Track the status of your reports and stay informed about
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
            © Copyright 2024. All Rights Reserved by HazSpot
          </div>
        </footer>
      </div>
    </div >
  );
};

export default LandingPage;