import '../../pages/admin/UserMgmtPage.css';
import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export type RequestStatus = 'Pending' | 'Approved' | 'Rejected';

export interface ResearcherRequest {
  id: number;
  userId: number;
  userName: string;
  date: string;
  status: RequestStatus;
}

interface Props {
  pageSize?: number;
  onPendingCountChange?: (count: number) => void;
}

const ResearcherRequestsTab: React.FC<Props> = ({ pageSize = 10, onPendingCountChange }) => {
  const [requests, setRequests] = useState<ResearcherRequest[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Fetch requests
  const fetchRequests = async (page = 1) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`http://127.0.0.1:8000/api/admin/researcher_requests/?page=${page}&page_size=${pageSize}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("Failed to fetch requests");

      const data = await res.json();
      console.log("ASAN KA NA", data)

      const mapped: ResearcherRequest[] = data.results.map((r: any) => ({
        id: r.id,
        userId: r.user,
        userName: r.username,
        date: r.created_at ? formatDistanceToNow(new Date(r.created_at), { addSuffix: true }) : "Unknown",
        status: (r.status.charAt(0).toUpperCase() + r.status.slice(1)) as RequestStatus
      }));

      setRequests(mapped);
      console.log("eto pi req", mapped)
      setCurrentPage(page);
      setTotalPages(Math.ceil(data.count / pageSize));

      // Update parent with pending count
      if (onPendingCountChange) {
        onPendingCountChange(mapped.filter(r => r.status === "Pending").length);
      }

    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const load = async () => {
      await fetchRequests();
    };
    load();
  }, []);

  // Approve a request
  const approveRequest = async (id: number) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;

    const confirmed = window.confirm(`Are you sure you want to approve the request from ${req.userName}?`);
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`http://127.0.0.1:8000/api/admin/researcher_requests/${id}/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });

      if (!res.ok) throw new Error("Failed to approve request");

      const updated = await res.json();
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: updated.status } : r));

      fetchRequests(currentPage);
      alert(`The request from ${req.userName} has been approved.`);
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
      const res = await fetch(`http://127.0.0.1:8000/api/admin/researcher_requests/${id}/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reason }),
      });

      if (!res.ok) throw new Error("Failed to reject request");

      const updated = await res.json();
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: updated.status } : r));

      fetchRequests(currentPage);
      alert(`The request from ${req.userName} has been rejected.`);

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
    setRejectingId(null);
    setRejectReason("");
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    fetchRequests(page);
  };

  const renderPagination = () => {

    return (
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
  };

  return (
    <>
      <div className="requests-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th className="center">User</th>
              <th className="center">Requested At</th>
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
              ) : (
              requests.map((req, index) => {

                return (
                  <tr key={req.id}>
                    <td className="cell-number">{(currentPage - 1) * pageSize + index + 1}</td>
                    <td className="user-name">{req.userName}</td>
                    <td className="center muted">{req.date}</td>
                    <td className="center"><span className={`badge ${req.status}`}>{req.status}</span></td>
                    <td className="center actions">
                      {req.status === "Pending" && (
                        rejectingId !== req.id ? (
                          <>
                            <button className="approve-btn" onClick={() => approveRequest(req.id)}>
                              <CheckCircle size={16} /> Approve
                            </button>
                            <button className="reject-btn" onClick={() => handleRejectStart(req.id)}>
                              <XCircle size={16} /> Reject
                            </button>
                          </>
                        ) : (
                          <div className="reject-box">
                            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Enter reason..." rows={3} autoFocus />
                            <div className="reject-actions">
                              <button className="cancel-btn" onClick={handleRejectCancel}>Cancel</button>
                              <button className="confirm-btn" disabled={!rejectReason.trim()} onClick={() => handleRejectConfirm(req.id)}>Confirm</button>
                            </div>
                          </div>
                        )
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {renderPagination()}
    </>
  );
};

export default ResearcherRequestsTab;