import React, { useState, useEffect } from "react";
import { AiOutlineClose } from "react-icons/ai";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { saveUserSession } from "../../libr/auth";
import { normalizePrimaryRole, normalizeSecondaryRole, roleToBasePath } from "../../utils/roles";
import "./AuthModal.css";
import type { User } from "../../libr/fetchCurrentUser";

const AuthModal = ({ type = "login", onClose, switchModal }) => {
    const navigate = useNavigate();
    const { refreshUser } = useAuth();

    const [loginInput, setLoginInput] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [signupFirstName, setSignupFirstName] = useState("");
    const [signupLastName, setSignupLastName] = useState("");
    const [signupPhone, setSignupPhone] = useState("");
    const [signupEmail, setSignupEmail] = useState("");
    const [signupPassword, setSignupPassword] = useState("");
    const [signupConfirm, setSignupConfirm] = useState("");
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = "auto"; };
    }, []);

    const handleNavigation = (user: User) => {
        if (!user) return;

        const primaryRole = normalizePrimaryRole(user.role);
        const secondaryRole = normalizeSecondaryRole(primaryRole, user.extra_roles?.[0]);

        // Use primary if it exists, otherwise secondary (like Researcher)
        const roleForNavigation = primaryRole || secondaryRole ;
        console.log("Navigating to role:", roleForNavigation); //@here

        navigate(roleToBasePath(roleForNavigation), { replace: true });
    };

    const handleLogin = async () => {
        if (!loginInput || !loginPassword) return alert("Please fill in all fields");

        try {
            const response = await fetch("http://localhost:8000/api/login_user/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username_or_phone: loginInput,
                    password: loginPassword,
                }),
            });

            const result = await response.json();
            if (!response.ok) {
                alert(result.error);
                return;
            }

            saveUserSession(result.user, result.access_token);
            console.log("Login successful:", result);
            await refreshUser();
            onClose();
            handleNavigation(result.user);

        } catch (error) {
            alert("Login failed: " + error.message);
        }
    };

    const formatName = (firstName, lastName) =>
        `${firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()}.${
            lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase()
        }`;

    const handleSignup = async () => {
        if (!signupFirstName || !signupLastName || !signupPhone || !signupEmail || !signupPassword || !signupConfirm) {
            return alert("Please fill in all required fields.");
        }
        if (signupPassword !== signupConfirm) {
            return alert("Passwords do not match.");
        }

        try {
            const userData = {
                username: formatName(signupFirstName, signupLastName),
                first_name: signupFirstName,
                last_name: signupLastName,
                phone: signupPhone,
                email: signupEmail,
                password: signupPassword,
                role: "citizen",
            };

            const response = await fetch('http://localhost:8000/api/sign_up/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
            });

            const data = await response.json();
            if (response.ok) {
                alert(data.message); 
                saveUserSession(data.user, data.access_token);
                await refreshUser();
                onClose();
                handleNavigation(data.user);
            } else {
                alert(data.error || "Signup failed.");
            }
        } catch (error) {
            alert("Signup failed: " + error.message);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className={`modal-content ${type === "signup" ? "modal-signup" : ""}`} onClick={(e) => e.stopPropagation()}>
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
                                <label>Phone Number or Email</label>
                                <input type="text" value={loginInput} onChange={(e) => setLoginInput(e.target.value)} placeholder="Enter phone number or email" />
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Enter password" />
                            </div>
                            <button className="btn-submit" onClick={handleLogin}>Login</button>
                        </div>
                        <div className="modal-footer">
                            <p>Don't have an account? <span className="link" onClick={() => switchModal("signup")}>Sign Up</span></p>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="modal-header">
                            <h2>Sign Up</h2>
                            <p>Create your account to get started</p>
                        </div>
                        <div className="modal-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>First Name</label>
                                    <input type="text" value={signupFirstName} onChange={(e) => setSignupFirstName(e.target.value)} placeholder="First Name" />
                                </div>
                                <div className="form-group">
                                    <label>Last Name</label>
                                    <input type="text" value={signupLastName} onChange={(e) => setSignupLastName(e.target.value)} placeholder="Last Name" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Phone Number</label>
                                    <input type="text" value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)} placeholder="Phone Number" />
                                </div>
                                <div className="form-group">
                                    <label>Email Address</label>
                                    <input type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="Email" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <input type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder="Password" />
                            </div>
                            <div className="form-group">
                                <label>Confirm Password</label>
                                <input type="password" value={signupConfirm} onChange={(e) => setSignupConfirm(e.target.value)} placeholder="Confirm Password" />
                            </div>
                            <button className="btn-submit" onClick={handleSignup}>Create Account</button>
                        </div>
                        <div className="modal-footer">
                            <p>Already have an account? <span className="link" onClick={() => switchModal("login")}>Sign in</span></p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AuthModal;