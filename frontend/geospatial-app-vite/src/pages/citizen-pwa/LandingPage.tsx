import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "../../styles/citizen-pwa/landing.css";

export default function LandingPage() {
    const navigate = useNavigate();
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener("beforeinstallprompt", handler);

        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;

        if (choice.outcome === "accepted") {
            console.log("User accepted install");
        }

        setDeferredPrompt(null);
    };

    return (
        <div className="pwa-landing-page">
            <div className="pwa-landing-container">
                <h1>HazSpot</h1>

                <div className="button-group">
                    <button
                        className="btn-primary"
                        onClick={() => navigate("/main/citizen-pwa/login")}
                    >
                        Login
                    </button>

                    <button
                        className="btn-secondary"
                        onClick={() => navigate("/main/citizen/community-feed")}
                    >
                        Continue as Guest
                    </button>

                    {deferredPrompt && (
                        <button className="btn-install" onClick={handleInstallClick}>
                            Install HazSpot App
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}