import './UserMgmtPage.css';
import { formatDistanceToNow } from 'date-fns';
import VerificationRequestsTab
  from "../../components/ui/VerificationRequestsTab";
import { useEffect, useRef, useState, useCallback } from "react";
import { Power, PowerOff, CircleChevronDown } from 'lucide-react';
import { LuEllipsis } from "react-icons/lu";
// import { FaUserSlash } from "react-icons/fa";
import { FiSearch, FiPlus, FiUser, FiCheckCircle } from "react-icons/fi";
import { HiChevronUpDown, HiChevronDown, HiChevronUp } from "react-icons/hi2";
import { getUserRoleAndDisplayName } from "../../libr/auth";
import { toast } from "sonner";

import ResearcherRequestsTab, { type ResearcherRequest } from "../../components/ui/ResearcherRequestsTab";
// import VerificationRequestsTab, { type VerificationRequest } from "../../components/ui/VerificationRequestsTab";

import CreateUserModal from '../../components/ui/Modals/CreateUserModal';
import Pagination from "../../components/ui/Pagination";
import ChangePasswordModal from '../../components/ui/Modals/ChangePasswordModal';
import ManageDepartmentsModal from '../../components/ui/Modals/ManageDepartmentsModal';

type Role = 'Researcher' | 'Officer' | 'Admin';
type Status = 'Active' | 'Inactive';

const API_URL = import.meta.env.VITE_API_URL;


interface User {
  id: number;
  staff_id: string;
  username: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  status: Status;
  extra_roles?: string[];
  department?: string;
  dateJoined: string;
  lastLogin: string;
  lastLoginDisplay: string;
}

interface BackendUser {
  id: number;
  staff_id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  extra_roles?: string[];
  department?: string;
  is_active: boolean;
  date_joined_display: string;
  last_login?: string;
  last_login_display?: string;
}

const UserMgmtPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [allRequests, setAllRequests] = useState<ResearcherRequest[]>([]);

  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const updatePageSize = () => {
      setPageSize(window.innerHeight <= 800 ? 7 : 10);
    };

    updatePageSize();
    window.addEventListener("resize", updatePageSize);

    return () => window.removeEventListener("resize", updatePageSize);
  }, []);
  const [tab, setTab] = useState<'users' | 'requests' | 'verification'>('users');
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [roleFilter, setRoleFilter] = useState<Role | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<Status | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<"dateJoined" | "lastLogin" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [researchPendingCount, setResearchPendingCount] = useState(0);
  const [verificationPendingCount, setVerificationPendingCount] = useState(0);

  const [loading, setLoading] = useState(false);

  const { userRole } = getUserRoleAndDisplayName();

  const [changePWModal, setChangePWModal] = useState<{ userId: number; userName: string } | null>(null);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [departmentRefreshKey, setDepartmentRefreshKey] = useState(0);

  const [showToggleModal, setShowToggleModal] = useState(false);
  const [userToToggle, setUserToToggle] = useState<User | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  
  /* FETCH USERS */
  const fetchUsers = useCallback(async (page = 1, showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const params = new URLSearchParams();

      params.append("page", page.toString());
      params.append("page_size", pageSize.toString());

      if (roleFilter !== "All") params.append("role", roleFilter.toLowerCase());
      if (statusFilter !== "All") params.append("status", statusFilter.toLowerCase());
      if (debouncedSearch) params.append("search", debouncedSearch);

      if (sortField) {
        params.append(
          "ordering",
          sortField === "dateJoined"
            ? sortOrder === "desc" ? "-date_joined" : "date_joined"
            : sortOrder === "desc" ? "-last_login" : "last_login"
        );
      }

      const res = await fetch(
        `${API_URL}/api/admin/users/?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) throw new Error("Failed to fetch users");

      const data = await res.json();
      console.log("raw data", data)

      const mappedUsers: User[] = data.results.map((u: BackendUser) => {
        const lastLoginDate = u.last_login ? new Date(u.last_login) : null;
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const status: Status = !u.is_active
          ? "Inactive"
          : lastLoginDate && lastLoginDate < ninetyDaysAgo
            ? "Inactive"
            : "Active";

        return {
          id: u.id,
          staff_id: u.staff_id,
          username: u.username,
          name: `${u.first_name} ${u.last_name}`,
          email: u.email,
          phone: u.phone,
          role: u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : "",
          extra_roles: u.extra_roles ?? [],
          department: u.department ?? "---",
          status,
          dateJoined: u.date_joined_display,
          lastLogin: u.last_login ?? "",
          lastLoginDisplay: u.last_login_display ?? "Never",
        };
      });

      setUsers(mappedUsers);
      console.log("eto map", mappedUsers);
      setCurrentPage(page);
      setTotalPages(Math.ceil(data.count / pageSize));
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [roleFilter, statusFilter, debouncedSearch, sortField, sortOrder, pageSize]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers, departmentRefreshKey]);

  useEffect(() => {
    const fetchVerificationCount = async () => {
      try {
        const token = localStorage.getItem("access_token");

        const res = await fetch(
          `${API_URL}/api/admin/resident-verifications/?page=1&page_size=1000`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) throw new Error("Failed to fetch verification requests");

        const data = await res.json();

        const pending = data.results.filter(
          (r: any) => r.status?.toLowerCase() === "pending"
        ).length;

        setVerificationPendingCount(pending);

      } catch (err) {
        console.error(err);
      }
    };

    fetchVerificationCount();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(
          `${API_URL}/api/admin/researcher_requests/?page=1&page_size=1000`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("Failed to fetch requests");
        const data = await res.json();

        const mapped: ResearcherRequest[] = data.results.map((r: any) => ({
          id: r.id,
          fullName: r.full_name || "Anonymous",
          email: r.email || "Unknown",
          date: r.created_at
            ? formatDistanceToNow(new Date(r.created_at), { addSuffix: true })
            : "Unknown",
          purpose: r.purpose,
          orgSchool: r.orgSchool,
          status: r.status as "pending" | "approved" | "rejected",
        }));

        setAllRequests(mapped);

        setResearchPendingCount(
          mapped.filter(r => r.status === "pending").length
        );
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  /* SORTING */
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

  /* PAGINATION */
  const handlePageChange = (page: number) => { if (page < 1 || page > totalPages) return; fetchUsers(page); };

  /* USER ACTIONS */
  const toggleStatus = async (id: number) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/admin/users/${id}/toggle-status/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) return toast.error("Failed to toggle status");

      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' } : u));
    } catch (err) { console.error(err); }
  };

  const updateRole = async (id: number, newRole: Role) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/admin/users/${id}/role/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole.toLowerCase() }),
      });
      if (!res.ok) return toast.error("Failed to update role");

      const updatedUser = await res.json();
      setUsers(prev => prev.map(u => u.id === id ? updatedUser : u));
      fetchUsers(currentPage);
    } catch (err) { console.error(err); }
  };
  /* TABS */
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });
  useEffect(() => {
    let activeIdx = 0;
    if (tab === "users") activeIdx = 0;
    else if (tab === "requests") activeIdx = 1;
    else if (tab === "verification") activeIdx = 2;

    const activeTab = tabRefs.current[activeIdx];
    if (activeTab) setUnderlineStyle({ left: activeTab.offsetLeft, width: activeTab.offsetWidth });
  }, [tab, researchPendingCount, verificationPendingCount]);

  return (
    <div className="user-page">
      {/* <h1>User Management</h1> */}

      {/* Tabs */}
      <div className="user-tabs" ref={tabsRef}>
        <button ref={el => { tabRefs.current[0] = el; }} onClick={() => setTab('users')} className={tab === 'users' ? 'tab active' : 'tab'}>Staff</button>
        <button ref={el => { tabRefs.current[1] = el; }} onClick={() => setTab('requests')} className={tab === 'requests' ? 'tab active' : 'tab'}>
          Researchers
          {researchPendingCount > 0 && <span className="request-count">{researchPendingCount}</span>}
        </button>
        <button ref={el => { tabRefs.current[2] = el; }} onClick={() => setTab('verification')} className={tab === 'verification' ? 'tab active' : 'tab'}>
          Residents
          {verificationPendingCount > 0 && <span className="request-count">{verificationPendingCount}</span>}
        </button>
        <span className="tab-underline" style={{ left: underlineStyle.left, width: underlineStyle.width }} />
      </div>

      {/* Users Tab */}
      {tab === 'users' && (
        <>
          {/* Filters + Search + Create User */}
          <div className="filters">
            <div className="filters-left">
              <div className="select-wrapper">
                <FiUser className="select-icon" />
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value as Role | "All");
                  }}
                  className="role-select"
                >
                  <option value="All">All Roles</option>
                  <option value="Officer">Officer</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div className="select-wrapper">
                <FiCheckCircle className="select-icon" />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as Status | 'All')} className="status-select">
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="filters-right">
              <div className="search-wrapper">
                <FiSearch className="search-icon" />
                <input type="text" placeholder="Search by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
                {searchTerm.trim() && (
                  <button
                    className="search-clear"
                    onClick={() => setSearchTerm("")}
                    title="Clear"
                    type="button"
                  >x</button>
                )}
              </div>
              <div className="user-actions">
                <button
                  className="manage-dept-btn"
                  onClick={() => setShowDeptModal(true)}
                >
                  ⚙ Manage Departments
                </button>
                <button className="create-user-btn" onClick={() => setShowCreateModal(true)}>
                  <FiPlus size={16} /> Create User
                </button>
              </div>
            </div>
          </div>

          {/* User Table */}
          <div className="user-table-wrapper">
            {/*loading && <div className="table-loading-overlay" />*/}
            <table>
              <thead>
                <tr>
                  {/* <th>#</th> */}
                  <th className="center">User</th>
                  <th className="center">Contact Number</th>
                  <th className="center">Role</th>
                  {/*<th className="center">Department</th>*/}
                  <th className="center">Status</th>
                  <th className="center">
                    <span className="sort-header" onClick={() => handleSortClick("dateJoined")}>
                      Date Joined
                      {sortField === "dateJoined" ? (sortOrder === "desc" ? <HiChevronUp /> : sortOrder === "asc" ? <HiChevronDown /> : <HiChevronUpDown />) : <HiChevronUpDown />}
                    </span>
                  </th>
                  <th className="center">
                    <span className="sort-header" onClick={() => handleSortClick("lastLogin")}>
                      Last Login
                      {sortField === "lastLogin" ? (sortOrder === "asc" ? <HiChevronUp /> : sortOrder === "desc" ? <HiChevronDown /> : <HiChevronUpDown />) : <HiChevronUpDown />}
                    </span>
                  </th>
                  <th className="center">Actions</th>
                </tr>
              </thead>
              <tbody className="user-table-body">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="empty">
                      Loading Users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="empty">
                      No Users Found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const alreadyRequested = allRequests.some(r => r.email === user.email && r.status === "pending");
                    const displayRole = user.role === "Citizen" && !user.extra_roles?.some(r => r.toLowerCase() === "researcher")
                      ? "Citizen"
                      : user.extra_roles?.some(r => r.toLowerCase() === "researcher")
                        ? "Researcher"
                        : user.role;

                    const roleClass = displayRole.charAt(0).toUpperCase() + displayRole.slice(1);

                    return (
                      <tr key={user.id}>
                        {/* <td className="cell-number">{(currentPage - 1) * pageSize + index + 1}</td> */}
                        <td>
                          <div className={`user-details role-${roleClass}`}>
                            <strong className="user-name">{user.name}</strong>
                            <span className="user-email muted">{user.email}</span>
                          </div>
                        </td>
                        <td className="center muted">
                          {user.phone || "---"}
                        </td>
                        <td className="center">
                          <div className="role-cell">
                            <div className="role-field">
                              {displayRole === "Citizen" && !user.extra_roles?.some(r => r.toLowerCase() === "researcher") ? (
                                // Display-only span for true citizens (green)
                                <span className={`role-select ${roleClass}`}>{displayRole}</span>
                              ) : (
                                // Disabled select for all others including citizen-researchers
                                <select
                                  className={`role-select ${roleClass}`}
                                  value={displayRole}
                                  onChange={(e) => {
                                    const newRole = e.target.value as Role;
                                    if (!window.confirm(`Are you sure you want to change this user’s role to ${newRole}?`)) {
                                      e.target.value = displayRole;
                                      return;
                                    }
                                    updateRole(user.id, newRole);
                                  }}
                                  aria-label={`Change role for ${user.name}`}
                                  disabled={
                                    userRole !== "Admin" ||
                                    (user.role?.toLowerCase() === "citizen" && user.extra_roles?.some(r => r.toLowerCase() === "researcher"))
                                  }
                                >
                                  <option value="Researcher">Researcher</option>
                                  <option value="Officer">Officer</option>
                                  <option value="Admin">Admin</option>
                                </select>
                              )}

                              {/* Show dropdown arrow only if select is NOT disabled */}
                              {!(userRole !== "Admin" || (user.role?.toLowerCase() === "citizen" && user.extra_roles?.some(r => r.toLowerCase() === "researcher"))) &&
                                displayRole !== "Citizen" && <CircleChevronDown size={13} className="chev" />}
                            </div>
                            {userRole !== 'Admin' && <span className="role-hint">Admin only</span>}
                          </div>
                        </td>
                        {/*<td className="center muted">{user.department}</td>*/}
                        <td className="center"><span className={`badge ${user.status}`}>{user.status}</span></td>
                        <td className="center muted">{user.dateJoined}</td>
                        <td className="center muted">{user.lastLoginDisplay}</td>
                        <td className="right actions">
                          <div className="action-menu">
                            <button className="menu-button" onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}>
                              <LuEllipsis size={20} />
                            </button>
                            {openMenu === user.id && (
                              <div className="kebab-dropdown">
                                {alreadyRequested && <div className="kebab-item disabled">Pending request</div>}
                                <button
                                  className="kebab-item"
                                  onClick={() => {
                                    setUserToToggle(user);
                                    setShowToggleModal(true);
                                    setOpenMenu(null);
                                  }}
                                >
                                  {user.status === 'Active' ? <PowerOff size={14} /> : <Power size={14} />}
                                  {user.status === 'Active' ? 'Deactivate' : 'Activate'}
                                </button>
                                {/* {user.role === "Citizen" && user.extra_roles?.some(r => r.toLowerCase() === "researcher") && (
                                  <button className="menu-item danger" onClick={() => { if (!window.confirm("Are you sure you want to revoke Researcher access from this user?")) return; revokeResearcher(user.id); setOpenMenu(null); }}>
                                    <FaUserSlash size={14} /> Revoke Researcher
                                  </button>
                                )} */}
                                {(user.role === "Researcher" || user.extra_roles?.some(r => r.toLowerCase() === "researcher")) && (
                                  <button
                                    className="kebab-item"
                                    onClick={() => {
                                      setChangePWModal({ userId: user.id, userName: user.name });
                                      setOpenMenu(null);
                                    }}
                                  >
                                    Change Password
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}

      {/* Requests Tab */}
      {tab === 'requests' && (
        <ResearcherRequestsTab
          requests={allRequests}
          pageSize={pageSize}
          onPendingCountChange={setResearchPendingCount}
        />
      )}

      {/* verification Tab */}
      {tab === 'verification' && (
        <VerificationRequestsTab pageSize={pageSize} onPendingCountChange={setVerificationPendingCount} />
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          departmentRefreshKey={departmentRefreshKey}
          onClose={() => setShowCreateModal(false)}
          onCreated={async () => {
            setShowCreateModal(false);
            await fetchUsers(1);
          }}
        />
      )}
      {/* Manage Departments Modal */}
      {showDeptModal && (
        <ManageDepartmentsModal
          onClose={() => setShowDeptModal(false)}
          onDepartmentChanged={() => {
            setDepartmentRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {/* Change Password Modal */}
      {changePWModal && (
        <ChangePasswordModal
          userId={changePWModal.userId}
          userName={changePWModal.userName}
          onClose={() => setChangePWModal(null)}
          onPasswordChanged={() => fetchUsers(currentPage)}
        />
      )}
      
      {/* Toggle User Status Modal */}
      {showToggleModal && userToToggle && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>
              {userToToggle.status === "Active"
                ? "Deactivate User"
                : "Activate User"}
            </h2>

            <p>
              Are you sure you want to{" "}
              <strong>
                {userToToggle.status === "Active"
                  ? "deactivate"
                  : "activate"}
              </strong>{" "}
              <strong>"{userToToggle.name}"</strong>?
            </p>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                disabled={isToggling}
                onClick={() => {
                  setShowToggleModal(false);
                  setUserToToggle(null);
                }}
              >
                Cancel
              </button>

              <button
                className="btn-secondary danger"
                disabled={isToggling}
                onClick={async () => {
                  if (!userToToggle) return;

                  setIsToggling(true);

                  try {
                    await toggleStatus(userToToggle.id);

                    const action =
                      userToToggle.status === "Active"
                        ? "deactivated"
                        : "activated";

                    toast.success(`"${userToToggle.name}" ${action} successfully.`);
                  } catch (err) {
                    console.error(err);
                    toast.error("Failed to update user status");
                  } finally {
                    setIsToggling(false);
                    setShowToggleModal(false);
                    setUserToToggle(null);
                  }
                }}
              >
                {isToggling
                  ? "Processing..."
                  : userToToggle.status === "Active"
                  ? "Deactivate"
                  : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMgmtPage;
