import { FiX } from "react-icons/fi";
import { useEffect } from "react";

const PrivacyModal = ({ onClose }) => {
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
                        <div className="modal-title">Privacy Policy</div>
                        <button className="modal-close" onClick={onClose}>
                            <FiX size={20} />
                        </button>
                    </div>

                    <div className="modal-body">

                        <p>
                            HazSpot respects your privacy and protects your personal
                            information in compliance with the Philippine Data Privacy
                            Act of 2012 (Republic Act No. 10173). This notice applies
                            to all users including residents of Cabuyao City,
                            CDRRMO officials, researchers, and general visitors.
                        </p>

                        <h3>1. Data Controller</h3>
                        <p>
                            The data controller responsible for your personal information is
                            the <strong>HazSpot Development Team</strong>, Noela Mae Andosay, Vince Joseph Arbutante, John Wilbert Laiño, and  Michaella Villamante. You may reach us at{" "}
                            <strong>hazspot@gmail.com</strong>.
                        </p>

                        <h3>2. Personal Data We Collect</h3>
                        <p><strong>Account Registration Data</strong></p>
                        <ul>
                            <li>Full name</li>
                            <li>Email address and/or mobile phone number</li>
                            <li>Password (stored in encrypted form)</li>
                            <li>Barangay ID (for Cabuyao resident verification)</li>
                        </ul>
                        <p><strong>User-Submitted Content</strong></p>
                        <ul>
                            <li>Incident and hazard reports including descriptions and categories</li>
                            <li>Photographs and images attached to reports</li>
                            <li>Location or address data associated with reports</li>
                        </ul>
                        <p><strong>Technical and Usage Data</strong></p>
                        <ul>
                            <li>Device type and browser information</li>
                            <li>IP address and access timestamps</li>
                            <li>Platform usage patterns and interactions</li>
                        </ul>

                        <h3>3. How We Use Your Data</h3>
                        <ul>
                            <li>To create and manage your user account</li>
                            <li>To verify the identity of citizens and visitors</li>
                            <li>To process and display community hazard and incident reports</li>
                            <li>To ensure platform security and enforce the Terms of Service</li>
                            <li>To send service-related notifications</li>
                        </ul>

                        <h3>4. Legal Basis for Processing</h3>
                        <ul>
                            <li><strong>Consent</strong> — You have given explicit consent when registering and using the platform</li>
                            <li><strong>Legitimate interests</strong> — Processing is necessary for platform safety and community service delivery</li>
                            <li><strong>Compliance with legal obligations</strong> — As required by applicable Philippine laws and regulations</li>
                            <li><strong>Public interest</strong> — Supporting disaster preparedness and sustainability as a community platform</li>
                        </ul>

                        <h3>5. Data Sharing and Disclosure</h3>
                        <p>
                            HazSpot does not sell your personal data to third parties.
                            We may share your data in the following limited circumstances:
                        </p>
                        <ul>
                            <li>With LGU and CDRRMO officials of Cabuyao City, as necessary to act on hazard and incident reports</li>
                            <li>With cloud service providers hosting the platform (Vercel and Render) solely for operational purposes</li>
                            <li>With law enforcement or government authorities when required by Philippine law or a valid legal process</li>
                        </ul>
                        <p>
                            User-submitted reports, photos, and community feed posts will be reviewed and may be
                            publicly visible to all users and visitors of the platform.
                            Please exercise caution when submitting content that may
                            identify you or others.
                        </p>

                        <h3>6. Data Retention</h3>
                        <p>
                            We retain your personal data for as long as your account is
                            active or as necessary to provide services. You may request
                            deletion of your account and associated data at any time by
                            contacting <strong>hazspot12@gmail.com</strong>. Certain
                            anonymized records may be retained for research and archival
                            purposes in accordance with applicable laws.
                        </p>

                        <h3>7. Data Security</h3>
                        <ul>
                            <li>Password encryption using secure hashing algorithms</li>
                            <li>Cloud-based infrastructure with access controls and security configurations</li>
                            <li>Role-based access for LGU and CDRRMO verified accounts</li>
                            <li>Regular review of security practices by the development team</li>
                        </ul>
                        <p>
                            In the event of a data breach that affects your rights and
                            freedoms, we will notify affected users and the National Privacy
                            Commission (NPC) as required by law.
                        </p>

                        <h3>8. Your Rights as a Data Subject</h3>
                        <ul>
                            <li><strong>Right to be Informed</strong> — Know how your data is collected and used</li>
                            <li><strong>Right to Access</strong> — Request a copy of the personal data we hold about you</li>
                            <li><strong>Right to Rectification</strong> — Request correction of inaccurate or incomplete data</li>
                            <li><strong>Right to Erasure</strong> — Request deletion of your personal data, subject to legal limitations</li>
                            <li><strong>Right to Object</strong> — Object to processing of your data under certain circumstances</li>
                            <li><strong>Right to Data Portability</strong> — Request a copy of your data in a structured, machine-readable format</li>
                            <li><strong>Right to File a Complaint</strong> — Lodge a complaint with the National Privacy Commission (NPC) at www.privacy.gov.ph</li>
                        </ul>

                        <h3>9. Cookies and Tracking Technologies</h3>
                        <p>
                            HazSpot may use cookies and similar technologies to improve
                            user experience, maintain session states, and analyze platform
                            usage. You may manage cookie preferences through your browser
                            settings. Disabling certain cookies may affect platform
                            functionality.
                        </p>

                        <h3>10. Children's Privacy</h3>
                        <p>
                            HazSpot is not intended for use by individuals under 13 years
                            of age. We do not knowingly collect personal data from children.
                            If we become aware that a child has provided personal data
                            without parental consent, we will take steps to delete such
                            information promptly.
                        </p>

                        <h3>11. Changes to This Privacy Notice</h3>
                        <p>
                            We may update this Data Privacy Notice from time to time to
                            reflect changes in our practices or applicable laws. We will
                            notify registered users of significant changes via email or
                            platform notification.
                        </p>

                        <h3>12. Contact and Complaints</h3>
                        <p>
                            For questions or data privacy requests, contact:<br />
                            Email: <strong>hazspot12@gmail.com</strong><br />
                        </p>
                        <p>
                            You also have the right to lodge a complaint with the{" "}
                            <strong>National Privacy Commission (NPC)</strong> of the
                            Philippines.<br />
                            Website: <strong>www.privacy.gov.ph</strong><br />
                            Email: <strong>info@privacy.gov.ph</strong>
                        </p>

                    </div>

                </div>
            </div>
        </div>
    );
};

export default PrivacyModal;