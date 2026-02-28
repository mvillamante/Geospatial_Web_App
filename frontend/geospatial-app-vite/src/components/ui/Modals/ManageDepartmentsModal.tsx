import { useEffect, useState } from "react";
import "./GlobalModal.css";

interface Department {
  id: number;
  name: string;
}

interface Props {
  onClose: () => void;
  onDepartmentChanged: () => void;
}


const ManageDepartmentsModal: React.FC<Props> = ({ onClose, onDepartmentChanged }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newDept, setNewDept] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("http://127.0.0.1:8000/api/admin/departments/", {
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
      const res = await fetch("http://127.0.0.1:8000/api/admin/departments/", {
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

  // const handleDelete = async (id: number) => {
  //   if (!window.confirm("Delete this department?")) return;

  //   try {
  //     const token = localStorage.getItem("access_token");
  //     await fetch(`http://127.0.0.1:8000/api/admin/departments/${id}/`, {
  //       method: "DELETE",
  //       headers: { Authorization: `Bearer ${token}` },
  //     });

  //     fetchDepartments();
  //     onDepartmentChanged();
  //   } catch (err) {
  //     console.error(err);
  //   }
  // };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
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
            <span>{dept.name}</span>
            {/* <button
                className="danger"
                onClick={() => handleDelete(dept.id)}
            >
                Delete
            </button> */}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ManageDepartmentsModal;
