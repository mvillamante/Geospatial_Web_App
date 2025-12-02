import React from "react";
import { FaUser, FaChartBar, FaUniversity } from "react-icons/fa";
import "../styles/landingpage.css";

const LandingPage = () => {
  return (
    <div className="landing-page">
      <div className="bg-animation">
        <div className="orb orb1"></div>
        <div className="orb orb2"></div>
      </div>
      {/* navigation */}
      <div className="content">
        <nav className="nav">
          <div className="logo">
            <div className="logo-icon"></div>
            <span>HazSpot</span>
          </div>
          <div className="nav-links">
            <a href="#home">Home</a>
            <a href="#about">About</a>
            <a href="#howitworks">How It Works</a>
            <a href="#contact">Contact</a>
          </div>
          <div className="nav-buttons">
            <button className="btn btn-outline" onClick={() => alert("Login functionality")}>Login</button>
            <button className="btn btn-outline" onClick={() => alert("Sign up functionality")}>Sign Up</button>
          </div>
        </nav>
      
      {/* hero */}
        <section className="hero">
          <h1>Mapping Community <span className="highlight-red">Resilience</span><br />for a <span className="highlight-blue">Safer</span> Future</h1>
          <p>
            A community-centered platform for understanding hazard risk, strengthening disaster preparedness, and supporting local sustainability initiatives.
          </p>
          <div className="cta-group">
            <button className="btn btn-primary" onClick={() => alert("Get started functionality")}>Get Started</button>
            <button className="btn btn-secondary" onClick={() => alert("Explore the Map")}>Explore the Map</button>
          </div>

          <div className="dashboard-preview">
            <div className="dashboard-header">
              <div class="dashboard-title">Live Hazard Map</div>
            </div>
          </div>
      
      {/* about */}
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
        <section id="howitworks"
          style={{
            background: "linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(239, 68, 68, 0.03))",
          }}
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
        <footer class="footer">
          <div class="footer-bottom">
            © Copyright 2024. All Rights Reserved by HazSpot
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
