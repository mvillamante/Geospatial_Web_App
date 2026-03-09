import React, { useState } from "react";
import AuthModal, { type AuthModalType } from "../components/ui/Modals/AuthModal";
import TermsModal from "../components/ui/Modals/TermsModal";
import PrivacyModal from "../components/ui/Modals/PrivacyModal";
import ResearcherRequestModal from "../components/ui/Modals/ResearcherRequestModal";
import { FaMapMarkerAlt, FaBell, FaShieldAlt } from "react-icons/fa";
import "./PWAView.css";

type ModalType = AuthModalType | "researcherRequest" | "terms" | "privacy" | null;

interface PWAViewProps {
  setModalType: (type: ModalType) => void;
  modalType: ModalType;
  closeModal: () => void;
  switchModal: (type: AuthModalType) => void;
}

/* ---------------------------
   Onboarding Slides
---------------------------- */

const onboardingSlides = [
  {
    icon: <FaMapMarkerAlt size={48} />,
    title: "Report Hazards",
    description:
      "Instantly report incidents and hazards in your community to keep everyone safe.",
    color: "#ef4444",
  },
  {
    icon: <FaBell size={48} />,
    title: "Real-Time Alerts",
    description:
      "Get notified about hazards near you and stay ahead of potential disasters.",
    color: "#3b82f6",
  },
  {
    icon: <FaShieldAlt size={48} />,
    title: "Stay Prepared",
    description:
      "Find evacuation centers, track community reports, and make informed decisions.",
    color: "#10b981",
  },
];

/* ---------------------------
   Component
---------------------------- */

const PWAView: React.FC<PWAViewProps> = ({
  setModalType,
  modalType,
  closeModal,
  switchModal,
}) => {
  const [slideIndex, setSlideIndex] = useState(0);
  const [showAuth, setShowAuth] = useState(false);

  const slide = onboardingSlides[slideIndex];

  /* Next slide */
  const handleNext = () => {
    if (slideIndex < onboardingSlides.length - 1) {
      setSlideIndex((prev) => prev + 1);
    } else {
      setShowAuth(true);
    }
  };

  /* Skip onboarding */
  const handleSkip = () => {
    setShowAuth(true);
  };

  return (
    <div className="landing-page pwa-view">
      {/* ---------------------------
         Modals
      ---------------------------- */}

      {modalType === "terms" && <TermsModal onClose={closeModal} />}
      {modalType === "privacy" && <PrivacyModal onClose={closeModal} />}
      {modalType === "researcherRequest" && (
        <ResearcherRequestModal onClose={closeModal} />
      )}

      {modalType &&
        ["login", "signup", "forgotPassword", "verifyOtp", "resetPassword"].includes(
          modalType
        ) && (
          <AuthModal
            type={modalType as AuthModalType}
            onClose={closeModal}
            switchModal={switchModal}
            openTerms={() => setModalType("terms")}
            openPrivacy={() => setModalType("privacy")}
          />
        )}

      {/* ---------------------------
         ONBOARDING
      ---------------------------- */}

      {!showAuth ? (
        <div className="pwa-slide-wrapper">
          {/* Logo */}
          <div className="logo-area">
            <img src="/hazspot-logo(2).png" alt="HazSpot" />
          </div>

          {/* Slide Content */}
          <div className="slide-content">
            <div
              className="icon-circle"
              style={{ background: `${slide.color}20`, color: slide.color }}
            >
              {slide.icon}
            </div>

            <h2 className="slide-title">{slide.title}</h2>
            <p className="slide-desc">{slide.description}</p>
          </div>

          {/* Slide Indicators */}
          <div className="dots">
            {onboardingSlides.map((_, i) => (
              <div
                key={i}
                onClick={() => setSlideIndex(i)}
                className={i === slideIndex ? "active" : ""}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="actions">
            <button className="btnPrimary" onClick={handleNext}>
              {slideIndex < onboardingSlides.length - 1
                ? "Next"
                : "Get Started"}
            </button>

            {slideIndex < onboardingSlides.length - 1 && (
              <button className="btnSkip" onClick={handleSkip}>
                Skip
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ---------------------------
           AUTH SCREEN
        ---------------------------- */

        <div className="auth-wrapper">
          {/* Logo */}
          <div className="logo-area">
            <img src="/hazspot-logo(2).png" alt="HazSpot" />
          </div>

          {/* Auth Card */}
          <div className="auth-card">
            <h2 className="auth-title">Welcome to HazSpot</h2>

            <p className="auth-subtitle">
              Community-driven hazard mapping for a safer future.
            </p>

            <button
              className="btnPrimary"
              onClick={() => setModalType("login")}
            >
              Login
            </button>

            <button
              className="btnOutline"
              onClick={() => setModalType("signup")}
            >
              Create Account
            </button>

            <button
              className="btnGhost"
              onClick={() => setModalType("researcherRequest")}
            >
              Request Researcher Access
            </button>
          </div>

          {/* Footer Links */}
          <div className="footer-links">
            <button
              className="footer-btn"
              onClick={() => setModalType("terms")}
            >
              Terms
            </button>

            <button
              className="footer-btn"
              onClick={() => setModalType("privacy")}
            >
              Privacy
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PWAView;