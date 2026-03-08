import { useState, useEffect } from "react";
import "./SettingsPage.css";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

function SettingsPage() {
    const [saving, setSaving] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState("");

    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");

    const isValidEmail = (email: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const [originalEmail, setOriginalEmail] = useState("");
    const [originalPhone, setOriginalPhone] = useState("");

    const [editSection, setEditSection] = useState<
        "email" | "phone" | "password" | null
    >(null);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [hazardAlerts, setHazardAlerts] = useState(true);
    const [communityAnnouncements, setCommunityAnnouncements] =
        useState(true);
    const [severity, setSeverity] = useState("low");

    const updatePreference = async (key: string, value: any) => {
        await updateProfile({ [key]: value });
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem("access_token");

                const res = await fetch(`${API_URL}/api/users/me/`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!res.ok) return;

                const data = await res.json();

                const e = data.email ?? "";
                const p = data.phone ?? "";

                setEmail(e);
                setPhone(p);
                setOriginalEmail(e);
                setOriginalPhone(p);

                setHazardAlerts(data.receive_hazard_alerts ?? true);
                setCommunityAnnouncements(
                    data.receive_community_announcements ?? true
                );
                setSeverity(data.alert_severity ?? "low");
            } catch (err) {
                console.error(err);
            }
        };

        fetchProfile();
    }, []);

    const updateProfile = async (updates: any) => {
        try {
            setSaving(true);
            const token = localStorage.getItem("access_token");

            const res = await fetch(`${API_URL}/api/users/me/`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(updates),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                console.error("Backend error:", data);
                throw new Error(data.detail || JSON.stringify(data) || "Update failed");
            }

            toast.success("Profile updated");
        } catch (err: any) {
            toast.error(err.message || "Update failed");
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async () => {
        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        if (newPassword.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }

        try {
            const token = localStorage.getItem("access_token");

            const res = await fetch(`${API_URL}/api/users/change-password/`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword,
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data.detail || "Password change failed");
            }

            toast.success("Password updated successfully");

            setEditSection(null);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: any) {
            toast.error(err.message || "Password change failed");
        }
    };

    const handleDeleteAccount = async () => {
        try {
            setDeleteLoading(true);

            const token = localStorage.getItem("access_token");

            const res = await fetch(`${API_URL}/api/users/delete-account/`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) throw new Error("Delete failed");

            toast.success("Account deleted successfully");

            localStorage.clear();
            window.location.href = "/";
        } catch {
            toast.error("Failed to delete account");
        } finally {
            setDeleteLoading(false);
            setShowDeleteModal(false);
        }
    };

    const cancelEdit = () => {
        setEmail(originalEmail);
        setPhone(originalPhone);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setEditSection(null);
    };

    return (
        <div className="settings-page">

            {/* ACCOUNT SETTINGS */}
            <div className="settings-card">
                <h2>Account Settings</h2>

                {/* Email */}
                <div className="settings-item">
                    <div className="settings-header">
                        <span>Email</span>
                        <button onClick={() => setEditSection("email")}>
                            Edit
                        </button>
                    </div>

                    <div
                        className={`expand ${editSection === "email" ? "open" : ""}`}
                    >
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <div className="form-actions">
                            <button
                                disabled={saving || email === originalEmail}
                                onClick={async () => {

                                    if (!isValidEmail(email)) {
                                        toast.error("Please enter a valid email");
                                        return;
                                    }
                                    await updateProfile({ email });
                                    setOriginalEmail(email);
                                    setEditSection(null);
                                }}
                            >
                                Save
                            </button>

                            <button className="cancel" onClick={cancelEdit}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>

                {/* Phone */}
                <div className="settings-item">
                    <div className="settings-header">
                        <span>Phone</span>
                        <button onClick={() => setEditSection("phone")} >
                            Edit
                        </button>
                    </div>

                    <div
                        className={`expand ${editSection === "phone" ? "open" : ""}`}
                    >
                        <input
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />

                        <div className="form-actions">
                            <button
                                disabled={saving || phone === originalPhone}
                                onClick={async () => {

                                    if (!/^[0-9]{10,13}$/.test(phone)) {
                                        toast.error("Invalid phone number");
                                        return;
                                    }

                                    await updateProfile({ phone });
                                    setOriginalPhone(phone);
                                    setEditSection(null);
                                }}
                            >
                                Save
                            </button>

                            <button className="cancel" onClick={cancelEdit}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>

                {/* Password */}
                <div className="settings-item">
                    <div className="settings-header">
                        <span>Password</span>
                        <button onClick={() => setEditSection("password")}>
                            Change
                        </button>
                    </div>

                    <div
                        className={`expand ${editSection === "password" ? "open" : ""
                            }`}
                    >
                        <div className="password-input">
                            <input
                                type={showCurrentPassword ? "text" : "password"}
                                placeholder="Current Password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                            />

                            <button
                                type="button"
                                className="eye-btn"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            >
                                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <div className="password-input">
                            <input
                                type={showNewPassword ? "text" : "password"}
                                placeholder="New Password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />

                            <button
                                type="button"
                                className="eye-btn"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <div className="password-input">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />

                            <button
                                type="button"
                                className="eye-btn"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <div className="form-actions">
                            <button onClick={handlePasswordChange}>
                                Update Password
                            </button>
                            <button className="cancel" onClick={cancelEdit}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>

                <button
                    className="danger-btn"
                    onClick={() => setShowDeleteModal(true)}
                >
                    Delete Account
                </button>
            </div>

            {/* NOTIFICATIONS */}
            <div className="settings-card">
                <h2>Notification Preferences</h2>

                <div className="settings-row">
                    <span>Receive Hazard Alerts</span>
                    <label className="toggle">
                        <input
                            type="checkbox"
                            checked={hazardAlerts}
                            onChange={(e) => {
                                const v = e.target.checked;
                                setHazardAlerts(v);
                                updatePreference("receive_hazard_alerts", v);
                            }}
                        />
                        <span className="slider"></span>
                    </label>
                </div>

                <div className="settings-row">
                    <span>Receive Community Announcements</span>
                    <label className="toggle">
                        <input
                            type="checkbox"
                            checked={communityAnnouncements}
                            onChange={(e) => {
                                const v = e.target.checked;
                                setCommunityAnnouncements(v);
                                updateProfile({ receive_community_announcements: v });
                            }}
                        />
                        <span className="slider"></span>
                    </label>
                </div>

                <div className="settings-row">
                    <span>Minimum Alert Severity</span>
                    <select
                        value={severity}
                        onChange={(e) => {
                            setSeverity(e.target.value);
                            updateProfile({ alert_severity: e.target.value });
                        }}
                    >
                        <option value="low">All Alerts</option>
                        <option value="moderate">Moderate & Above</option>
                        <option value="high">High & Above</option>
                        <option value="critical">Critical Only</option>
                    </select>
                </div>
            </div>
            {showDeleteModal && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <h3>Delete Account</h3>
                        <p>
                            This action is permanent and cannot be undone.
                            All your reports and data will be permanently deleted.
                        </p>

                        <div className="modal-actions">
                            <button
                                className="cancel-btn"
                                onClick={() => setShowDeleteModal(false)}
                                disabled={deleteLoading}
                            >
                                Cancel
                            </button>

                            <button

                                className="danger-confirm"
                                onClick={handleDeleteAccount}
                                disabled={deleteLoading}
                            >
                                {deleteLoading ? "Deleting..." : "Delete Permanently"}
                            </button>
                            <input
                                placeholder="Type DELETE to confirm"
                                value={confirmDelete}
                                onChange={(e) => setConfirmDelete(e.target.value)}
                            />

                            <button
                                className="danger-confirm"
                                onClick={handleDeleteAccount}
                                disabled={deleteLoading || confirmDelete !== "DELETE"}
                            >
                                {deleteLoading ? "Deleting..." : "Delete Permanently"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SettingsPage;