import React, { useEffect, useState } from "react";
import "./ResearcherRequestModal.css";

interface Props {
  onClose: () => void;
}

const API_URL = import.meta.env.VITE_API_URL;

const ResearcherRequestModal: React.FC<Props> = ({ onClose }) => {
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [institution, setInstitution] = useState("");
  const [purpose, setPurpose] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const originalOverflow = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!firstName || !lastName || !email || !institution || !purpose) {
      setErrorMessage("Please complete all required fields before submitting.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("first_name", firstName);
      formData.append("middle_name", middleName);
      formData.append("last_name", lastName);
      formData.append("email", email);
      formData.append("orgSchool", institution);
      formData.append("purpose", purpose);
      if (proofFile) formData.append("attachment", proofFile);

      const response = await fetch(`${API_URL}/api/researcher/request/`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        onClose();
      } else {
        console.log("Backend error:", data);
        setErrorMessage("Error submitting request. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="researcher-modal-wrapper">
      <div className="researcher-overlay">
        <div className="researcher-modal">
          <button className="modal-close" onClick={onClose}>×</button>

          <h2>Researcher Access Request</h2>

          <p className="modal-description">
            Please fill out the form below to request Researcher access.
          </p>

          {errorMessage && (
            <div className="researcher-error-box" role="alert">
              {errorMessage}
            </div>
          )}

          <form className="researcher-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Last Name *</label>
              <input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>First Name *</label>
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Middle Name *</label>
              <input
                type="text"
                placeholder="Middle Name"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Institution / Organization *</label>
              <input
                type="text"
                placeholder="Institution / Organization"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Research Purpose *</label>
              <textarea
                placeholder="Research Purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={3}
                required
              />
            </div>

            <div className="form-group">
              <label>Proof of Affiliation (Optional)</label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setProofFile(e.target.files ? e.target.files[0] : null)}
              />
              <small>Upload school/company ID (optional).</small>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResearcherRequestModal;