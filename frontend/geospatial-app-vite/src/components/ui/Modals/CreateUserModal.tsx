import { useState, useRef, useEffect } from "react";
import "./GlobalModal.css";
import { getDepartments, type Departments } from "../../../constants"


type StaffRole = "admin" | "officer" | "researcher";

interface Props {
  onClose: () => void;
  onCreated: () => Promise<void>;
}

const departments: readonly Departments[] = getDepartments();

const CreateUserModal: React.FC<Props> = ({ onClose, onCreated }) => {
  const today = new Date().toLocaleDateString();

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<StaffRole | "">("");
  const [department, setDepartment] = useState<Departments | "">("");
  const [deptOpen, setDeptOpen] = useState(false);
  const deptRef = useRef<HTMLDivElement>(null);

  // Password & validation
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const generatedUsername =
    firstName && lastName ? `${firstName.trim()}.${lastName.trim()}` : "";
  const finalUsername = username || generatedUsername;

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (deptRef.current && !deptRef.current.contains(e.target as Node)) {
        setDeptOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Validators
  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone: string) => /^\d{11}$/.test(phone);

  // =================== Generate temporary password ===================
    const tempPasswordRef = useRef<string | null>(null);

    const generateTempPassword = () => {
    if (!tempPasswordRef.current) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
        let password = "";
        for (let i = 0; i < 10; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        tempPasswordRef.current = password; // store in ref
    }
    };

  // =================== Handle creation ===================
  const handleCreate = async () => {
    setError("");

    // Final validation before sending
    if (!firstName || !lastName || !email || !phone || !role || (role === "officer" && !department)) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!validateEmail(email)) {
      setError("Invalid email address.");
      return;
    }
    if (!validatePhone(phone)) {
      setError("Invalid phone number.");
      return;
    }
    if (!tempPasswordRef.current) {
      setError("Temporary password not generated.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("http://127.0.0.1:8000/api/admin/users/create/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          username: finalUsername,
          email: email.trim(),
          phone: phone.trim(),
          role: role === "researcher" ? "Researcher" : role.toLowerCase(),
          ...(role === "officer" ? { department } : {}),
          password: tempPasswordRef.current,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || data.error || "Failed to create user.");
        return;
      }

      await onCreated();
      onClose();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // =================== Input handlers ===================
  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (!value) setEmailError("Email is required.");
    else if (!validateEmail(value)) setEmailError("Invalid email address.");
    else setEmailError("");
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    if (!value) setPhoneError("Phone is required.");
    else if (!/^\d+$/.test(value)) setPhoneError("Phone must be numbers only.");
    else if (!validatePhone(value)) setPhoneError("Phone must be 11 digits.");
    else setPhoneError("");
  };

  // =================== Confirmation modal ===================
  if (confirming) {
    return (
      <div className="modal-overlay">
        <div className="modal-content modal-signup create-user-modal confirm-step">
          <button className="modal-close" onClick={onClose}>✕</button>

          <div className="modal-header">
            <h2>Confirm Details</h2>
            <p>Please verify all details before creating the account</p>
          </div>

          <h3 className="section-title">Personal Information</h3>
          <div className="form-group"><strong>First Name:</strong> {firstName}</div>
          <div className="form-group"><strong>Last Name:</strong> {lastName}</div>
          <div className="form-group"><strong>Username:</strong> {finalUsername}</div>
          <div className="form-group"><strong>Role:</strong> {role}</div>
          {role === "officer" && <div className="form-group"><strong>Department:</strong> {department}</div>}

          <h3 className="account-header">Account Credentials</h3>
          <div className="form-group"><strong>Email:</strong> {email}</div>
          <div className="form-group"><strong>Phone:</strong> {phone}</div>
          <div className="form-group">
            <strong>Temporary Password:</strong>
            <span className="temp-password">{tempPasswordRef.current}</span>
          </div>

          <div className="form-row confirm-buttons">
            <button className="btn-submit btn-back" onClick={() => setConfirming(false)} type="button">
              Back
            </button>
            <button className="btn-submit btn-confirm" onClick={handleCreate} disabled={loading} type="button">
              {loading ? "Creating..." : "Confirm & Create"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =================== Main Form ===================
  return (
    <div className="modal-overlay">
      <div className="modal-content modal-signup create-user-modal">
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-header">
          <h2>Create Staff User</h2>
          <p>Admin / Officer / Researcher only</p>
        </div>

        <form className="modal-form" onSubmit={(e) => e.preventDefault()}>
          <div className="form-group">
            <label>Date Created</label>
            <input value={today} disabled />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>First Name <span className="required-star">*</span></label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Last Name <span className="required-star">*</span></label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>Username</label>
            <input value={finalUsername} onChange={e => setUsername(e.target.value)} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Role <span className="required-star">*</span></label>
              <select value={role} onChange={e => setRole(e.target.value as StaffRole)}>
                <option value="" disabled>Select role</option>
                <option value="admin">Admin</option>
                <option value="officer">Officer</option>
                <option value="Researcher">Researcher</option>
              </select>
            </div>

            {role === "officer" && (
              <div className="form-group" ref={deptRef}>
                <label>Department <span className="required-star">*</span></label>
                <div className="custom-dropdown">
                  <div className="dropdown-selected" onClick={() => setDeptOpen(!deptOpen)}>
                    {department || "Select department"} <span className="dropdown-arrow">▾</span>
                  </div>
                  {deptOpen && (
                    <ul className="dropdown-options">
                      {departments.map(dep => (
                        <li key={dep} onClick={() => { setDepartment(dep); setDeptOpen(false); }}>
                          {dep}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email <span className="required-star">*</span></label>
              <input value={email} onChange={e => handleEmailChange(e.target.value)} />
              {emailError && <span className="input-error">{emailError}</span>}
            </div>
            <div className="form-group">
              <label>Phone <span className="required-star">*</span></label>
              <input value={phone} onChange={e => handlePhoneChange(e.target.value)} />
              {phoneError && <span className="input-error">{phoneError}</span>}
            </div>
          </div>

          {error && <p className="create-user-error">{error}</p>}

          <div className="form-row" style={{ marginTop: "1rem" }}>
            <button
              type="button"
              className="btn-submit review-btn"
              onClick={() => {
                setError("");

                if (
                  !firstName.trim() ||
                  !lastName.trim() ||
                  !role ||
                  (role === "officer" && !department) ||
                  !email.trim() ||
                  !phone.trim() ||
                  emailError ||
                  phoneError
                ) {
                  setError("Please fill in all required fields.");
                  return;
                }

                // Only generate password if it hasn't been generated yet
                if (!tempPasswordRef.current) generateTempPassword();

                setConfirming(true);
              }}
            >
              Review Details
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserModal;
