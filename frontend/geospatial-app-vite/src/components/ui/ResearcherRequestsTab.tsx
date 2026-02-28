import '../../pages/admin/UserMgmtPage.css';
import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const API_URL = import.meta.env.VITE_API_URL;

export type RequestStatus = 'Pending' | 'Approved' | 'Rejected';

export interface ResearcherRequest {
  id: number;
  fullName: string;      
  email: string;
  date: string;
  purpose: string;
  orgSchool: string;
  status: RequestStatus;
}

interface Props {
  pageSize: number;
  requests: ResearcherRequest[];
  onPendingCountChange: (count: number) => void;
  refreshUsers?: () => void; // optional prop to refresh Users table
}

const ResearcherRequestsTab: React.FC<Props> = ({ pageSize = 10, onPendingCountChange, refreshUsers }) => {
  const [requests, setRequests] = useState<ResearcherRequest[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Fetch requests
  const fetchRequests = async (page = 1) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/admin/researcher_requests/?page=${page}&page_size=${pageSize}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("Failed to fetch requests");

      const data = await res.json();

      const mapped: ResearcherRequest[] = data.results.map((r: any) => ({
        id: r.id,
        fullName: r.first_name && r.last_name ? `${r.first_name} ${r.last_name}` : "Anonymous",
        email: r.email || "Unknown",
        date: r.created_at ? formatDistanceToNow(new Date(r.created_at), { addSuffix: true }) : "Unknown",
        status: (r.status.charAt(0).toUpperCase() + r.status.slice(1)) as RequestStatus,
        purpose: r.purpose,
        orgSchool: r.orgSchool
      }));

      setRequests(mapped);
      setCurrentPage(page);
      setTotalPages(Math.ceil(data.count / pageSize));

      // Update parent with pending count
      onPendingCountChange?.(mapped.filter(r => r.status === "Pending").length);

    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const generateTempPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    let password = "";
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Approve a request
  const approveRequest = async (id: number) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;

    const confirmed = window.confirm(`Are you sure you want to approve the request from ${req.fullName}?`);
    if (!confirmed) return;

    const tempPassword = generateTempPassword();

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/admin/researcher_requests/${id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "approve"
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        console.error("Backend error:", errData);
        throw new Error("Failed to approve request");
      }

      const updated = await res.json();

      setRequests(prev =>
        prev.map(r => r.id === id ? { ...r, status: "Approved" } : r)
      );

      alert(`The request from ${req.fullName} has been approved.\nAn email has been sent to ${req.email} with login credentials.`);

    } catch (err) {
      console.error(err);
      alert("Failed to approve request.");
    }
  };

  // Reject a request
  const rejectRequest = async (id: number, reason: string) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/admin/researcher_requests/${id}/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "reject", reason }),
      });

      if (!res.ok) throw new Error("Failed to reject request");

      const updated = await res.json();

      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: updated.status } : r));

      alert(`Request rejected.\nReason: ${reason}`);

      setRejectingId(null);
      setRejectReason("");

    } catch (err) {
      console.error(err);
      alert("Failed to reject request.");
    }
  };

  const handleRejectStart = (id: number) => {
    setRejectingId(id);
    setRejectReason("");
  };

  const handleRejectCancel = () => {
    setRejectingId(null);
    setRejectReason("");
  };

  const handleRejectConfirm = (id: number) => {
    if (!rejectReason.trim()) return;
    rejectRequest(id, rejectReason);
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    fetchRequests(page);
  };

  const renderPagination = () => (
    <div className="pagination-wrapper">
      <div className="pagination">
        <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>Prev</button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
          <button key={n} className={n === currentPage ? "active" : ""} onClick={() => handlePageChange(n)}>{n}</button>
        ))}
        <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
      </div>
    </div>
  );

  return (
    <>
      <div className="requests-table-wrapper">
        <table>
          <thead>
            <tr>
              <th className="center">User</th>
              <th className="center">Created At</th>
              <th className="center">Purpose</th>
              <th className="center">Organization/School</th>
              <th className="center">Status</th>
              <th className="center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty">
                  Loading Researcher Requests...
                </td>
              </tr>
            ) : requests.map(req => (
              <tr key={req.id}>
                <td className="user-name">{req.fullName}<br/><small>{req.email}</small></td>
                <td className="center muted">{req.date}</td>
                <td className="center muted">{req.purpose}</td>
                <td className="center muted">{req.orgSchool}</td>
                <td className="center"><span className={`badge ${req.status}`}>{req.status}</span></td>
                <td className="center actions">
                  {req.status === "Pending" && (
                    rejectingId !== req.id ? (
                      <>
                        <button className="approve-btn" onClick={() => approveRequest(req.id)}>
                          <CheckCircle size={16}/> Approve
                        </button>
                        <button className="reject-btn" onClick={() => handleRejectStart(req.id)}>
                          <XCircle size={16}/> Reject
                        </button>
                      </>
                    ) : (
                      <div className="reject-box">
                        <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                          placeholder="Enter reason..." rows={3} autoFocus />
                        <div className="reject-actions">
                          <button className="cancel-btn" onClick={handleRejectCancel}>Cancel</button>
                          <button className="confirm-btn" disabled={!rejectReason.trim()}
                            onClick={() => handleRejectConfirm(req.id)}>Confirm</button>
                        </div>
                      </div>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {renderPagination()}
    </>
  );
};

export default ResearcherRequestsTab;