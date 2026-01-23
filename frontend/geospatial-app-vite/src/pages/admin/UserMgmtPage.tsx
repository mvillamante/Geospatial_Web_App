import './UserMgmtPage.css';
import { useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from 'date-fns';
import { Power, PowerOff, CheckCircle, XCircle, CircleChevronDown } from 'lucide-react';
import { LuEllipsis } from "react-icons/lu";
import { FaUserSlash } from "react-icons/fa";
import { FiSearch, FiPlus, FiUser, FiCheckCircle } from "react-icons/fi";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi";
import { HiChevronUpDown, HiChevronDown, HiChevronUp } from "react-icons/hi2";
import { getUserRoleAndDisplayName } from "../../libr/auth";
import CreateUserModal from '../../components/ui/Modals/CreateUserModal';

type Role = 'Researcher' | 'Officer' | 'Admin';
type Status = 'Active' | 'Inactive';
type RequestStatus = 'Pending' | 'Approved' | 'Rejected';

interface User {
  id: number;
  staff_id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: Status;
  extra_roles?: string[];
  dateJoined: string;
  lastLogin: string;
  lastLoginDisplay: string;
}

interface BackendUser {
  id: number;
  staff_id: string;
  username: string;
  email: string;
  phone: string;
  role: string;
  extra_roles?: string[];
  is_active: boolean;
  date_joined_display: string;
  last_login?: string;
  last_login_display?: string;
}

interface ResearcherRequest {
  id: number;
  userId: number;
  userName: string;
  date: string;
  status: RequestStatus;
}

const UserMgmtPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const pageSize = 10;

  const [requests, setRequests] = useState<ResearcherRequest[]>([]);
  const [requestsPage, setRequestsPage] = useState(1);
  const [requestsTotalPages, setRequestsTotalPages] = useState(1);

  const [tab, setTab] = useState<'users' | 'requests'>('users');
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [roleFilter, setRoleFilter] = useState<Role | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<Status | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<"dateJoined" | "lastLogin" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");


  /* GET CURRENT USER ROLE */
  const { userRole, currentUserId } = getUserRoleAndDisplayName(); // userRole2

  const filteredUsers = users.filter(user => {
    const roleMatch =
      roleFilter === 'All' || 
      user.role === roleFilter ||
      (roleFilter === 'Researcher' && user.extra_roles?.includes('Researcher'));

    const statusMatch =
      statusFilter === 'All' || user.status === statusFilter;

    const searchMatch =
      (user.name ?? "").toLowerCase().includes(searchTerm.toLowerCase());

    return roleMatch && statusMatch && searchMatch;
  });

  const fetchUsers = async (page = 1) => {
    try {
      const token = localStorage.getItem("access_token");

      const res = await fetch(`http://127.0.0.1:8000/api/admin/users/?page=${page}&page_size=${pageSize}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        console.error("Failed to fetch users");
        return;
      }

      const data = await res.json();

      const mappedUsers = data.results
        .filter((u: BackendUser) => {
          const roleLower = u.role?.toLowerCase() || "";
          const extraRoleLower = u.extra_roles?.[0]?.toLowerCase() || "";

          if (!roleLower) {
            return extraRoleLower === "researcher";
          }

          if (roleLower === "citizen") {
            return extraRoleLower === "researcher";
          }

          return roleLower === "officer" || roleLower === "admin";
        })
        .map((u: BackendUser): User => ({
          id: u.id,
          staff_id: u.staff_id,
          name: `${u.username}`,
          email: u.email,
          phone: u.phone,
          role: u.role 
            ? u.role.charAt(0).toUpperCase() + u.role.slice(1) 
            : "",
          extra_roles: u.extra_roles && u.extra_roles.length > 0
            ? u.extra_roles.map(r => r ?? "")
            : [],
          status: u.is_active ? "Active" : "Inactive",
          dateJoined: u.date_joined_display,
          lastLogin: u.last_login ?? "",
          lastLoginDisplay: u.last_login_display ?? "Never",
        })); 

      setUsers(mappedUsers);
      setCurrentPage(page);
      setTotalPages(Math.ceil(data.count / pageSize));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRequests = async (page = 1) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`http://127.0.0.1:8000/api/admin/researcher_requests/?page=${page}&page_size=${pageSize}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        console.error("Failed to fetch requests");
        return;
      }

      const data = await res.json();

      // Map backend data to frontend interface
      const mappedRequests = data.results.map((r: any) => ({
        id: r.id,
        userId: r.user,
        userName: r.username,
        date: formatDistanceToNow(new Date(r.requested_at), { addSuffix: true }),
        status: r.status as RequestStatus,
      }));

      setRequests(mappedRequests);
      setRequestsPage(page);
      setRequestsTotalPages(Math.ceil(data.count / pageSize)); // using DRF pagination count
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    (async () => {
      await fetchUsers();
      await fetchRequests();
    })();
  }, []);

  const tabsRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const activeIdx = tab === "users" ? 0 : 1;
    const activeTab = tabRefs.current[activeIdx];
    if (activeTab) {
      setUnderlineStyle({ left: activeTab.offsetLeft, width: activeTab.offsetWidth });
    }
  }, [tab]);

  const toggleStatus = async (id: number) => {
    try {
      const token = localStorage.getItem("access_token");

      const res = await fetch(`http://127.0.0.1:8000/api/admin/users/${id}/toggle-status/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || "Failed to toggle status");
        return;
      }

      setUsers(users.map(u =>
        u.id === id ? { ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' } : u
      ));
      window.alert("User status updated successfully.");
    } catch (err) {
      console.error("Toggle status failed:", err);
    }
  };

  const updateRole = async (id: number, newRole: Role) => {
    try {
      const token = localStorage.getItem("access_token");

      const res = await fetch(
        `http://127.0.0.1:8000/api/admin/users/${id}/role/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role: newRole.toLowerCase() }),
        }
      );

      if (!res.ok) {
        const contentType = res.headers.get("content-type");
        let errorMsg = "Something went wrong";

        if (contentType && contentType.includes("application/json")) {
          const err = await res.json();
          errorMsg = err.detail || JSON.stringify(err);
        }

        alert(errorMsg);
        return;
      }

      alert("Role has been updated.");

      const updatedUser = await res.json();
      setUsers(users.map(u => u.id === id ? updatedUser : u));
      await fetchUsers();
    } catch (err) {
      console.error("Role update failed:", err);
    }
  };

  const revokeResearcher = async (id: number) => {
    try {
      const token = localStorage.getItem("access_token");

      const res = await fetch(
        `http://127.0.0.1:8000/api/admin/users/${id}/revoke-researcher/`,
        { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) throw new Error("Failed");

      alert("Researcher access revoked.");
      
      const updatedUser = await res.json();
      setUsers(users.map(u => (u.id === id ? updatedUser : u)));

      await fetchUsers();
    } catch (err) {
      console.error(err);
      alert("Failed to revoke researcher.");
    }
  };

  const approveRequest = async (id: number) => {
    try {
      const token = localStorage.getItem("access_token");

      const res = await fetch(`http://127.0.0.1:8000/api/admin/researcher_requests/${id}/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "approve" }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || "Failed to approve request");
        return;
      }

      const updatedReq = await res.json();

      setRequests(requests.map(r => r.id === id ? { ...r, status: updatedReq.status } : r));

      const userId = updatedReq.user?.id ?? updatedReq.user;
      setUsers(prev =>
        prev.map(u =>
          u.id === userId
            ? { ...u, extra_roles: [...(u.extra_roles ?? [])] }
            : u
        )
      );

      await fetchUsers();
      await fetchRequests();

      alert(`The request from ${updatedReq.userName ?? "the user"} has been accepted.`);
    } catch (err) {
      console.error("Approve request failed:", err);
    }
  };

  const rejectRequest = async (id: number, reason: string) => {
    try {
      const token = localStorage.getItem("access_token");

      const res = await fetch(`http://127.0.0.1:8000/api/admin/researcher_requests/${id}/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "reject", reason }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || "Failed to reject request");
        return;
      }

      const updatedReq = await res.json();

      setRequests(prev =>
        prev.map(r => r.id === id ? { ...r, status: updatedReq.status } : r)
      );
      
      await fetchRequests();
      alert(`The request from ${updatedReq.userName ?? "the user"} has been rejected.`)

    } catch (err) {
      console.error("Reject request failed:", err);
    }
  };


  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortField || !sortOrder) return 0;

    const aVal = new Date(a[sortField]);
    const bVal = new Date(b[sortField]);

    return sortOrder === "asc" ? aVal.getTime() - bVal.getTime() : bVal.getTime() - aVal.getTime();
  });

  const handleSortClick = (field: "dateJoined" | "lastLogin") => {
    if (sortField !== field) {
      setSortField(field);
      setSortOrder("asc");
    } else {
      if (sortOrder === "asc") setSortOrder("desc");
      else if (sortOrder === "desc") setSortOrder(null);
      else setSortOrder("asc");
    }
  };

  const renderPagination = (
    currentPage: number,
    totalPages: number,
    onPageChange: (page: number) => void
  ) => {
    if (totalPages === 0) return null;

    return (
      <div className="pagination">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <HiChevronLeft size={18} /> Prev
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
          <button
            key={num}
            onClick={() => onPageChange(num)}
            className={num === currentPage ? "active" : ""}
          >
            {num}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next <HiChevronRight size={18} />
        </button>
      </div>
    );
  };

  return (
    <div className="user-page">
      <h1>User Management</h1>

      {/* Tabs */}
      <div className="user-tabs" ref={tabsRef}>
        <button ref={(el) => { tabRefs.current[0] = el; }} onClick={() => setTab('users')} className={tab === 'users' ? 'tab active' : 'tab'}>Users</button>
        <button ref={(el) => { tabRefs.current[1] = el; }} onClick={() => setTab('requests')} className={tab === 'requests' ? 'tab active' : 'tab'}>
          Researcher Requests
          {requests.filter(r => r.status === 'Pending').length > 0 && (
            <span className="request-count">
              {requests.filter(r => r.status === 'Pending').length}
            </span>
          )}
        </button>
        <span
          className="tab-underline"
          style={{
            left: underlineStyle.left,
            width: underlineStyle.width,
          }}
        />
      </div>

      {/* Users Tab */}
      {tab === 'users' && (
        <>
          <div className="filters">
            <div className="filters-left">
              {/* Role Filter */}
              <div className="select-wrapper">
                <FiUser className="select-icon" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as Role | 'All')}
                  className="role-select"
                >
                  <option value="All">All Roles</option>
                  <option value="Researcher">Researcher</option>
                  <option value="Officer">Officer</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="select-wrapper">
                <FiCheckCircle className="select-icon" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as Status | 'All')}
                  className="status-select"
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="filters-right">
              {/* Search by Name */}
              <div className="search-wrapper">
                <FiSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>

              {/* Add New User */}
              <button className="create-user-btn" onClick={() => setShowCreateModal(true)}>
                <FiPlus size={16} /> Create User
              </button>
            </div>
          </div>
          <div className="user-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th className="center">Staff ID</th>
                  <th className="center">User</th>
                  <th className="center">Role</th>
                  <th className="center">Department</th>
                  <th className="center">Status</th>
                  <th className="center">
                    <span className="sort-header" onClick={() => handleSortClick("dateJoined")}>
                      Date Joined
                      {sortField === "dateJoined" ? 
                        (sortOrder === "asc" ? <HiChevronUp /> :
                        sortOrder === "desc" ? <HiChevronDown /> :
                        <HiChevronUpDown />) : <HiChevronUpDown />
                      }
                    </span>
                  </th>
                  <th className="center">
                    <span className="sort-header" onClick={() => handleSortClick("lastLogin")}>
                      Last Login
                      {sortField === "lastLogin" ? 
                        (sortOrder === "asc" ? <HiChevronUp /> :
                        sortOrder === "desc" ? <HiChevronDown /> :
                        <HiChevronUpDown />) : <HiChevronUpDown />
                      }
                    </span>
                  </th>
                  <th className="center">Actions</th>
                </tr>
              </thead>

              <tbody className="user-table-body">
                {sortedUsers.map((user, index) => {
                  const alreadyRequested = requests.some(
                    r => r.userId === user.id && r.status === 'Pending'
                  );
                  
                  //const roleClass = user.extra_roles?.[0]?.toLowerCase() || user.role?.toLowerCase() || "";
                  const displayRole = user.extra_roles?.some(r => r.toLowerCase() === "researcher") 
                    ? "Researcher" 
                    : user.role;
                  const roleClass = displayRole.charAt(0).toUpperCase() + displayRole.slice(1);


                  return (
                    <tr key={user.id}>
                      <td className="cell-number">{(currentPage - 1) * pageSize + index + 1}</td>
                      <td className="center staff-id">{user.staff_id}</td>
                      <td>
                        <div className={`user-details role-${roleClass}`}>
                          <strong className="user-name">{user.name}</strong>
                        </div>
                        {/* <div className="muted">{user.email}</div>
                        <div className="muted">{user.phone}</div> */}
                      </td>
                      <td className="center">
                        <div className="role-cell">
                          <div className="role-field">
                            <select
                              className={`role-select ${displayRole}`}
                              value={displayRole}
                              onChange={(e) => updateRole(user.id, e.target.value as Role)}
                              aria-label={`Change role for ${user.name}`}
                              disabled={
                                userRole !== 'Admin' || 
                                user.role?.toLowerCase() === 'citizen' || 
                                user.role?.toLowerCase() === 'citizen' &&user.extra_roles?.some(r => r.toLowerCase() === 'researcher')
                              }
                            >
                              <option value="Researcher">Researcher</option>
                              <option value="Officer">Officer</option>
                              <option value="Admin">Admin</option>
                            </select>
                            {!(
                              user.role?.toLowerCase() === 'citizen' || 
                              user.role?.toLowerCase() === "citizen" &&
                              user.extra_roles?.some(r => r.toLowerCase() === "researcher")
                            ) && (
                              <CircleChevronDown size={13} className="chev" />
                            )}

                          </div>

                          {userRole !== 'Admin' && (
                            <span className="role-hint">Admin only</span>
                          )}
                        </div>
                      </td>
                      <td className="center muted">{user.role === "Researcher" ? "N/A" : "Dept XYZ"}</td>
                      <td className="center"><span className={`badge ${user.status}`}>{user.status}</span></td>
                      <td className="center muted">{user.dateJoined}</td>
                      <td className="center muted">{user.lastLoginDisplay}</td>
                      <td className="right actions">
                        <div className="action-menu">
                          <button
                            className="menu-button"
                            onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                            aria-label={`Open actions for ${user.name}`}
                          >
                            <LuEllipsis size={20} />
                          </button>

                          {openMenu === user.id && (
                            <div className="menu-dropdown">
                              {alreadyRequested && (
                                <div className="menu-item disabled">Pending request</div>
                              )}

                              <button
                                className="menu-item"
                                onClick={() => { toggleStatus(user.id); setOpenMenu(null); }}
                              >
                                {user.status === 'Active' ? <PowerOff size={14} /> : <Power size={14} />} 
                                {user.status === 'Active' ? 'Deactivate' : 'Activate'}
                              </button>
                              {user.role === "Citizen" && user.extra_roles?.includes("Researcher") && (
                                <button
                                  className="menu-item danger"
                                  onClick={() => {
                                    const confirmed = window.confirm(
                                      "Are you sure you want to revoke Researcher access from this user?"
                                    );

                                    if (!confirmed) return;

                                    revokeResearcher(user.id);
                                    setOpenMenu(null);
                                  }}
                                >
                                  <FaUserSlash size={14} />
                                  Revoke Researcher
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {renderPagination(currentPage, totalPages, fetchUsers)}
        </>
      )}

      {/* Requests Tab */}
      {tab === 'requests' && (
        <>
          <div className="requests-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>User</th>
                  <th className="center">Requested At</th>
                  <th className="center">Status</th>
                  <th className="center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req, index) => (
                  <tr key={req.id}>
                    <td className="cell-number">{index+1}</td>
                    <td className="user-name">{req.userName}</td>
                    <td className="center muted">{req.date}</td>
                    <td className="center">
                      <span className={`badge ${req.status}`}>{req.status}</span>
                    </td>
                    <td className="center actions">
                      {req.status === "Pending" && (
                        <>
                          {rejectingId !== req.id ? (
                            // NORMAL MODE: Approve / Reject buttons
                            <>
                              <button
                                className="approve-btn"
                                onClick={() => {
                                  const confirmed = window.confirm(
                                    `Are you sure you want to approve the request from ${req.userName}?`
                                  );
                                  if (confirmed) approveRequest(req.id);
                                }}
                                aria-label={`Approve request from ${req.userName}`}
                              >
                                <CheckCircle size={16} /> Approve
                              </button>

                              <button
                                className="reject-btn"
                                onClick={() => {
                                  setRejectingId(req.id);
                                  setRejectReason("");
                                }}
                                aria-label={`Reject request from ${req.userName}`}
                              >
                                <XCircle size={16} /> Reject
                              </button>
                            </>
                          ) : (
                            // REJECT MODE: Textarea + Cancel / Confirm buttons
                            <div className="reject-box">
                              <textarea
                                placeholder="Enter reason for rejection..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                rows={3}
                                autoFocus
                              />

                              <div className="reject-actions">
                                <button
                                  className="cancel-btn"
                                  onClick={() => {
                                    setRejectingId(null);
                                    setRejectReason("");
                                  }}
                                >
                                  Cancel
                                </button>

                                <button
                                  className="confirm-btn"
                                  disabled={!rejectReason.trim()}
                                  onClick={() => {
                                    rejectRequest(req.id, rejectReason);
                                    setRejectingId(null);
                                    setRejectReason("");
                                  }}
                                >
                                  Confirm
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

          </div>
          {renderPagination(requestsPage, requestsTotalPages, fetchRequests)}
        </>
      )}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreated={async () => {
            await fetchUsers(currentPage);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
};

export default UserMgmtPage;

