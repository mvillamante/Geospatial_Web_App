import { useState, useRef, useEffect } from "react";
import type { User } from "../../../usertype/User"; // <-- shared type
import "./GlobalModal.css";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL;

type StaffRole = "admin" | "officer" | "researcher";

interface Props {
  onClose: () => void;
  onCreated: (newUser: User) => void; 
  departmentRefreshKey: number; 
}

const CreateUserModal: React.FC<Props> = ({ onClose, onCreated, departmentRefreshKey }) => {
  const today = new Date().toLocaleDateString();

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<StaffRole | "">("");
  const [departmentId, setDepartmentId] = useState<number | "">(""); // <-- store ID
  const [departments, setDepartments] = useState<{id:number,name:string}[]>([]);

  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const generatedUsername =
    firstName && lastName
      ? `${firstName
          .trim()
          .split(" ")
          .map(name => name[0])
          .join("")
          .toLowerCase()}${lastName.replace(/\s+/g, "").toLowerCase()}`
      : "";
  const finalUsername = username || generatedUsername;

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/admin/departments/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDepartments(Array.isArray(data.results) ? data.results : []);
    } catch {
      setDepartments([]);
    }
  };

  useEffect(() => { fetchDepartments(); }, [departmentRefreshKey]);

  // Validators
  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone: string) => /^\d{11}$/.test(phone);

  // Temporary password
  const tempPasswordRef = useRef<string | null>(null);
  const generateTempPassword = () => {
    if (!tempPasswordRef.current) {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
      let password = "";
      for (let i = 0; i < 10; i++) password += chars.charAt(Math.floor(Math.random() * chars.length));
      tempPasswordRef.current = password;
    }
  };

  // Handle create
  const handleCreate = async () => {
    setError("");

    if (!firstName || !lastName || !email || !phone || !role || (role === "officer" && !departmentId)) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (!validateEmail(email)) { setError("Invalid email address."); return; }
    if (!validatePhone(phone)) { setError("Invalid phone number."); return; }
    if (!tempPasswordRef.current) { setError("Temporary password not generated."); return; }

    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/admin/users/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          username: finalUsername,
          email: email.trim(),
          phone: phone.trim(),
          role: role.toLowerCase(),
          ...(role === "officer" ? { department: departmentId } : {}), // <-- send ID, not string
          password: tempPasswordRef.current,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.detail || data.error || "Failed to create user."); return; }

      // Map backend response to shared User type
      const newUser: User = {
        id: data.id,
        staff_id: data.staff_id,
        username: data.username,
        first_name: data.first_name,
        last_name: data.last_name,
        name: `${data.first_name} ${data.last_name}`,
        email: data.email,
        phone: data.phone,
        role: data.role.charAt(0).toUpperCase() + data.role.slice(1),
        extra_roles: data.extra_roles ?? [],
        department: data.department_name ?? "---", // backend should return the string name for display
        status: data.is_active ? "Active" : "Inactive",
        dateJoined: data.date_joined_display,
        lastLogin: data.last_login ?? "",
        lastLoginDisplay: data.last_login_display ?? "Never",
      };

      await onCreated(newUser);
      onClose();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

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

  // =================== JSX ===================
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
          {role === "officer" && <div className="form-group"><strong>Department:</strong> {departments.find(d => d.id === departmentId)?.name}</div>}

          <h3 className="account-header">Account Credentials</h3>
          <div className="form-group"><strong>Email:</strong> {email}</div>
          <div className="form-group"><strong>Phone:</strong> {phone}</div>
          <div className="form-group">
            User will receive an email to set their password.
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

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-signup create-user-modal">
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-header">
          <h2>Create Staff User</h2>
          <p>For Admin and LGU Officer Accounts</p>
        </div>

        <form className="modal-form" onSubmit={(e) => e.preventDefault()}>
          <div className="form-group">
            <label>Date Created</label>
            <input value={today} disabled />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>First Name <span className="required-star">*</span></label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Enter first name" />
            </div>
            <div className="form-group">
              <label>Last Name <span className="required-star">*</span></label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Enter last name"/>
            </div>
          </div>

          <div className="form-group">
            <label>Username</label>
            <input value={finalUsername} onChange={e => setUsername(e.target.value)} placeholder="Enter username"/>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Role <span className="required-star">*</span></label>
              <select value={role} onChange={e => setRole(e.target.value as StaffRole)}>
                <option value="" disabled>Select role</option>
                <option value="admin">Admin</option>
                <option value="officer">Officer</option>
              </select>
            </div>

            {role === "officer" && (
              <div className="form-group">
                <label>Department <span className="required-star">*</span></label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(Number(e.target.value))}
                >
                  <option value="">Select Department</option>
                  {departments.map((dep) => (
                    <option key={dep.id} value={dep.id}>{dep.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email <span className="required-star">*</span></label>
              <input value={email} onChange={e => handleEmailChange(e.target.value)} placeholder="Enter email address"/>
              {emailError && <span className="input-error">{emailError}</span>}
            </div>
            <div className="form-group">
              <label>Phone <span className="required-star">*</span></label>
              <input value={phone} onChange={e => handlePhoneChange(e.target.value)} placeholder="Enter phone number"/>
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
                if (!firstName.trim() || !lastName.trim() || !role || (role === "officer" && !departmentId) || !email.trim() || !phone.trim() || emailError || phoneError) {
                  toast.error("Please fill in all required fields.");
                  return;
                }
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