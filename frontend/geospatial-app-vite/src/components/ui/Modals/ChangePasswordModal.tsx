import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import "./GlobalModal.css";

interface Props {
  userId: number;
  userName: string;
  onClose: () => void;
  onPasswordChanged: () => void;
}

const ChangePasswordModal: React.FC<Props> = ({ userId, userName, onClose, onPasswordChanged }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError("All password fields are required");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `http://127.0.0.1:8000/api/admin/users/${userId}/change-password/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password: newPassword }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "Failed to change password");
        return;
      }

      alert(`Password for ${userName} changed successfully`);
      onPasswordChanged();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-signup create-user-modal">
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>

        <div className="modal-header">
          <h2>Change Password</h2>
          <p>Set a new password for {userName}</p>
        </div>

        <div className="modal-form">
          {/* New Password */}
          <div className="form-group">
            <label>
              New Password <span className="required-star">*</span>
            </label>
            <div style={{ display: "flex", alignItems: "center" }}>
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                style={{ flex: 1 }}
              />
              <span onClick={() => setShowNew(!showNew)} style={{ marginLeft: "0.5rem", cursor: "pointer" }}>
                {showNew ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </span>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="form-group">
            <label>
              Confirm New Password <span className="required-star">*</span>
            </label>
            <div style={{ display: "flex", alignItems: "center" }}>
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                style={{ flex: 1 }}
              />
              <span onClick={() => setShowConfirm(!showConfirm)} style={{ marginLeft: "0.5rem", cursor: "pointer" }}>
                {showConfirm ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </span>
            </div>
          </div>

          {error && <p className="create-user-error">{error}</p>}

          <div className="form-row" style={{ marginTop: "1rem" }}>
            <button className="btn-submit btn-back" onClick={onClose} type="button">
              Cancel
            </button>
            <button
              className="btn-submit btn-confirm"
              onClick={handleChangePassword}
              disabled={loading}
              type="button"
            >
              {loading ? "Updating..." : "Change Password"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
