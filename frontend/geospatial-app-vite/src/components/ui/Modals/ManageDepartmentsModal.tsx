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

  const handleAdd = async () => {
    if (!newDept.trim()) return;
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

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this department?")) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/admin/departments/${id}/`, {
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

                  {/* 👇 Wrap buttons */}
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
      </div>
    </div>
  );
};

export default ManageDepartmentsModal;