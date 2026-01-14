import React, { useState, useEffect } from "react";
import { AiOutlineClose } from "react-icons/ai";
import { useNavigate } from "react-router-dom";
import "./AuthModal.css";

const AuthModal = ({ type = "login", onClose, switchModal }) => {
    const userRole = "Citizen"; // !!! manual user role for testing muna

    // For debugging
    console.log("Navigation Role (AuthModal):", userRole);

    const navigate = useNavigate();
    const [loginPhone, setLoginPhone] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [signupFirstName, setSignupFirstName] = useState("");
    const [signupLastName, setSignupLastName] = useState("");
    const [signupPhone, setSignupPhone] = useState("");
    const [signupEmail, setSignupEmail] = useState("");
    const [signupPassword, setSignupPassword] = useState("");
    const [signupConfirm, setSignupConfirm] = useState("");
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = "auto";
        };
    }, []);


    const handleLogin = () => {
        if (!loginPhone || !loginPassword) return alert("Please fill in all fields");
        alert("Login successful!");
        onClose();

        switch (userRole) {
            case "Admin":
                navigate("/main/admin/dashboard", { replace: true });
                break;
            case "Officer":
                navigate("/main/officer/dashboard-map", { replace: true });
                break;
            case "Citizen":
                if (isMobile) {
                    navigate("/main/citizen-pwa/landing-page", { replace: true });
                } else {
                    navigate("/main/citizen/alerts-map", { replace: true });
                }
                break;
            default:
                navigate("/main/guest/alerts-map", { replace: true });
        }
    }

    const handleSignup = () => {
        if (!signupFirstName || !signupLastName || !signupPhone || !signupEmail || !signupPassword || !signupConfirm)
            return alert("Please fill in all fields");

        if (signupPassword !== signupConfirm) return alert("Passwords do not match");

        alert("Account created successfully!");
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className={`modal-content ${type === "signup" ? "modal-signup" : ""}`}
                onClick={(e) => e.stopPropagation()}
            >
                <button className="modal-close" onClick={onClose}>
                    <AiOutlineClose size={24} />
                </button>


                {type === "login" ? (
                    <>
                        <div className="modal-header">
                            <h2>Welcome Back</h2>
                            <p>Sign in to access your account</p>
                        </div>
                        <div className="modal-form">
                            <div className="form-group">
                                <label>Phone Number</label>
                                <input
                                    type="text"
                                    value={loginPhone}
                                    onChange={(e) => setLoginPhone(e.target.value)}
                                    placeholder="Enter phone number"
                                />
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <input
                                    type="password"
                                    value={loginPassword}
                                    onChange={(e) => setLoginPassword(e.target.value)}
                                    placeholder="Enter password"
                                />
                            </div>
                            <button className="btn-submit" onClick={handleLogin}>Login</button>
                        </div>
                        <div className="modal-footer">
                            <a>Dont have an account? <span className="link" onClick={() => switchModal("signup")}>Sign Up</span></a>
                        </div>
                    </>
                ) : (
                    // Signup
                    <>
                        <div className="modal-header">
                            <h2>Sign Up</h2>
                            <p>Create your account to get started</p>
                        </div>
                        <div className="modal-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>First Name</label>
                                    <input
                                        type="text"
                                        value={signupFirstName}
                                        onChange={(e) => setSignupFirstName(e.target.value)}
                                        placeholder="Enter first name"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Last Name</label>
                                    <input
                                        type="text"
                                        value={signupLastName}
                                        onChange={(e) => setSignupLastName(e.target.value)}
                                        placeholder="Enter last name"
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Phone Number</label>
                                    <input
                                        type="text"
                                        value={signupPhone}
                                        onChange={(e) => setSignupPhone(e.target.value)}
                                        placeholder="Enter phone number" />
                                </div>
                                <div className="form-group">
                                    <label>Email Address</label>
                                    <input
                                        type="email"
                                        value={signupEmail}
                                        onChange={(e) => setSignupEmail(e.target.value)}
                                        placeholder="Enter email" />
                                </div>
                            </div>


                            <div className="form-group">
                                <label>Password</label>
                                <input
                                    type="password"
                                    value={signupPassword}
                                    onChange={(e) => setSignupPassword(e.target.value)}
                                    placeholder="Enter password"
                                />
                            </div>
                            <div className="form-group">
                                <label>Confirm Password</label>
                                <input
                                    type="password"
                                    value={signupConfirm}
                                    onChange={(e) => setSignupConfirm(e.target.value)}
                                    placeholder="Confirm password"
                                />
                            </div>
                            <button className="btn-submit" onClick={handleSignup}>Create Account</button>
                        </div>
                        <div className="modal-footer">
                            <a>Already have an account? <span className="link" onClick={() => switchModal("login")}>Sign in</span></a>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AuthModal;