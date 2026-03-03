import '../../pages/admin/UserMgmtPage.css';
import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle } from "lucide-react";
// import { LuEllipsis } from "react-icons/lu";
import { FiEye, FiX, FiSearch} from "react-icons/fi";
import { formatDistanceToNow } from "date-fns";
import placeholderImg from '../../assets/placeholder_img/SampleID.png';
import { LuEllipsis } from 'react-icons/lu';

const API_URL = import.meta.env.VITE_API_URL;

export type VerificationStatus = "Pending" | "Approved" | "Rejected";

export interface VerificationRequest {
  id: number;
  citizen_id: number;
  citizen_name: string;
  barangay: string;
  barangay_id?: string | null;
  address: string;
  id_image: string;
  status: VerificationStatus;
  rejection_reason?: string | null;
  created_at: string;
  reviewed_at?: string | null;
}

interface Props {
  pageSize?: number;
  onPendingCountChange?: (count: number) => void;
}

const VerificationRequestsTab: React.FC<Props> = ({ pageSize = 5, onPendingCountChange }) => {
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [modalVerification, setModalVerification] = useState<VerificationRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  
  const fetchVerifications = async (page = 1) => {
    try {
      setLoading(true);

      const token = localStorage.getItem("access_token");
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("page_size", pageSize.toString());

      if (debouncedSearch) params.append("search", debouncedSearch); 

      const res = await fetch(
        `${API_URL}/api/admin/resident-verifications/?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      const mapped: VerificationRequest[] = data.results.map((v: any) => ({
        id: v.id,
        citizen_id: v.citizen_id,
        citizen_name: v.citizen_name,
        barangay: v.barangay,
        barangay_id: v.barangay_id,
        address: v.address,
        id_image: v.id_image,
        status: (v.status.charAt(0).toUpperCase() + v.status.slice(1)) as VerificationStatus,
        rejection_reason: v.rejection_reason,
        created_at: v.created_at,
        reviewed_at: v.reviewed_at,
      }));

      setVerifications(mapped);
      setCurrentPage(page);
      setTotalPages(Math.ceil(data.count / pageSize));

      if (onPendingCountChange) {
        onPendingCountChange(mapped.filter((v) => v.status === "Pending").length);
      }
    } catch (err) {
      console.error("Error fetching verifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => { fetchVerifications(1); }, [debouncedSearch]);

  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!modalVerification?.id_image) return;

    const fetchSignedUrl = async () => {
      const token = localStorage.getItem("access_token");

      // Get relative path
      const url = new URL(modalVerification.id_image);
      const relativePath = url.pathname;

      try {
        const res = await fetch(
          `${API_URL}/api/get-signed-url/?path=${encodeURIComponent(relativePath)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("Failed to fetch signed URL");
        const data = await res.json();
        setSignedUrl(data.url);
      } catch (err) {
        console.error(err);
      }
    };

    fetchSignedUrl();
  }, [modalVerification]);


  /* =========================
    APPROVE / REJECT
  ========================= */
  const updateStatus = async (id: number, action: "approve" | "reject", reason?: string) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/admin/resident-verifications/${id}/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      if (!res.ok) throw new Error("Failed to update status");

      // Update local state
      const updated = verifications.map(v =>
        v.id === id
          ? {
            ...v,
            status: (action === "approve" ? "Approved" : "Rejected") as VerificationStatus
          }
          : v
      );
      setVerifications(updated);
      setModalVerification(null); // close modal

      if (onPendingCountChange) {
        onPendingCountChange(updated.filter(v => v.status === "Pending").length);
      }
    } catch (err) {
      console.error("Error updating verification:", err);
    }
  };

  const approveVerification = (id: number) => updateStatus(id, "approve");

  // Reject function with confirmation popup
  const rejectVerification = (id: number) => {
    if (!rejectReason.trim()) {
      alert("Please provide a rejection reason.");
      return;
    }

    const confirmReject = window.confirm(
      "Are you sure you want to reject this verification request? This action cannot be undone."
    );
    if (!confirmReject) return;

    updateStatus(id, "reject", rejectReason);
    setRejectReason(""); // clear input
  };

  /* =========================
     PAGINATION
  ========================= */
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    fetchVerifications(page);
  };

  const renderPagination = () => (
    <div className="pagination-wrapper">
      <div className="pagination">
        <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>Prev</button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
          <button key={n} className={n === currentPage ? "active" : ""} onClick={() => handlePageChange(n)}>{n}</button>
        ))}
        <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
      </div>
    </div>
  );


  return (
    <>
      {/* =========================
          SEARCH BAR
      ========================= */}
      <div className="filters">
        <div className="filters-left">
          {/* Optional: Add filters if needed */}
        </div>
        <div className="filters-right">
          <div className="search-wrapper">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by citizen name..."
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
                <FiX />
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="verification-table-wrapper">
        <table>
          <thead>
            <tr>
              {/* <th>#</th> */}
              {/* <th className="center">Citizen ID</th> */}
              <th className="center">Citizen Name</th>
              <th className="center">Barangay</th>
              {/* <th className="center">Full Address</th> */}
              {/* <th className="center">Barangay ID</th> */}
              <th className="center">Requested At</th>
              <th className="center">Status</th>
              <th className="center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className='empty'>
                  Loading verification requests...
                </td>
              </tr>
            ) : verifications.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty">No citizen request found.</td>
              </tr>
            ) : (
              verifications.map((v) => (
                <tr key={v.id}>
                  {/* <td className="cell-number">{(currentPage - 1) * pageSize + index + 1}</td> */}
                  {/* <td className="center muted">{v.citizen_id}</td> */}
                  <td className="user-name">{v.citizen_name}</td>
                  <td className="center">{v.barangay}</td>
                  {/* <td className="center muted">{v.address}</td> */}
                  {/* <td className="center muted">
                    {v.id_image ? (
                      <a
                        href={`http://127.0.0.1:8000/api/get-signed-url/?path=${encodeURIComponent(v.id_image)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View ID
                      </a>
                    ) : "N/A"}
                  </td> */}
                  <td className="center muted">{formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}</td>
                  <td className="center"><span className={`badge ${v.status}`}>{v.status}</span></td>
                  {/* =========================
                      ACTIONS COLUMN
                  ========================= */}
                  <td className="center actions">
                    <div className="action-menu">
                      <button
                        className="menu-button"
                        onClick={() =>
                          setOpenMenu(openMenu === v.id ? null : v.id)
                        }
                      >
                        <LuEllipsis size={18} />
                      </button>

                      {openMenu === v.id && (
                        <div className="menu-dropdown">
                          {/* View Details */}
                          <button
                            className="menu-item"
                            onClick={() => {
                              setModalVerification(v);
                              setOpenMenu(null);
                            }}
                          >
                            <FiEye size={14} /> View
                          </button>

                          {/* Approve / Reject only if Pending */}
                          {v.status === "Pending" && (
                            <>
                              <button
                                className="menu-item"
                                onClick={() => {
                                  approveVerification(v.id);
                                  setOpenMenu(null);
                                }}
                              >
                                <CheckCircle size={14} /> Approve
                              </button>

                              <button
                                className="menu-item"
                                onClick={() => {
                                  setModalVerification(v);
                                  setRejectReason("");
                                  setOpenMenu(null);
                                }}
                              >
                                <XCircle size={14} /> Reject
                              </button>
                            </>
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
      </div>

      {renderPagination()}

      {/* =========================
          VERIFICATION DETAILS MODAL
      ========================= */}
      {modalVerification && (
        <div
          className="verification-modal-backdrop"
          onClick={() => setModalVerification(null)}
        >
          <div
            className="verification-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Resident Verification Details</h2>
            <p><strong>Citizen Name:</strong> {modalVerification.citizen_name}</p>
            <p><strong>Citizen ID:</strong> {modalVerification.citizen_id}</p>
            <p><strong>Barangay:</strong> {modalVerification.barangay}</p>
            <p><strong>Address:</strong> {modalVerification.address}</p>
            <p><strong>Status:</strong> {modalVerification.status}</p>
            {modalVerification.rejection_reason && (
              <p><strong>Rejection Reason:</strong> {modalVerification.rejection_reason}</p>
            )}
            <p><strong>Requested At:</strong> {new Date(modalVerification.created_at).toLocaleString()}</p>
            <p><strong>Barangay ID:</strong></p>
            <img
              src={signedUrl || placeholderImg}
              alt="Barangay ID"
              className="clickable"
              onClick={() => setIsImageModalOpen(true)}
            />
            {/* Image Lightbox Modal */}
            {isImageModalOpen && (
              <div
                className="image-modal-backdrop"
                onClick={() => setIsImageModalOpen(false)}
              >
                <img
                  src={signedUrl || placeholderImg}
                  alt="Enlarged ID"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            {modalVerification.status === "Pending" && (
              <div className="verification-modal-actions" style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginTop: "10px" }}>

                {/* Approve Button */}
                <button
                  className="approve-btn"
                  onClick={() => approveVerification(modalVerification.id)}
                  style={{ flex: "1" }}
                >
                  <CheckCircle size={16} /> Approve
                </button>

                {/* Reject Toggle */}
                <button
                  className="reject-btn"
                  onClick={() => setRejectReason(prev => prev ? prev : "")} // just triggers textarea display
                  style={{ flex: "1" }}
                >
                  <XCircle size={16} /> Reject
                </button>
              </div>
            )}

            {/* Reject textarea + confirm button only show if rejectReason toggle is active */}
            {rejectReason !== "" && modalVerification.status === "Pending" && (
              <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "5px" }}>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter rejection reason..."
                  rows={3}
                />
                <button
                  className="reject-btn"
                  onClick={() => rejectVerification(modalVerification.id)}
                  disabled={!rejectReason.trim()}
                >
                  <XCircle size={16} /> Confirm Reject
                </button>
              </div>
            )}

            <button
              className="close-modal"
              onClick={() => {
                setModalVerification(null);
                setRejectReason(""); // reset reject toggle
              }}
              aria-label="Close"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default VerificationRequestsTab;
