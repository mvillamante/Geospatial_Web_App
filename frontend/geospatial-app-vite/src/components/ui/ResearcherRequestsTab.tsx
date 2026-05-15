import '../../pages/admin/UserMgmtPage.css';
import { FiCheckCircle, FiEye, FiSearch, FiX } from "react-icons/fi";
import { LuEllipsis } from "react-icons/lu";
import React, { useState, useEffect, useRef } from "react";
import { CheckCircle, XCircle, Power, PowerOff } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL;

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'active' | 'inactive';

export interface ResearcherRequest {
  id: number;
  type: "request" | "researcher";
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  email: string;

  createdAt: string;
  reviewedAt?: string;
  lastlogin?: string;

  purpose: string;
  orgSchool: string;
  attachment?: string;
  status: RequestStatus;

  rejectionReason?: string;
}

interface Props {
  pageSize: number;
  onPendingCountChange: (count: number) => void;
  refreshUsers?: () => void;
}

const ResearcherRequestsTab: React.FC<Props> = ({ pageSize = 10, onPendingCountChange }) => {
  const [requests, setRequests] = useState<ResearcherRequest[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);

  const [rejectReason, setRejectReason] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("pending");
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  const [modalResearcher, setModalResearcher] = useState<ResearcherRequest | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<number, string>>({});
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const rejectBoxRef = useRef<HTMLDivElement | null>(null);
  const [showRejectBox, setShowRejectBox] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    type: "approve" | "reject" | "activate" | "deactivate" | null;
    onConfirm: (() => void) | null;
  }>({
    open: false,
    title: "",
    message: "",
    type: null,
    onConfirm: null,
  });

  const isResearcherView =
    statusFilter === "active" || statusFilter === "inactive";

  const normalizeStatus = (r: any): RequestStatus => {
    const raw = (r.status || "").toLowerCase();

    // if backend returns rejection reason, force rejected
    if (r.rejection_reason || r.reason) return "rejected";

    if (raw === "reject") return "rejected";
    if (raw === "rejected") return "rejected";
    if (raw === "pending") return "pending";
    if (raw === "approved") return "approved";
    if (raw === "active") return "active";
    if (raw === "inactive") return "inactive";

    return "pending";
  };

  // Fetch requests
  const fetchRequests = async (page = 1) => {
    try {
      setLoading(true);

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
        firstName: r.first_name,
        middleName: r.middle_name,
        lastName: r.last_name,
        fullName: `${r.first_name} ${r.middle_name ? r.middle_name + " " : ""}${r.last_name}`,
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

        status: normalizeStatus(r),
        purpose: r.purpose,
        orgSchool: r.orgSchool,
        attachment: r.attachment || undefined,
        rejectionReason: r.rejection_reason || r.reason || undefined,
      }));

      setRequests(mapped);
      setCurrentPage(page);
      setTotalPages(Math.ceil(data.count / pageSize));

      onPendingCountChange?.(mapped.filter(r => r.status === "pending").length);

    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(1);
  }, [debouncedSearch, statusFilter, pageSize]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch signed URLs
  useEffect(() => {
    if (requests.length === 0) return;

    const fetchUrls = async () => {
      const token = localStorage.getItem("access_token");
      const updated: Record<number, string> = {};

      for (const req of requests) {
        if (!req.attachment) continue;

        try {
          const res = await fetch(
            `${API_URL}/api/admin/researcher/${req.id}/attachment/`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (!res.ok) continue;
          const data = await res.json();
          updated[req.id] = data.url;
        } catch (err) {
          console.error(err);
        }
      }

      setSignedUrls(updated);
    };

    fetchUrls();
  }, [requests]);

  const openConfirm = (
    title: string,
    message: string,
    type: "approve" | "reject" | "activate" | "deactivate",
    onConfirm: () => void
  ) => {
    setConfirmModal({
      open: true,
      title,
      message,
      type,
      onConfirm,
    });
  };

  const closeConfirm = () => {
    setConfirmModal({ open: false, title: "", message: "", type: null, onConfirm: null });
    setRejectReason("");
  };

  const approveRequest = async (id: number) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/admin/researcher_requests/${id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "approve" }),
      });

      if (!res.ok) throw new Error("Failed to approve request");

      toast.success(`Request approved.\nEmail has been sent to ${req.email}.`);

      await fetchRequests(currentPage);

    } catch (err) {
      console.error(err);
      toast.error("Failed to approve request.");
    }
  };

  const rejectRequest = async (id: number, reason: string) => {
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

      toast.success(`Request rejected.\nReason: ${reason}`);

      setModalResearcher(null);
      setShowRejectBox(false);
      setRejectReason("");

      await fetchRequests(currentPage);

    } catch (err) {
      console.error(err);
      toast.error("Failed to reject request.");
    }
  };

  const toggleResearcherStatus = async (id: number, currentStatus: RequestStatus) => {
    const action = currentStatus === "active" ? "deactivate" : "activate";

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

      toast.success(`Successfully ${action}d the researcher.`);
      await fetchRequests(currentPage);

    } catch (err) {
      console.error(err);
      toast.error("Failed to update researcher status.");
    }
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="rejected">Rejected</option>
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
              <th className="center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="empty">
                  Loading researchers...
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty">
                  No records found.
                </td>
              </tr>
            ) : (
              requests.map(req => (
                <tr key={req.id}>
                  <td className="user-name">
                    {req.firstName} {req.lastName}
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
                      <td className="center muted">{req.purpose || "-"}</td>
                      <td className="center muted">{req.orgSchool || "-"}</td>
                    </>
                  )}

                  <td className="center">
                    <span className={`badge ${req.status}`}>
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </span>
                  </td>

                  <td className="center actions">
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
                        <div className="kebab-dropdown">

                          <button
                            className="dropdown-item view-details"
                            onClick={() => {
                              setModalResearcher(req);
                              setOpenMenu(null);
                              setShowRejectBox(false);
                              setRejectReason("");
                            }}
                          >
                            <FiEye size={14} /> View Full Details
                          </button>

                          {isResearcherView && (
                            <button
                              className="dropdown-item view-details"
                              onClick={() => {
                                const isActive = req.status === "active";
                                const action = isActive ? "Deactivate" : "Activate";

                                openConfirm(
                                  `${action} Researcher`,
                                  `Are you sure you want to ${action.toLowerCase()} ${req.fullName}?`,
                                  isActive ? "deactivate" : "activate",
                                  () => toggleResearcherStatus(req.id, req.status)
                                );

                                setOpenMenu(null);
                              }}
                            >
                              {req.status === "active" ? (
                                <PowerOff size={14} />
                              ) : (
                                <Power size={14} />
                              )}
                              {req.status === "active" ? "Deactivate" : "Activate"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {modalResearcher && (
          <div
            className="verification-modal-backdrop"
            onClick={() => {
              setModalResearcher(null);
              setShowRejectBox(false);
              setRejectReason("");
            }}
          >
            <div
              className="verification-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="close-modal"
                onClick={() => {
                  setModalResearcher(null);
                  setShowRejectBox(false);
                  setRejectReason("");
                }}
              >
                <FiX size={20} />
              </button>

              <h2>Researcher Request Details</h2>

              <p><strong>First Name:</strong> {modalResearcher.firstName}</p>
              <p><strong>Middle Name:</strong> {modalResearcher.middleName || "—"}</p>
              <p><strong>Last Name:</strong> {modalResearcher.lastName}</p>
              <p><strong>Email:</strong> {modalResearcher.email}</p>

              <p><strong>Status:</strong> {modalResearcher.status.charAt(0).toUpperCase() + modalResearcher.status.slice(1)}</p>
              <p><strong>Created At:</strong> {modalResearcher.createdAt}</p>

              {modalResearcher.status === "rejected" && (
                <div className="modal-box-grp">
                  <p><strong>Rejection Reason:</strong></p>
                  <div className="modal-box">
                    {modalResearcher.rejectionReason || "No reason provided."}
                  </div>
                </div>
              )}

              {modalResearcher.reviewedAt && (
                <p><strong>Reviewed At:</strong> {modalResearcher.reviewedAt}</p>
              )}

              <div className="modal-box-grp">
                <p><strong>Purpose:</strong></p>
                <div className="modal-box">
                  {modalResearcher.purpose || "No purpose provided."}
                </div>
              </div>

              <div className="modal-box-grp">
                <p><strong>Organization / School:</strong></p>
                <div className="modal-box">
                  {modalResearcher.orgSchool || "Not specified."}
                </div>
              </div>

              <div className="modal-box-grp">
                <p><strong>Attachment:</strong></p>
                <div className="modal-box">
                  {modalResearcher.attachment ? (
                    <img
                      src={signedUrls[modalResearcher.id]}
                      alt="Attachment"
                      style={{ maxWidth: "100%", maxHeight: "300px", objectFit: "contain", cursor: "pointer" }}
                      onClick={() => setIsImageModalOpen(true)}
                    />
                  ) : "No attachment uploaded."}
                </div>

                {isImageModalOpen && (
                  <div
                    className="image-modal-backdrop"
                    onClick={() => setIsImageModalOpen(false)}
                  >
                    <button
                      className="close-image-btn"
                      onClick={() => setIsImageModalOpen(false)}
                    >
                      <FiX size={20} />
                    </button>

                    <img
                      src={signedUrls[modalResearcher.id]}
                      alt="Enlarged Attachment"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
              </div>

              {/* APPROVE / REJECT ACTIONS */}
              {modalResearcher.status === "pending" && (
                <>
                  <div className="verification-modal-actions">

                    <button
                      className="approve-btn"
                      onClick={() => {
                        openConfirm(
                          "Approve Request",
                          `Are you sure you want to approve ${modalResearcher.fullName}?`,
                          "approve",
                          () => approveRequest(modalResearcher.id)
                        );
                      }}
                    >
                      <CheckCircle size={16} /> Approve
                    </button>

                    <button
                      className="reject-btn"
                      onClick={() => {
                        setShowRejectBox(true);

                        setTimeout(() => {
                          rejectBoxRef.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "nearest",
                          });
                        }, 100);
                      }}
                    >
                      <XCircle size={16} /> Reject
                    </button>

                  </div>

                  {showRejectBox && (
                    <div
                      className="reject-box-modal"
                      ref={rejectBoxRef}
                    >
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Enter rejection reason..."
                        className="reject-textarea"
                        rows={3}
                        autoFocus
                      />

                      <div className="reject-actions">
                        <button
                          className="cancel-btn"
                          onClick={() => {
                            setShowRejectBox(false);
                            setRejectReason("");
                          }}
                        >
                          Cancel
                        </button>

                        <button
                          className="confirm-reject-btn"
                          disabled={!rejectReason.trim()}
                          onClick={() => {
                            openConfirm(
                              "Reject Request",
                              `Are you sure you want to reject ${modalResearcher.fullName}?`,
                              "reject",
                              () => rejectRequest(modalResearcher.id, rejectReason)
                            );
                            setShowRejectBox(false);
                          }}
                        >
                          Confirm Reject
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* CONFIRMATION MODAL */}
        {confirmModal.open && (
          <div className="verification-modal-backdrop">
            <div className="verification-modal" style={{ maxWidth: "420px" }}>
              <h2
                className={`modal-title ${confirmModal.type === "approve" || confirmModal.type === "activate"
                  ? "approve"
                  : "reject"
                  }`}
              >
                {confirmModal.title}
              </h2>

              <p style={{ marginTop: "10px" }}>
                {confirmModal.message}
              </p>

              <div className="verification-modal-actions" style={{ marginTop: "20px" }}>
                <button
                  className="cancel-btn"
                  onClick={closeConfirm}
                >
                  Cancel
                </button>

                <button
                  className="confirm-btn"
                  onClick={() => {
                    const action = confirmModal.onConfirm;
                    closeConfirm();
                    action?.();
                  }}
                >
                  Confirm
                </button>
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