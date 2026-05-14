import '../../pages/admin/UserMgmtPage.css'
import React, { useState, useEffect, useRef } from "react"
import { CheckCircle, XCircle, Power, PowerOff } from "lucide-react"
import { FiEye, FiX, FiSearch, FiCheckCircle } from "react-icons/fi"
import { LuEllipsis } from "react-icons/lu"
import { format, formatDistanceToNow } from "date-fns"
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL

interface VerificationDetails {
  id: number
  status: "pending" | "approved" | "rejected"
  barangay: string
  address: string
  id_image: string
  rejection_reason?: string
  created_at: string
  reviewed_at?: string
}

interface Citizen {
  citizen_id: number
  citizen_name: string
  barangay: string
  phone: string
  date_joined: string
  lastlogin?: string
  is_active: boolean
  is_resident_verified: boolean
  verification?: VerificationDetails | null
}

interface Props {
  pageSize?: number;
  onPendingCountChange: React.Dispatch<React.SetStateAction<number>>;
}

const VerificationRequestsTab: React.FC<Props> = ({ onPendingCountChange }) => {

  const [citizens, setCitizens] = useState<Citizen[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm)
  const rejectBoxRef = useRef<HTMLDivElement | null>(null)
  const [statusFilter, setStatusFilter] = useState<
    "pending" | "verified" | "not_verified" | "rejected" | "all"
  >("pending");

  const [modalCitizen, setModalCitizen] = useState<Citizen | null>(null)
  const [openMenu, setOpenMenu] = useState<number | null>(null)

  const [rejectReason, setRejectReason] = useState("")
  const [showRejectBox, setShowRejectBox] = useState(false)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  /* ===============================
      FETCH CITIZENS
  =============================== */

  const fetchCitizens = async () => {

    try {

      setLoading(true)

      const token = localStorage.getItem("access_token")
      const params = new URLSearchParams()

      params.append("status", statusFilter)

      const res = await fetch(
        `${API_URL}/api/admin/resident-verifications/?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (!res.ok) throw new Error("Failed to fetch citizens")

      const data = await res.json()

      let mapped: Citizen[] = data.results.map((c: any) => ({
        citizen_id: c.citizen_id,
        citizen_name: `${c.first_name} ${c.last_name}`,
        barangay: c.barangay,
        phone: c.phone,
        date_joined: c.date_joined,
        lastlogin: c.last_login
          ? formatDistanceToNow(new Date(c.last_login), { addSuffix: true })
          : "Never",
        is_active: c.is_active,
        is_resident_verified: c.is_resident_verified,
        verification: c.verification || null,
      }));

      setCitizens(mapped);
      const pendingCount = mapped.filter(
        (c) => c.verification?.status === "pending"
      ).length;

      onPendingCountChange(pendingCount);
    } catch (err) {
      console.error("Error fetching citizens:", err);
    } finally {
      setLoading(false);
    }

  }

  /* ===============================
      SEARCH DEBOUNCE
  =============================== */

  useEffect(() => {

    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 400)

    return () => clearTimeout(handler)

  }, [searchTerm])

  useEffect(() => {

    fetchCitizens()

  }, [statusFilter])

  /* ===============================
      APPROVE / REJECT
  =============================== */

  const updateStatus = async (verificationId: number, action: "approve" | "reject") => {

    try {

      const token = localStorage.getItem("access_token")

      await fetch(`${API_URL}/api/admin/resident-verifications/${verificationId}/`, {

        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action,
          reason: rejectReason
        })

      })

      fetchCitizens()
      toast.success(action === "approve" ? "Citizen verification approved successfully." : "Citizen verification rejected successfully.")
      setModalCitizen(null)

    } catch (err) {

      console.error(err)
      toast.error("Failed to update verification.")
    }

  }

  /* ===============================
      ACTIVATE / DEACTIVATE
  =============================== */

  const toggleCitizenStatus = async (id: number, currentStatus: boolean) => {

    const action = currentStatus ? "deactivated" : "activated";

    try {

      const token = localStorage.getItem("access_token")

      const res = await fetch(`${API_URL}/api/admin/users/${id}/toggle-status/`, {

        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`
        }

      })
      if (!res.ok) throw new Error("Failed to update status")
      fetchCitizens()
      toast.success(`Citizen ${action} successfully.`)

    } catch (err) {

      console.error(err)
      toast.error("Failed to update citizen status.")
    }

  }

  /* ===============================
      TABLE
  =============================== */

  return (
    <>
      {/* SEARCH BAR */}

      <div className="filters">
        <div className="filters-left">
          <div className="select-wrapper">
            <FiCheckCircle className="select-icon" />

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as
                  | "pending"
                  | "verified"
                  | "not_verified"
                  | "rejected"
                  | "all"
                )
              }
              className="status-select"
            >
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              {/* <option value="not_verified">Not Verified</option> */}
              <option value="rejected">Rejected</option>
              <option value="all">All</option>
            </select>
          </div>
        </div>

        <div className="filters-right">
          <div className="search-wrapper">
            <FiSearch className="search-icon" />

            <input
              type="text"
              placeholder="Search citizen, barangay, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />

            {searchTerm && (
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

      {/* TABLE */}

      <div className="verification-table-wrapper">

        <table>

          <thead>
            <tr>
              <th className="center">Citizen</th>
              <th className="center">Barangay</th>
              {/* <th className="center">Date Joined</th>
              <th className="center">Last Login</th> */}
              {/* <th className="center">Verification</th> */}
              <th className="center">Status</th>
              <th className="center">Actions</th>
            </tr>
          </thead>

          <tbody>

            {loading ? (

              <tr>
                <td colSpan={7} className="empty">
                  Loading citizens...
                </td>
              </tr>

            ) : citizens.length === 0 ? (

              <tr>
                <td colSpan={7} className="empty">
                  No citizens found.
                </td>
              </tr>

            ) : (

              citizens
                .filter((c) => {
                  const search = searchTerm.toLowerCase();

                  const matchesSearch =
                    c.citizen_name.toLowerCase().includes(search) ||
                    c.barangay?.toLowerCase().includes(search) ||
                    (c.is_active ? "active" : "inactive")
                      .toLowerCase()
                      .includes(search);

                  if (!matchesSearch) return false;

                  if (statusFilter === "all") return true;

                  const v = c.verification;

                  if (statusFilter === "pending") {
                    return v?.status === "pending";
                  }

                  if (statusFilter === "verified") {
                    return v?.status === "approved";
                  }

                  if (statusFilter === "rejected") {
                    return v?.status === "rejected";
                  }

                  if (statusFilter === "not_verified") {
                    return !v;
                  }

                  return true;
                })
                .map((c) => (

                  <tr key={c.citizen_id}>

                    <td className="user-name">{c.citizen_name}</td>

                    <td className="center muted">{c.barangay || "---"}</td>

                    {/* <td className="center muted">
                    {format(new Date(c.date_joined), "MMMM d, yyyy")}
                  </td> */}

                    {/* <td className="center muted">{c.lastlogin || "Never"}</td> */}

                    {/* Verification */}
                    {/* <td className="center">
                    {c.verification ? (
                      c.verification.status === "pending" ? (
                        <span className="badge Pending">Pending</span>
                      ) : c.verification.status === "approved" ? (
                        <span className="badge Approved">Verified</span>
                      ) : (
                        <span className="badge Rejected">Rejected</span>
                      )
                    ) : c.is_resident_verified ? (
                      <span className="badge Approved">Verified</span>
                    ) : (
                      <span className="badge Pending">Not Verified</span>
                    )}
                  </td> */}

                    {/* Status */}
                    <td className="center">
                      {c.is_active ? (
                        <span className="badge Approved">Active</span>
                      ) : (
                        <span className="badge Rejected">Inactive</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="center actions">

                      <div className="action-menu">

                        <button
                          className="menu-button"
                          onClick={() =>
                            setOpenMenu(openMenu === c.citizen_id ? null : c.citizen_id)
                          }
                        >
                          <LuEllipsis size={18} />
                        </button>

                        {openMenu === c.citizen_id && (

                          <div className="kebab-dropdown">

                            {c.verification && (
                              <button
                                className="dropdown-item view-details"
                                onClick={() => {
                                  setModalCitizen(c)
                                  setOpenMenu(null)
                                }}
                              >
                                <FiEye size={14} /> View Full Details
                              </button>
                            )}

                            {c.verification?.status !== "pending" && (
                              <button
                                className="dropdown-item view-details"
                                onClick={() => toggleCitizenStatus(c.citizen_id, c.is_active)}
                              >
                                {c.is_active ? <PowerOff size={14} /> : <Power size={14} />}
                                {c.is_active ? "Deactivate" : "Activate"}
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

      </div>

      {/* ===============================
          MODAL
      =============================== */}

      {modalCitizen && modalCitizen.verification && (

        <div
          className="verification-modal-backdrop"
          onClick={() => setModalCitizen(null)}
        >

          <div
            className="verification-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <h2>Verification Details</h2>
            <div className="info-grid">

              <div className="info-row">
                <span className="info-label">Name</span>
                <span className="info-value">{modalCitizen.citizen_name}</span>
              </div>

              <div className="info-row">
                <span className="info-label">Phone</span>
                <span className="info-value">{modalCitizen.phone || "N/A"}</span>
              </div>

              <div className="info-row">
                <span className="info-label">Barangay</span>
                <span className="info-value">{modalCitizen.verification.barangay}</span>
              </div>

              <div className="info-row">
                <span className="info-label">Last Login</span>
                <span className="info-value">{modalCitizen.lastlogin || "Never"}</span>
              </div>

              <div className="info-row">
                <span className="info-label">Date Joined</span>
                <span className="info-value">
                  {format(new Date(modalCitizen.date_joined), "MMMM d, yyyy")}
                </span>
              </div>

            </div>


            {modalCitizen.verification.id_image ? (
              <div className="modal-box">
                <p><strong>ID Image:</strong></p>
                <img
                  src={modalCitizen.verification.id_image}
                  alt={`${modalCitizen.citizen_name} ID`}
                  style={{ maxWidth: "100%", maxHeight: "300px", objectFit: "contain", cursor: "pointer", borderRadius: "8px" }}
                  onClick={() => setIsImageModalOpen(true)}
                />
              </div>
            ) : (
              <p className="muted">No ID image available.</p>
            )}

            {isImageModalOpen && modalCitizen.verification.id_image && (
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
                  src={modalCitizen.verification.id_image}
                  alt={`${modalCitizen.citizen_name} ID Enlarged`}
                  onClick={(e) => e.stopPropagation()}
                  style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain" }}
                />
              </div>
            )}

            {modalCitizen.verification.rejection_reason && (

              <p>
                <strong>Rejection Reason:</strong>
                {modalCitizen.verification.rejection_reason}
              </p>

            )}

            {modalCitizen.verification.status === "pending" && (

              <div className="verification-modal-actions">

                <button
                  className="approve-btn"
                  onClick={() =>
                    updateStatus(modalCitizen.verification!.id, "approve")
                  }
                >
                  <CheckCircle size={16} /> Approve
                </button>

                <button
                  className="reject-btn"
                  onClick={() => {
                    setShowRejectBox(true)

                    setTimeout(() => {
                      rejectBoxRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "nearest",
                      })
                    }, 100)
                  }}
                >
                  <XCircle size={16} /> Reject
                </button>

              </div>

            )}

            {/* Only show reject box when status is pending and Reject clicked */}
            {modalCitizen.verification.status === "pending" && showRejectBox && (
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
                    className="confirm-btn"
                    disabled={!rejectReason.trim()}
                    onClick={() =>
                      updateStatus(modalCitizen.verification!.id, "reject")
                    }
                  >
                    Confirm Reject
                  </button>
                </div>
              </div>
            )}

            <button
              className="close-modal"
              onClick={() => setModalCitizen(null)}
            >
              <FiX size={20} />
            </button>

          </div>

        </div>

      )}

    </>
  )

}

export default VerificationRequestsTab