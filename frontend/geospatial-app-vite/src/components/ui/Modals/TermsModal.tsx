import { FiX } from "react-icons/fi";
import { useEffect } from "react";

const TermsModal = ({ onClose }) => {
    useEffect(() => {
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = "auto";
        };
    }, []);
    return (
        <div className="termsprivacy-modal-wrapper">
            <div
                className="modal-overlay"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        onClose();
                    }
                }}
            >
                <div
                    className="modal-content"
                    onClick={(e) => e.stopPropagation()}
                >

                    <div className="modal-header">
                        <div className="modal-title">Terms of Service</div>
                        <button className="modal-close" onClick={onClose}>
                            <FiX size={20} />
                        </button>
                    </div>

                    <div className="modal-body">

                        <p>
                            Welcome to HazSpot, a community-centered web platform developed by
                            students of Mapua Malayan Colleges Laguna. By accessing or
                            using HazSpot, you agree to be bound by these Terms of
                            Service. If you do not agree to these terms, please do not
                            use the platform.
                        </p>
                        <p>
                            <strong>Effective Date: March 2026</strong>
                        </p>

                        <h3>1. Introduction and Acceptance of Terms</h3>
                        <p>
                            HazSpot is designed to support the residents of Cabuyao City,
                            Local Government Unit (LGU) officials, CDRRMO personnel, and
                            researchers in understanding hazard risks, strengthening
                            disaster preparedness, and supporting local sustainability
                            initiatives.
                        </p>

                        <h3>2. Eligibility and User Accounts</h3>
                        <p><strong>Who May Use HazSpot</strong></p>
                        <ul>
                            <li>Residents of Cabuyao City</li>
                            <li>LGU and CDRRMO officials of Cabuyao City</li>
                            <li>Researchers and academics</li>
                            <li>General public and visitors (limited access)</li>
                        </ul>
                        <p><strong>Account Registration</strong></p>
                        <p>
                            Users may register using a valid email address and password,
                            or a mobile phone number for those without an email. LGU and
                            CDRRMO officials are  registered through a verified
                            account process to access official features of the platform.
                        </p>
                        <p><strong>Account Responsibilities</strong></p>
                        <p>
                            You are responsible for maintaining the confidentiality of
                            your account credentials. You agree to immediately notify
                            HazSpot of any unauthorized use of your account at{" "}
                            <strong>hazspot12@gmail.com</strong>.
                        </p>

                        <h3>3. Platform Features and Permitted Use</h3>
                        <p>HazSpot provides the following core features:</p>
                        <ul>
                            <li><strong>Community Reporting</strong> — Submit incident and hazard reports with photos and location data</li>
                            <li><strong>Geospatial Dashboard Map and Visualization</strong> — Access the Green Index, Hazard Index, and Calamity Risk Likelihood indicators for Cabuyao City</li>
                            <li><strong>Community Feed</strong> — View and stay updated about CDRRMO announcements and advisories</li>
                        </ul>
                        <p>
                            You agree to use these features only for lawful,
                            community-benefit purposes consistent with disaster
                            preparedness, environmental awareness, and public safety.
                        </p>

                        <h3>4. Prohibited Conduct</h3>
                        <p>The following actions are strictly prohibited on HazSpot:</p>
                        <ul>
                            <li>Submitting false, misleading, or fabricated incident or hazard reports</li>
                            <li>Impersonating LGU officials, CDRRMO personnel, or any other individual or organization</li>
                            <li>Sending spam, unsolicited messages, or repetitive irrelevant content</li>
                            <li>Uploading content that is defamatory, offensive, discriminatory, or violates applicable law</li>
                            <li>Attempting to gain unauthorized access to any part of the platform or other users' accounts</li>
                            <li>Using the platform for commercial solicitation without prior written consent</li>
                            <li>Interfering with or disrupting the integrity or performance of the platform</li>
                        </ul>
                        <p>
                            Violations may result in suspension or permanent removal of
                            your account, and may be reported to appropriate authorities
                            where required by law.
                        </p>

                        <h3>5. User-Generated Content</h3>
                        <p>
                            By submitting reports, photos, or posts on HazSpot,
                            you grant the HazSpot team
                            a non-exclusive, royalty-free license to use, display, and
                            distribute your content for platform purposes, including
                            disaster risk communication and research.
                        </p>
                        <p>
                            All user-submitted content will be reviewed and may be published publicly to all users
                            and visitors of the platform. You are solely responsible for
                            the content you submit. Do not submit content that includes
                            sensitive personal information of others without their consent.
                        </p>

                        <h3>6. Intellectual Property</h3>
                        <p>
                            All platform content, design elements, software, and data
                            visualizations on HazSpot — excluding user-generated content —
                            are the intellectual property of the HazSpot development team
                            and Mapua Malayan Colleges Laguna. You may not reproduce,
                            distribute, or create derivative works without prior written
                            permission.
                        </p>

                        <h3>7. Disclaimers and Limitation of Liability</h3>
                        <p>
                            HazSpot is a student-developed academic platform intended to
                            support community awareness and preparedness. The information
                            presented on HazSpot, including hazard maps, risk indices, and
                            community reports, is provided for informational purposes only
                            and does not constitute official government advisories or
                            emergency directives.
                        </p>
                        <p>
                            HazSpot shall not be held
                            liable for any damages arising from reliance on platform
                            content, inaccurate user-submitted reports, or service
                            interruptions. Always follow official guidance from CDRRMO
                            and relevant government authorities during emergencies.
                        </p>

                        <h3>8. Service Availability and Modifications</h3>
                        <p>
                            HazSpot is provided on an "as-is" basis. The development team
                            reserves the right to modify, suspend, or discontinue any
                            feature or the entire platform at any time, with or without
                            notice. We will make reasonable efforts to inform registered
                            users of significant changes.
                        </p>

                        <h3>9. Governing Law</h3>
                        <p>
                            These Terms of Service shall be governed by the laws of the
                            Republic of the Philippines, including Republic Act No. 10173
                            (Data Privacy Act of 2012) and other applicable regulations.
                        </p>

                        <h3>10. Contact Us</h3>
                        <p>
                            For questions, concerns, or reports of violations regarding
                            these Terms of Service, please contact us at:<br />
                            Email: <strong>hazspot12@gmail.com</strong><br />
                        </p>

                    </div>

                </div>
            </div>
        </div>
    );
};

export default TermsModal;