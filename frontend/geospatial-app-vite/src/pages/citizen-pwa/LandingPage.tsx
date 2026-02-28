import React from 'react';
import { useNavigate } from "react-router-dom";
import "../../styles/citizen-pwa/landing.css";

export default function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="pwa-landing-page">
            <div className="pwa-landing-container">
                <h1>HazSpot</h1>

                <div className="button-group">
                    <button className="btn-primary" onClick={() => navigate("/main/citizen-pwa/login")}>
                        Login
                    </button>
                    <button className="btn-secondary" onClick={() => navigate("/main/citizen/community-feed")}>
                        Continue as Guest
                    </button>
                </div>
            </div>
        </div>

    )
}