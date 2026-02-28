import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/citizen-pwa/loginSignup.css';

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");

  const isLogin = mode === "login";

  return (
    <div className="pwa-login-container">
      <div className="login-card">
        <h2>{isLogin ? "Welcome Back" : "Create Account"}</h2>
        <p>
          {isLogin
            ? "Sign in to access your account"
            : "Join HazSpot to report and track hazards"}
        </p>

        {!isLogin && (
          <input type="text" placeholder="Full Name" />
        )}

        <input type="tel" placeholder="Phone Number" />
        <input type="email" placeholder="Email (optional)" />
        <input type="password" placeholder="Password" />

        {!isLogin && (
          <input type="password" placeholder="Confirm Password" />
        )}


        <button className="btn-primary">
          {isLogin ? "Login" : "Sign Up"}
        </button>

        <button className="btn-secondary" onClick={() => navigate("/")}>
          Cancel
        </button>

        <p className="signup-text">
          {isLogin ? (
            <>
              Don't have an account?{" "}
              <span onClick={() => setMode("signup")}>Sign Up</span>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <span onClick={() => setMode("login")}>Login</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
