import '../../pages/admin/UserMgmtPage.css';
import { FiCheckCircle, FiEye, FiSearch, FiX } from "react-icons/fi";
import { LuEllipsis } from "react-icons/lu";
import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle, Power, PowerOff } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

const API_URL = import.meta.env.VITE_API_URL;

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'active' | 'inactive';

export interface ResearcherRequest {
  id: number;
  type: "request" | "researcher";
  fullName: string;
  email: string;

  createdAt: string;       
  reviewedAt?: string;    
  lastlogin?: string;

  purpose: string;
  orgSchool: string;
  attachment?: string;    
  status: RequestStatus;
}

interface Props {
  pageSize: number;
  requests: ResearcherRequest[];
  onPendingCountChange: (count: number) => void;
  refreshUsers?: () => void; // optional prop to refresh Users table
}

const ResearcherRequestsTab: React.FC<Props> = ({ pageSize = 10, onPendingCountChange }) => {
  const [requests, setRequests] = useState<ResearcherRequest[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("pending");
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [modalResearcher, setModalResearcher] = useState<ResearcherRequest | null>(null);
  // Fetch requests
  const fetchRequests = async (page = 1) => {
    try {
      const token = localStorage.getItem("access_token");
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("page_size", pageSize.toString());

      if (debouncedSearch) params.append("search", debouncedSearch);
      if (statusFilter !== "all") params.append("status", statusFilter.toLowerCase());
      
      const res = await fetch(
        `${API_URL}/api/admin/researcher_overview/?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) throw new Error("Failed to fetch requests");

      const data = await res.json();

      const mapped: ResearcherRequest[] = data.results.map((r: any) => ({
        id: r.id,
        type: r.type,
        fullName: `${r.first_name} ${r.last_name}`,
        email: r.email,
        createdAt: r.created_at
          ? format(new Date(r.created_at), "MMMM d, yyyy")
          : "Unknown",

        reviewedAt: r.reviewed_at
          ? format(new Date(r.reviewed_at), "MMMM d, yyyy hh:mm:ss a")
          : undefined,
        lastlogin: r.last_login
          ? formatDistanceToNow(new Date(r.last_login), { addSuffix: true })
          : r.type === "researcher"
            ? "Never"
            : undefined,
        status: r.status.toLowerCase(),
        purpose: r.purpose,
        orgSchool: r.orgSchool,
        attachment: r.attachment || undefined,
      }));

      setRequests(mapped);
      setCurrentPage(page);
      setTotalPages(Math.ceil(data.count / pageSize));

      // Update parent with pending count
      onPendingCountChange?.(mapped.filter(r => r.status === "pending").length);

    } catch (err) {
      console.error(err);
    }
  };
  const isResearcherView =
    statusFilter === "active" || statusFilter === "inactive";
  useEffect(() => { fetchRequests(1); }, [debouncedSearch, statusFilter]);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  const toggleResearcherStatus = async (id: number, currentStatus: RequestStatus) => {
    const action = currentStatus === "active" ? "deactivate" : "activate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} this researcher?`
    );
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("access_token");

      const res = await fetch(
        `${API_URL}/api/admin/users/${id}/toggle-status/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error("Failed to update status");

      await fetchRequests(currentPage);

      setOpenMenu(null);

    } catch (err) {
      console.error(err);
      alert("Failed to update researcher status.");
    }
  };
  // const generateTempPassword = () => {
  //   const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
  //   let password = "";
  //   for (let i = 0; i < 10; i++) {
  //     password += chars.charAt(Math.floor(Math.random() * chars.length));
  //   }
  //   return password;
  // };

  // Approve a request
  const approveRequest = async (id: number) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;

    const confirmed = window.confirm(`Are you sure you want to approve the request from ${req.fullName}?`);
    if (!confirmed) return;

    // const tempPassword = generateTempPassword();

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

      // const updated = await res.json();

      setRequests(prev =>
        prev.map(r => r.id === id ? { ...r, status: "approved" } : r)
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
      <div className="filters">
        <div className="filters-left">
          <div className="select-wrapper">
            <FiCheckCircle className="select-icon" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RequestStatus | "all")}
              className="status-select"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="filters-right">
          <div className="search-wrapper">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm.trim() && (
              <button
                className="search-clear"
                onClick={() => setSearchTerm("")}
                type="button"
              >
                x
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="requests-table-wrapper">
        <table>
          <thead>
            <tr>
              <th className="center">User</th>
              <th className="center">
                {isResearcherView ? "Date Joined" : "Created At"}
              </th>
              {isResearcherView && (
                <th className="center">Last Login</th>
              )}
              {!isResearcherView && (
                <>
                  <th className="center">Purpose</th>
                  <th className="center">Organization/School</th>
                </>
              )}

              <th className="center">Status</th>
              {isResearcherView && (
                <th className="center">Actions</th>
              )}
              {!isResearcherView && (
                <th className="center">Actions</th>
              )}
            </tr>
          </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={isResearcherView ? 6 : 6} className="empty">
                    No records found.
                  </td>
                </tr>
              ) : (
                requests.map(req => (
                  <tr key={req.id}>
                    <td className="user-name">
                      {req.fullName}
                      <br />
                      <small>{req.email}</small>
                    </td>

                    <td className="center muted">{req.createdAt}</td>
                    {isResearcherView && (
                      <td className="center muted">
                        {req.lastlogin || "—"}
                      </td>
                    )}
                    {!isResearcherView && (
                      <>
                        <td className="center muted">
                          {req.purpose || "-"}
                        </td>
                        <td className="center muted">
                          {req.orgSchool || "-"}
                        </td>
                      </>
                    )}

                    <td className="center">
                      <span className={`badge ${req.status}`}>
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                    </td>
                    {isResearcherView && (
                      <td className="right actions">
                        <div className="action-menu">
                          <button
                            className="menu-button"
                            onClick={() =>
                              setOpenMenu(openMenu === req.id ? null : req.id)
                            }
                          >
                            <LuEllipsis size={18} />
                          </button>

                          {openMenu === req.id && (
                            <div className="menu-dropdown">
                              <button
                                className="menu-item"
                                onClick={() => {
                                  const action =
                                    req.status === "active" ? "deactivate" : "activate";

                                  if (
                                    !window.confirm(
                                      `Are you sure you want to ${action} this researcher?`
                                    )
                                  )
                                    return;

                                  toggleResearcherStatus(req.id, req.status);
                                  setOpenMenu(null);
                                }}
                              >
                                {req.status === "active" ? (
                                  <PowerOff size={14} />
                                ) : (
                                  <Power size={14} />
                                )}
                                {req.status === "active"
                                  ? "Deactivate"
                                  : "Activate"}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                    {!isResearcherView && (
                      <td className="center actions">
                        {req.status === "pending" && (
                          rejectingId !== req.id ? (
                            <>
                              <button
                                className="approve-btn"
                                onClick={() => approveRequest(req.id)}
                              >
                                <CheckCircle size={16} /> Approve
                              </button>

                              <button
                                className="reject-btn"
                                onClick={() => handleRejectStart(req.id)}
                              >
                                <XCircle size={16} /> Reject
                              </button>
                            </>
                          ) : (
                            <div className="reject-box">
                              <textarea
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                placeholder="Enter reason..."
                                rows={3}
                                autoFocus
                              />
                              <div className="reject-actions">
                                <button
                                  className="cancel-btn"
                                  onClick={handleRejectCancel}
                                >
                                  Cancel
                                </button>
                                <button
                                  className="confirm-btn"
                                  disabled={!rejectReason.trim()}
                                  onClick={() => handleRejectConfirm(req.id)}
                                >
                                  Confirm
                                </button>
                              </div>
                            </div>
                          )
                        )}
                      {req.status === "approved" && (
                        <button
                          className="view-btn"
                          onClick={() => setModalResearcher(req)}
                          title="View Details"
                        >
                          <FiEye size={18} />
                        </button>
                      )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
        </table>
        {modalResearcher && (
          <div
            className="verification-modal-backdrop"
            onClick={() => setModalResearcher(null)}
          >
            <div
              className="verification-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="close-modal"
                onClick={() => setModalResearcher(null)}
              >
                <FiX size={20} />
              </button>

              <h2>Researcher Request Details</h2>

              <p><strong>Full Name:</strong> {modalResearcher.fullName}</p>
              <p><strong>Email:</strong> {modalResearcher.email}</p>
              <p>  <strong>Status:</strong> {modalResearcher.status.charAt(0).toUpperCase() + modalResearcher.status.slice(1)}</p>

              <p><strong>Created At:</strong> {modalResearcher.createdAt}</p>

              {modalResearcher.reviewedAt && (
                <p><strong>Reviewed At:</strong> {modalResearcher.reviewedAt}</p>
              )}

              <p><strong>Purpose:</strong></p>
              <div className="modal-box">
                {modalResearcher.purpose || "No purpose provided."}
              </div>

              <p><strong>Organization / School:</strong></p>
              <div className="modal-box">
                {modalResearcher.orgSchool || "Not specified."}
              </div>

              <p><strong>Attachment:</strong></p>
              <div className="modal-box">
                {modalResearcher.attachment ? (
                  <a
                    href={modalResearcher.attachment}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Attachment
                  </a>
                ) : (
                  "No attachment uploaded."
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {renderPagination()}
    </>
  );
};

export default ResearcherRequestsTab;