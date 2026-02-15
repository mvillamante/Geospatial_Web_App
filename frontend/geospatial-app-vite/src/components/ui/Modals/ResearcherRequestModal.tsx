import React from "react";
import './ResearcherRequestModal.css';

interface Props {
    onClose: () => void;
}


// Dummy email
const email = "cdrrmo@example.com";

const emailTemplate = `Subject: Researcher Access Request - Hazspot

Good day,

I would like to formally request Researcher access to the Hazspot platform.

Full Name:
Institution / Organization:
Research Purpose:
Duration of Access:


Thank you for your time and consideration.

Sincerely,
[Your Name]
`;

const ResearcherRequestModal: React.FC<Props> = ({ onClose }) => {
    const handleCopy = () => {
        navigator.clipboard.writeText(emailTemplate);
        alert("Email template copied to clipboard.");
    };

    return (
        <div className="researcher-modal-wrapper">
            <div className="researcher-overlay">
                <div className="researcher-modal">
                    <button className="modal-close" onClick={onClose}>×</button>

                    <h2>Researcher Access Request</h2>

                    <p className="modal-description">
                        To gain Researcher/Analyst access, please submit a formal letter or email request
                        to the Cabuyao City Disaster Risk Reduction and Management Office (CDRRMO).
                    </p>

                    <div className="info-box">
                        <span className="info-label">Official email</span>
                        <span className="info-value">{email}</span>
                    </div>

                    <div className="requirements">
                        <h4>Include the following details:</h4>
                        <ul>
                            <li>Full Name</li>
                            <li>Institution / Organization</li>
                            <li>Research Purpose</li>
                            <li>Requested Duration of Access</li>
                        </ul>
                    </div>

                    <div className="modal-actions">
                        <button className="btn btn-outline" onClick={handleCopy}>
                            Copy Email Template
                        </button>
                        <a
                            href={`mailto:${email}?subject=Researcher Access Request - HazSpot Platform`}
                        >
                            <button className="btn btn-primary">
                                Send Email
                            </button>
                        </a>
                    </div>
                </div>
            </div>
        </div>

    );
};

export default ResearcherRequestModal;