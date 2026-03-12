import { useEffect, useState } from "react";
import { FiEdit } from "react-icons/fi";
import "./GlobalModal.css";

interface Department {
  id: number;
  name: string;
}

interface Props {
  onClose: () => void;
  onDepartmentChanged: () => void;
}

const API_URL = import.meta.env.VITE_API_URL;

const ManageDepartmentsModal: React.FC<Props> = ({ onClose, onDepartmentChanged }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newDept, setNewDept] = useState("");
  const [editingDeptId, setEditingDeptId] = useState<number | null>(null);
  const [editingDeptName, setEditingDeptName] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingDeptId, setSavingDeptId] = useState<number | null>(null);

  // confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    deptId: number | null;
    message: string;
    action: "delete" | "add" | null;
  }>({ show: false, deptId: null, message: "", action: null });

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/admin/departments/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDepartments(data.results || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  /* Add Department */
  const handleAdd = () => {
    if (!newDept.trim()) return;
    setConfirmModal({
      show: true,
      deptId: null,
      message: `Are you sure you want to add the department "${newDept.trim()}"?`,
      action: "add",
    });
  };

  const confirmAdd = async () => {
    setConfirmModal({ ...confirmModal, show: false });
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/admin/departments/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newDept.trim() }),
      });

      if (!res.ok) {
        alert("Failed to add department");
        return;
      }

      setNewDept("");
      fetchDepartments();
      onDepartmentChanged();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* Delete Department */
  const handleDelete = (id: number) => {
    setConfirmModal({
      show: true,
      deptId: id,
      message: "Are you sure you want to delete this department?",
      action: "delete",
    });
  };

  const confirmDelete = async () => {
    if (confirmModal.deptId === null) return;
    setConfirmModal({ ...confirmModal, show: false });
    setLoading(true);

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/admin/departments/${confirmModal.deptId}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        alert("Failed to delete department");
        return;
      }

      fetchDepartments();
      onDepartmentChanged();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* Edit Department */
  const handleEdit = (dept: Department) => {
    setEditingDeptId(dept.id);
    setEditingDeptName(dept.name);
  };

  const handleUpdate = async () => {
    if (!editingDeptName.trim() || editingDeptId === null) return;

    setSavingDeptId(editingDeptId);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/admin/departments/${editingDeptId}/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: editingDeptName.trim() }),
      });

      if (!res.ok) {
        alert("Failed to update department");
        return;
      }

      setEditingDeptId(null);
      setEditingDeptName("");
      fetchDepartments();
      onDepartmentChanged();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingDeptId(null);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content manage-dept-modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2>Manage Departments</h2>

        <div className="dept-add-row">
          <input
            value={newDept}
            onChange={(e) => setNewDept(e.target.value)}
            placeholder="Enter department name..."
          />
          <button onClick={handleAdd} disabled={loading}>
            {loading ? "Adding..." : "Add"}
          </button>
        </div>

        <div className="dept-list">
          {departments.map((dept) => (
            <div key={dept.id} className="dept-item">
              {editingDeptId === dept.id ? (
                <>
                  <input
                    value={editingDeptName}
                    onChange={(e) => setEditingDeptName(e.target.value)}
                  />
                  <div className="dept-actions">
                    <button
                      className="save-btn"
                      onClick={handleUpdate}
                      disabled={savingDeptId === dept.id}
                    >
                      {savingDeptId === dept.id ? "Saving..." : "Save"}
                    </button>
                    <button
                      className="cancel-btn"
                      onClick={() => setEditingDeptId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span>{dept.name}</span>
                  <div className="dept-actions">
                    <button
                      onClick={() => handleEdit(dept)}
                      className="icon-btn"
                    >
                      <FiEdit />
                    </button>

                    <button
                      className="danger"
                      onClick={() => handleDelete(dept.id)}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Confirmation Modal */}
        {confirmModal.show && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>Confirm Action</h3>
              <p>{confirmModal.message}</p>
              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setConfirmModal({ show: false, deptId: null, message: "", action: null })}
                >
                  Cancel
                </button>
                <button
                  className="btn-secondary danger"
                  onClick={confirmModal.action === "add" ? confirmAdd : confirmDelete}
                  disabled={loading}
                >
                  {loading
                    ? confirmModal.action === "add" ? "Adding..." : "Deleting..."
                    : confirmModal.action === "add" ? "Add" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageDepartmentsModal;