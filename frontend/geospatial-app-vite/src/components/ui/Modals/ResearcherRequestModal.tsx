import React, { useState } from "react";
import "./ResearcherRequestModal.css";

interface Props {
  onClose: () => void;
}

const API_URL = import.meta.env.VITE_API_URL;

const ResearcherRequestModal: React.FC<Props> = ({ onClose }) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [institution, setInstitution] = useState("");
  const [purpose, setPurpose] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName || !lastName || !email || !institution || !purpose) {
      alert("Please complete all required fields.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("first_name", firstName);
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
        alert("Researcher request submitted successfully.");
        onClose();
      } else {
        alert("Error submitting request: " + JSON.stringify(data));
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred.");
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

          <form className="researcher-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>First Name *</label>
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Last Name *</label>
              <input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Institution / Organization *</label>
              <input
                type="text"
                placeholder="Institution / Organization"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Research Purpose *</label>
              <textarea
                placeholder="Research Purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Proof of Affiliation (Optional)</label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setProofFile(e.target.files ? e.target.files[0] : null)}
              />
              <small>Upload school/company ID or endorsement letter (optional).</small>
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