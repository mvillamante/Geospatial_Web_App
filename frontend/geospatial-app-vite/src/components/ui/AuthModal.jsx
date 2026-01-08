import React, { useState, useEffect } from "react";
import { AiOutlineClose } from "react-icons/ai";
import { useNavigate } from "react-router-dom";
import { login, signup } from "../../lib/auth";
import { fetchCurrentUser } from "../../lib/fetchCurrentUser";
import "./AuthModal.css";

const AuthModal = ({ type = "login", onClose, switchModal }) => {
    //const userRole = "Admin"; // !!! manual user role for testing muna

    // For debugging
    //console.log("Navigation Role (AuthModal):", userRole);

    const navigate = useNavigate();
    const [loginInput, setLoginInput] = useState("");  // Either email or phone
    const [loginPassword, setLoginPassword] = useState("");
    const [signupFirstName, setSignupFirstName] = useState("");
    const [signupLastName, setSignupLastName] = useState("");
    const [signupPhone, setSignupPhone] = useState("");
    const [signupEmail, setSignupEmail] = useState("");
    const [signupPassword, setSignupPassword] = useState("");
    const [signupConfirm, setSignupConfirm] = useState("");

    const [userRole, setUserRole] = useState("");

    useEffect(() => {
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = "auto";
        };
    }, []);

    const navigateByRole = (role) => {
        switch (role) {
            case "Admin":
                navigate("/main/admin/dashboard", { replace: true });
                break;
            case "Officer":
                navigate("/main/officer/dashboard-map", { replace: true });
                break;
            case "Researcher":
                navigate("/main/researcher/alerts-map", { replace: true });
                break;
            case "Citizen":
                navigate("/main/citizen/alerts-map", { replace: true });
                break;
            default:
                navigate("/main/guest/alerts-map", { replace: true });
        }
    };

    // ===== LOGIN =====
    const handleLogin = async () => {
        if (!loginInput || !loginPassword) return alert("Please fill in all fields");

        const data = {
            username_or_phone: loginInput,  // Either email or phone number
            password: loginPassword,
        };

        try {
            const response = await fetch("http://localhost:8000/api/login_user/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();
            if (response.ok) {
                alert("Login successful!");
                setUserRole(result.role);

                localStorage.setItem("access_token", result.access_token);
                onClose();
                
                // Redirect to user dashboard or page based on their role
                navigateByRole(result.role);
            } else {
                alert(result.error);
            }
        } catch (error) {
            alert("Login failed: " + error.message);
        }
    };

    const formatName = (firstName, lastName) =>
    `${firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()}.${
        lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase()
    }`;

    // ===== SIGNUP =====
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

            //@here
            console.log("Signup password in authmodal:", signupPassword);
            console.log("Confirm password in authmodal:", signupConfirm);

            const response = await fetch('http://localhost:8000/api/sign_up/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            const data = await response.json();

            if (response.ok) {
                console.log(data.user); 
                alert(data.message); 

                localStorage.setItem("access_token", data.access_token);
                onClose();

                // Redirect to user dashboard or page based on their role
                navigateByRole(result.role);
            } else {
                console.error("Signup error response:", data);
                alert(data.error || "Signup failed.");
            }
        } catch (error) {
            console.error(error);
            alert("Signup failed: " + error.message);
        }
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
                                <label>Phone Number or Email</label>
                                <input
                                    type="text"
                                    value={loginInput}
                                    onChange={(e) => setLoginInput(e.target.value)}
                                    placeholder="Enter phone number or email"
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