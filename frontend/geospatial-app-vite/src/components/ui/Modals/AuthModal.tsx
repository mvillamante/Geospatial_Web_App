import { useState, useEffect } from "react";
import { AiOutlineClose, AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { saveUserSession } from "../../../libr/auth";
import { normalizePrimaryRole, normalizeSecondaryRole, roleToBasePath } from "../../../utils/roles";
import "./GlobalModal.css";
import type { User } from "../../../libr/fetchCurrentUser";
import { toast } from "sonner";

type AuthModalType =
    | "login"
    | "signup"
    | "forgotPassword"
    | "verifyOtp"
    | "resetPassword";

interface AuthModalProps {
    type?: AuthModalType;
    onClose: () => void;
    switchModal: (type: AuthModalType) => void;
    openTerms?: () => void;
    openPrivacy?: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({
    type = "login",
    onClose,
    switchModal,
    openTerms,
    openPrivacy
}) => {
    const API_URL = import.meta.env.VITE_API_URL;
    const navigate = useNavigate();
    const { refreshUser } = useAuth();

    const [loginLoading, setLoginLoading] = useState(false);
    const [signupLoading, setSignupLoading] = useState(false);

    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [showSignupPassword, setShowSignupPassword] = useState(false);
    const [showSignupConfirm, setShowSignupConfirm] = useState(false);
    // const [showResetPassword, setShowResetPassword] = useState(false);
    // const [showResetConfirm, setShowResetConfirm] = useState(false);

    const [resetTarget, setResetTarget] = useState("");
    const [otpValues, setOtpValues] = useState(["", "", "", "", " ", " "]);
    const [resetNewPass, setResetNewPass] = useState("");
    const [resetConfirmPass, setResetConfirmPass] = useState("");
    const [resetLoading, setResetLoading] = useState(false);

    const [resendTimer, setResendTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);

    const [loginInput, setLoginInput] = useState("");
    const [loginPassword, setLoginPassword] = useState("");

    const [signupFirstName, setSignupFirstName] = useState("");
    const [signupLastName, setSignupLastName] = useState("");
    const [signupPhone, setSignupPhone] = useState("");
    const [signupEmail, setSignupEmail] = useState("");
    const [signupPassword, setSignupPassword] = useState("");
    const [signupConfirm, setSignupConfirm] = useState("");
    const [agreeTerms, setAgreeTerms] = useState(false);

    /* ================= EFFECTS ================= */

    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;

        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, []);

    useEffect(() => {
        if (type === "verifyOtp" && resendTimer > 0) {
            const timer = setTimeout(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        }

        if (resendTimer === 0) setCanResend(true);
    }, [resendTimer, type]);

    /* ================= HELPERS ================= */

    const fullOtp = otpValues.join("");

    const maskEmailOrPhone = (value: string) => {
        if (!value.includes("@")) {
            return value.slice(0, 2) + "****" + value.slice(-2);
        }
        const [name, domain] = value.split("@");
        return name.slice(0, 2) + "****@" + domain;
    };

    const handleNavigation = (user: User) => {
        const primaryRole = normalizePrimaryRole(user.role);
        const secondaryRole = normalizeSecondaryRole(
            primaryRole,
            user.extra_roles?.[0]
        );
        const roleForNavigation = primaryRole || secondaryRole;
        navigate(roleToBasePath(roleForNavigation), { replace: true });
    };

    /* ================= LOGIN ================= */

    const handleLogin = async () => {
        if (!loginInput || !loginPassword)
            return alert("Please fill in all fields");

        try {
            setLoginLoading(true);

            const res = await fetch(`${API_URL}/api/login_user/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username_or_phone: loginInput,
                    password: loginPassword,
                }),
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error);

            saveUserSession(result.user, result.access_token);
            await refreshUser();
            onClose();
            handleNavigation(result.user);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoginLoading(false);
        }
    };

    /* ================= SIGNUP ================= */

    const handleSignup = async () => {
        if (!agreeTerms) {
            return toast.warning("You must agree to the Terms & Conditions and Privacy Policy.");
        }
        if (
            !signupFirstName ||
            !signupLastName ||
            !signupPhone ||
            !signupEmail ||
            !signupPassword ||
            !signupConfirm
        )
            return alert("Please fill in all required fields.");

        if (signupPassword !== signupConfirm)
            return alert("Passwords do not match.");

        try {
            setSignupLoading(true);

            const res = await fetch(`${API_URL}/api/sign_up/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: signupFirstName + "." + signupLastName,
                    first_name: signupFirstName,
                    last_name: signupLastName,
                    phone: signupPhone,
                    email: signupEmail,
                    password: signupPassword,
                    role: "citizen",
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            saveUserSession(data.user, data.access_token);
            await refreshUser();
            onClose();
            handleNavigation(data.user);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSignupLoading(false);
        }
    };

    /* ================= RESET FLOW ================= */

    const handleRequestOtp = async () => {
        if (!resetTarget.trim())
            return alert("Please enter your email or phone.");

        setResetLoading(true);

        const res = await fetch(`${API_URL}/api/password-reset/request/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email_or_phone: resetTarget.trim() }),
        });

        const data = await res.json();
        setResetLoading(false);

        if (!res.ok) return alert(data.detail);

        setResendTimer(60);
        setCanResend(false);
        switchModal("verifyOtp");
    };

    const handleVerifyOtp = async () => {
        if (fullOtp.length !== 6)
            return alert("Enter full OTP");

        setResetLoading(true);

        const res = await fetch(`${API_URL}/api/password-reset/verify/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email_or_phone: resetTarget.trim(),
                otp: fullOtp,
            }),
        });

        const data = await res.json();
        setResetLoading(false);

        if (!res.ok) return alert(data.detail);

        switchModal("resetPassword");
    };

    const handleResetPassword = async () => {
        if (!resetNewPass || !resetConfirmPass)
            return alert("Enter your new password.");

        if (resetNewPass !== resetConfirmPass)
            return alert("Passwords do not match.");

        setResetLoading(true);

        const res = await fetch(`${API_URL}/api/password-reset/confirm/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email_or_phone: resetTarget.trim(),
                new_password: resetNewPass,
            }),
        });

        const data = await res.json();
        setResetLoading(false);

        if (!res.ok) return alert(data.detail);

        alert("Password reset successful.");
        switchModal("login");
    };

    const handleOtpChange = (value: string, index: number) => {
        if (!/^\d?$/.test(value)) return;

        const updated = [...otpValues];
        updated[index] = value;
        setOtpValues(updated);

        if (value && index < 3)
            document.getElementById(`otp-${index + 1}`)?.focus();
        if (!value && index > 0)
            document.getElementById(`otp-${index - 1}`)?.focus();
    };

    return (
        <div
            className="modal-overlay"
            onClick={(e) => e.stopPropagation()}
        >
            <div
                className={`modal-content ${type === "signup" ? "modal-signup" : ""
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                <button className="modal-close" onClick={onClose}>
                    <AiOutlineClose size={24} />
                </button>

                {/* LOGIN */}
                {type === "login" && (
                    <>
                        <div className="modal-header">
                            <h2>Welcome Back</h2>
                            <p>Sign in to access your account</p>
                        </div>

                        <div className="modal-form">
                            <div className="form-group">
                                <label>Phone Number or Email</label>
                                <input
                                    value={loginInput}
                                    onChange={(e) => setLoginInput(e.target.value)}
                                />
                            </div>

                            <div className="form-group password-group">
                                <label>Password</label>
                                <div className="password-wrapper">
                                    <input
                                        type={showLoginPassword ? "text" : "password"}
                                        value={loginPassword}
                                        onChange={(e) => setLoginPassword(e.target.value)}
                                    />
                                    <span
                                        className="eye-icon"
                                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                                    >
                                        {showLoginPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
                                    </span>
                                </div>
                            </div>

                            <button
                                className="btn-submit"
                                onClick={handleLogin}
                                disabled={loginLoading}
                            >
                                {loginLoading ? "Logging in..." : "Login"}
                            </button>
                        </div>
                        <div className="modal-footer">
                            <p>
                                Don't have an account?{" "}
                                <span className="link" onClick={() => switchModal("signup")}>
                                    Sign Up
                                </span>
                            </p>
                        </div>

                        <div
                            className="forgot-password"
                            onClick={() => switchModal("forgotPassword")}
                        >
                            Forgot password?
                        </div>
                    </>
                )}

                {type === "signup" && (
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
                                        placeholder="First Name"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Last Name</label>
                                    <input
                                        type="text"
                                        value={signupLastName}
                                        onChange={(e) => setSignupLastName(e.target.value)}
                                        placeholder="Last Name"
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
                                        placeholder="Phone Number"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Email Address</label>
                                    <input
                                        type="email"
                                        value={signupEmail}
                                        onChange={(e) => setSignupEmail(e.target.value)}
                                        placeholder="Email"
                                    />
                                </div>
                            </div>

                            <div className="form-group password-group">
                                <label>Password</label>
                                <div className="password-wrapper">
                                    <input
                                        type={showSignupPassword ? "text" : "password"}
                                        value={signupPassword}
                                        onChange={(e) => setSignupPassword(e.target.value)}
                                        placeholder="Password"
                                    />
                                    <span
                                        className="eye-icon"
                                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                                    >
                                        {showSignupPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
                                    </span>
                                </div>
                            </div>

                            <div className="form-group password-group">
                                <label>Confirm Password</label>
                                <div className="password-wrapper">
                                    <input
                                        type={showSignupConfirm ? "text" : "password"}
                                        value={signupConfirm}
                                        onChange={(e) => setSignupConfirm(e.target.value)}
                                        placeholder="Confirm Password"
                                    />
                                    <span
                                        className="eye-icon"
                                        onClick={() => setShowSignupConfirm(!showSignupConfirm)}
                                    >
                                        {showSignupConfirm ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
                                    </span>
                                </div>
                            </div>

                            <div className="terms-checkbox">
                                <label onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={agreeTerms}
                                        onChange={(e) => setAgreeTerms(e.target.checked)}
                                    />

                                    <span className="terms-text">
                                        I agree to the{" "}
                                        <span
                                            className="link"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openTerms?.();
                                            }}
                                        >
                                            Terms & Conditions
                                        </span>{" "}
                                        and{" "}
                                        <span
                                            className="link"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openPrivacy?.();
                                            }}
                                        >
                                            Privacy Policy
                                        </span>
                                    </span>
                                </label>
                            </div>

                            <button
                                className="btn-submit"
                                onClick={handleSignup}
                                disabled={signupLoading}
                            >
                                {signupLoading ? "Creating Account..." : "Create Account"}
                            </button>
                        </div>

                        <div className="modal-footer">
                            <p>
                                Already have an account?{" "}
                                <span className="link" onClick={() => switchModal("login")}>
                                    Sign in
                                </span>
                            </p>
                        </div>
                    </>
                )}

                {/* FORGOT PASSWORD */}
                {type === "forgotPassword" && (
                    <>
                        <div className="modal-header">
                            <h2>Reset Password</h2>
                            <p>Enter your email or phone to receive an OTP.</p>
                        </div>

                        <div className="modal-form">
                            <div className="form-group">
                                <label>Email or Phone</label>
                                <input
                                    value={resetTarget}
                                    onChange={(e) => setResetTarget(e.target.value)}
                                />
                            </div>

                            <button
                                className="btn-submit"
                                onClick={handleRequestOtp}
                                disabled={resetLoading}
                            >
                                {resetLoading ? "Sending..." : "Send OTP"}
                            </button>
                        </div>
                    </>
                )}

                {/* VERIFY OTP */}
                {type === "verifyOtp" && (
                    <>
                        <div className="modal-header">
                            <h2>Verify OTP</h2>
                            <p>
                                OTP sent to{" "}
                                <strong>{maskEmailOrPhone(resetTarget)}</strong>
                            </p>
                        </div>

                        <div className="modal-form">
                            <div className="otp-container">
                                {otpValues.map((digit, index) => (
                                    <input
                                        key={index}
                                        id={`otp-${index}`}
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) =>
                                            handleOtpChange(e.target.value, index)
                                        }
                                        className="otp-input"
                                    />
                                ))}
                            </div>

                            <button
                                className="btn-submit"
                                onClick={handleVerifyOtp}
                                disabled={resetLoading}
                            >
                                {resetLoading ? "Verifying..." : "Verify OTP"}
                            </button>
                        </div>

                        <div className="modal-footer">
                            {canResend ? (
                                <span className="link" onClick={handleRequestOtp}>
                                    Resend OTP
                                </span>
                            ) : (
                                <span className="timer-text">
                                    Resend in {resendTimer}s
                                </span>
                            )}
                        </div>
                    </>
                )}

                {/* RESET PASSWORD */}
                {type === "resetPassword" && (
                    <>
                        <div className="modal-header">
                            <h2>Set New Password</h2>
                        </div>

                        <div className="modal-form">
                            <div className="form-group">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    value={resetNewPass}
                                    onChange={(e) =>
                                        setResetNewPass(e.target.value)
                                    }
                                />
                            </div>

                            <div className="form-group">
                                <label>Confirm Password</label>
                                <input
                                    type="password"
                                    value={resetConfirmPass}
                                    onChange={(e) =>
                                        setResetConfirmPass(e.target.value)
                                    }
                                />
                            </div>

                            <button
                                className="btn-submit"
                                onClick={handleResetPassword}
                                disabled={resetLoading}
                            >
                                {resetLoading ? "Updating..." : "Reset Password"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AuthModal;